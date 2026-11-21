// Relay circuit: compiles rungs into a wire-numbered netlist and solves it.
//
// Every element sits between two nodes. Contacts and wires conduct when closed;
// loads (coils, lamps, solenoids, PLC inputs) sit between a node and N.
// A node is live when a graph search from a source (L1, or a PLC common such as
// P1) reaches it through closed elements. Relays are then updated and the solve
// repeats until nothing changes, which is how real relays settle, just without
// their pickup time. A closed path from a source to N with no load in it is a
// dead short: the control fuse blows and everything goes dark.

import { isBranch, type Path, type Rung, type Series } from '../rung';
import { Signals } from '../signals';
import {
  CONTACT_OPS,
  LOAD_OPS,
  deviceType,
  timerSpec,
  type DeviceDef,
  type TimerSpec,
} from './devices';

export interface NetElement {
  id: string;
  rung: number;
  path: Path;
  op: string;
  device?: string;
  /** POS contacts: the selector position that closes them. */
  pos?: string;
  a: string;
  /** For loads, always 'N'. */
  b: string;
  timer?: TimerSpec;
  /** A rung end with no load: this wire goes straight to N. */
  short?: boolean;
}

export interface Netlist {
  elements: NetElement[];
  sources: string[];
  problems: { rung: number; message: string }[];
  /** Input and output node of every element and branch, by id (r<rung>.<path>), for drawing power flow. */
  ends: Map<string, { a: string; b: string | null }>;
}

export type RelayFault =
  /** A broken wire to the device: its contacts never close and its coil gets no power. */
  | { type: 'open'; device: string }
  /** The conductor leaving wire number `wire` is broken. */
  | { type: 'openWire'; wire: string }
  /** Contacts welded in the energized position (NO stays closed, NC stays open). */
  | { type: 'welded'; device: string }
  /** A jumper across the device's contacts: they always conduct. */
  | { type: 'jumper'; device: string }
  /** Coil burnt open. */
  | { type: 'coilOpen'; device: string };

export function compile(rungs: Rung[], sources: string[] = ['L1']): Netlist {
  const elements: NetElement[] = [];
  const problems: Netlist['problems'] = [];
  const ends: Netlist['ends'] = new Map();
  let auto = 0;
  const fresh = () => `n${++auto}`;

  rungs.forEach((rung, ri) => {
    if (rung.els.length === 0) return;
    const walk = (series: Series, inNode: string, base: Path): string | null => {
      let node: string | null = inNode;
      for (let i = 0; i < series.length; i++) {
        const e = series[i];
        const path = [...base, i];
        if (node === null) {
          problems.push({ rung: ri, message: 'Nothing can come after a load. A coil, lamp or valve must be the last thing in its line.' });
          return null;
        }
        if (isBranch(e)) {
          const branchIn: string = node;
          const join = e.wire ?? fresh();
          let any = false;
          e.branch.forEach((leg, l) => {
            const out = walk(leg, node as string, [...path, l]);
            if (out !== null) {
              any = true;
              if (out !== join) elements.push({ id: `r${ri}.${path.join('.')}.j${l}`, rung: ri, path, op: 'WIRE', a: out, b: join });
            }
          });
          node = any ? join : null;
          ends.set(`r${ri}.${path.join('.')}`, { a: branchIn, b: node });
          continue;
        }
        const id = `r${ri}.${path.join('.')}`;
        if (LOAD_OPS.has(e.op)) {
          const el: NetElement = { id, rung: ri, path, op: e.op, device: e.args[0], a: node, b: 'N' };
          if (e.op === 'TMR') el.timer = timerSpec(e.args);
          elements.push(el);
          ends.set(id, { a: node, b: null });
          node = null;
          continue;
        }
        if (!CONTACT_OPS.has(e.op)) {
          problems.push({ rung: ri, message: `${e.op} is not a relay part.` });
          continue;
        }
        const out = e.wire ?? fresh();
        const el: NetElement = { id, rung: ri, path, op: e.op, a: node, b: out };
        if (e.op !== 'WIRE') el.device = e.args[0];
        if (e.op === 'POS') el.pos = e.args[1] ?? 'on';
        elements.push(el);
        ends.set(id, { a: node, b: out });
        node = out;
      }
      return node;
    };
    const end = walk(rung.els, rung.start ?? 'L1', []);
    if (end !== null) {
      const last = rung.els[rung.els.length - 1];
      const labelled = !!last && (last as { wire?: string }).wire !== undefined;
      if (!labelled) {
        elements.push({ id: `r${ri}.short`, rung: ri, path: [], op: 'WIRE', a: end, b: 'N', short: true });
        problems.push({ rung: ri, message: 'This line has no load at the end, so closing it connects L1 straight to N: a dead short.' });
      }
    }
  });
  return { elements, sources, problems, ends };
}

interface TimerState {
  spec: TimerSpec;
  coil: boolean;
  acc: number;
  out: boolean;
}

export interface SolveResult {
  live: Set<string>;
  closed: Map<string, boolean>;
  fuseBlown: boolean;
  chatter: boolean;
}

export class RelayCircuit {
  net: Netlist;
  coils = new Map<string, boolean>();
  timers = new Map<string, TimerState>();
  levelRelays = new Map<string, boolean>();
  faults: RelayFault[] = [];
  fuseBlown = false;
  chatter = false;
  live = new Set<string>();
  closed = new Map<string, boolean>();
  /** Every device that appears as a load, so its signal is always written. */
  private loadDevices = new Set<string>();
  private loadsOf = new Map<string, NetElement[]>();

  constructor(
    rungs: Rung[],
    public devices: Record<string, DeviceDef> = {},
    sources: string[] = ['L1'],
  ) {
    this.net = compile(rungs, sources);
    this.index();
  }

  /** Swap in new rungs (an online edit) while keeping relay and timer states. */
  reload(rungs: Rung[]) {
    this.net = compile(rungs, this.net.sources);
    this.fuseBlown = false;
    this.index();
  }

  private index() {
    this.loadDevices.clear();
    this.loadsOf.clear();
    const keepTimers = this.timers;
    this.timers = new Map();
    for (const e of this.net.elements) {
      if (e.b === 'N' && e.device && !e.short) {
        this.loadDevices.add(e.device);
        if (!this.loadsOf.has(e.device)) this.loadsOf.set(e.device, []);
        this.loadsOf.get(e.device)!.push(e);
      }
      if (e.op === 'TMR' && e.device && e.timer) {
        const prev = keepTimers.get(e.device);
        this.timers.set(e.device, prev ? { ...prev, spec: e.timer } : { spec: e.timer, coil: false, acc: 0, out: false });
      }
    }
  }

  private fault(device: string | undefined, type: RelayFault['type']): boolean {
    if (!device) return false;
    return this.faults.some((f) => f.type === type && 'device' in f && f.device === device);
  }

  /** True when the device is in its actuated / energized state. */
  actuated(tag: string, sig: Signals): boolean {
    const def = this.devices[tag];
    const type = deviceType(tag, this.devices);
    switch (type) {
      case 'relay':
      case 'contactor':
        return this.coils.get(tag) ?? false;
      case 'timer':
        return this.timers.get(tag)?.out ?? false;
      case 'levelRelay':
        return this.levelRelays.get(tag) ?? false;
      case 'selector':
        return sig.b(def?.signal ?? tag);
      default:
        return sig.b(def?.signal ?? tag);
    }
  }

  private contactClosed(e: NetElement, sig: Signals): boolean {
    if (e.op === 'WIRE') return true;
    const dev = e.device as string;
    if (this.fault(dev, 'open')) return false;
    if (this.fault(dev, 'jumper')) return true;
    if (this.faults.some((f) => f.type === 'openWire' && f.wire === e.a)) return false;
    if (e.op === 'POS') {
      const def = this.devices[dev];
      return sig.s(def?.signal ?? dev) === e.pos;
    }
    const act = this.fault(dev, 'welded') ? true : this.actuated(dev, sig);
    return e.op === 'NO' ? act : !act;
  }

  private search(sig: Signals, powered: boolean): Set<string> {
    const live = new Set<string>();
    if (!powered || this.fuseBlown) return live;
    const adj = new Map<string, string[]>();
    const link = (x: string, y: string) => {
      if (!adj.has(x)) adj.set(x, []);
      adj.get(x)!.push(y);
    };
    for (const e of this.net.elements) {
      if (e.b === 'N' && !e.short) continue; // loads do not conduct onward
      const c = this.contactClosed(e, sig);
      this.closed.set(e.id, c);
      if (c) {
        link(e.a, e.b);
        link(e.b, e.a);
      }
    }
    const stack = [...this.net.sources];
    for (const s of stack) live.add(s);
    while (stack.length) {
      const n = stack.pop() as string;
      for (const m of adj.get(n) ?? []) {
        if (!live.has(m)) {
          live.add(m);
          stack.push(m);
        }
      }
    }
    return live;
  }

  /** Advance the circuit by dt seconds. Reads field devices from sig and writes device states back. */
  step(dt: number, sig: Signals, powered = true): SolveResult {
    // Level relays follow their electrodes, with the gap between the rods as hysteresis.
    for (const [tag, def] of Object.entries(this.devices)) {
      if (def.type !== 'levelRelay') continue;
      const high = sig.b(def.high ?? `${tag}.high`);
      const low = sig.b(def.low ?? `${tag}.low`);
      let st = this.levelRelays.get(tag) ?? !high;
      if (high) st = false;
      else if (!low) st = true;
      this.levelRelays.set(tag, st);
    }

    // Timers run on the coil state from the last solve.
    for (const t of this.timers.values()) this.advanceTimer(t, dt);

    this.chatter = false;
    let live = new Set<string>();
    let settled = false;
    for (let iter = 0; iter < 40; iter++) {
      this.closed.clear();
      live = this.search(sig, powered);
      if (live.has('N')) {
        this.fuseBlown = true;
        live = new Set();
      }
      let changed = false;
      const coilNow = new Map<string, boolean>();
      for (const e of this.net.elements) {
        if (e.b !== 'N' || e.short || !e.device) continue;
        if (e.op !== 'COIL' && e.op !== 'TMR') continue;
        const on = live.has(e.a) && !this.fault(e.device, 'coilOpen') && !this.fault(e.device, 'open');
        coilNow.set(e.device, (coilNow.get(e.device) ?? false) || on);
      }
      for (const [dev, on] of coilNow) {
        const t = this.timers.get(dev);
        if (t) {
          if (t.coil !== on) {
            t.coil = on;
            this.applyTimerCoil(t);
            changed = true;
          }
        } else if ((this.coils.get(dev) ?? false) !== on) {
          this.coils.set(dev, on);
          changed = true;
        }
      }
      // Coils that vanished from the drawing drop out.
      for (const [dev, on] of this.coils) {
        if (on && !coilNow.has(dev)) {
          this.coils.set(dev, false);
          changed = true;
        }
      }
      if (!changed) {
        settled = true;
        break;
      }
    }
    this.chatter = !settled;
    this.live = live;
    this.write(sig);
    return { live, closed: this.closed, fuseBlown: this.fuseBlown, chatter: this.chatter };
  }

  private applyTimerCoil(t: TimerState) {
    if (t.spec.mode === 'on' && !t.coil) {
      t.acc = 0;
      t.out = false;
    } else if (t.spec.mode === 'off' && t.coil) {
      t.acc = 0;
      t.out = true;
    } else if (t.spec.mode === 'cycle' && !t.coil) {
      t.acc = 0;
      t.out = false;
    } else if (t.spec.mode === 'on' && t.coil && t.spec.preset === 0) {
      t.out = true;
    }
  }

  private advanceTimer(t: TimerState, dt: number) {
    const { mode, preset, on } = t.spec;
    if (mode === 'on') {
      if (t.coil) {
        t.acc = Math.min(preset, t.acc + dt);
        if (t.acc >= preset - 1e-9) t.out = true;
      } else {
        t.acc = 0;
        t.out = false;
      }
    } else if (mode === 'off') {
      if (t.coil) {
        t.acc = 0;
        t.out = true;
      } else if (t.out) {
        t.acc = Math.min(preset, t.acc + dt);
        if (t.acc >= preset - 1e-9) t.out = false;
      }
    } else {
      // Cycle timer (like the DH48S-S on KT1): OFF for `preset`, then ON for `on`, repeating.
      if (t.coil) {
        const period = preset + on;
        t.acc = period > 0 ? (t.acc + dt) % period : 0;
        t.out = t.acc >= preset - 1e-9;
      } else {
        t.acc = 0;
        t.out = false;
      }
    }
  }

  private write(sig: Signals) {
    sig.set('FU1.blown', this.fuseBlown);
    for (const dev of this.loadDevices) {
      const t = this.timers.get(dev);
      if (t) {
        sig.set(dev, t.out);
        sig.set(`${dev}.coil`, t.coil);
        sig.set(`${dev}.acc`, t.acc);
        continue;
      }
      const type = deviceType(dev, this.devices);
      if (type === 'relay' || type === 'contactor') {
        // The signal is the contacts' position, which a welded contactor holds
        // closed even after its coil drops. The coil itself is reported separately.
        const coil = this.coils.get(dev) ?? false;
        sig.set(`${dev}.coil`, coil);
        sig.set(dev, coil || this.fault(dev, 'welded'));
        continue;
      }
      // Lamps, solenoids, horns, PLC inputs: on when their node is live.
      const open = this.fault(dev, 'open');
      sig.set(dev, !open && (this.loadsOf.get(dev) ?? []).some((e) => this.live.has(e.a)));
    }
    for (const [tag, st] of this.levelRelays) sig.set(tag, st);
  }

  /** Meter reading: is there control voltage on this node? */
  nodeLive(node: string): boolean {
    return this.live.has(node);
  }

  /** Every node name, for the meter. */
  nodes(): string[] {
    const s = new Set<string>();
    for (const e of this.net.elements) {
      s.add(e.a);
      if (e.b !== 'N') s.add(e.b);
    }
    return [...s];
  }
}
