// Simple process physics on a fixed time step: tanks, pumps, valves, motors,
// press screws, floats, electrode rods, 4-20 mA transmitters and overloads.
// Good enough to see cause and effect; not a hydraulic model.

import { Signals, type Val } from '../signals';

interface Base {
  id: string;
  /** Screen position for the machine view; the engine ignores it. */
  at?: [number, number];
  label?: string;
}

export interface TankDef extends Base {
  type: 'tank';
  capacity: number; // gallons
  level: number; // starting level, 0..1
  /** Steady inflow from outside (gpm), e.g. a lift station's incoming sewer. Overridable with signal `<id>.inflow`. */
  inflow?: number;
  /** Feed and dose pumps, to flag feed going in with no dose (`<id>.undosed`). */
  feedBy?: string[];
  doseBy?: string[];
}
export interface PumpDef extends Base {
  type: 'pump';
  from: string; // tank id, or 'source'
  to: string; // tank id, or 'drain'
  gpm: number;
  /** Signal that runs it (a contactor's contacts). */
  drive: string;
  /** Overload part protecting it. */
  overload?: string;
  /** Suction level below which it runs dry and moves nothing. */
  dryAt?: number;
}
export interface ValveDef extends Base {
  type: 'valve';
  from: string;
  to: string;
  gpm: number;
  drive: string;
  /** Spring return to open when the signal drops (like XV-300). */
  failOpen?: boolean;
}
export interface MotorDef extends Base {
  type: 'motor';
  drive?: string;
  /** Reversing motors: forward and reverse contactors. */
  fwd?: string;
  rev?: string;
  overload?: string;
  /** VFD part whose fault stops this motor. */
  vfd?: string;
}
export interface ScrewDef extends Base {
  type: 'screw';
  from: string; // tank it draws from
  gpm: number;
  drive: string;
  vfd?: string;
}
export interface VfdDef extends Base {
  type: 'vfd';
}
export interface FloatDef extends Base {
  type: 'float';
  tank: string;
  at_level: number; // 0..1
  signal: string;
}
export interface ElectrodeDef extends Base {
  type: 'electrodes';
  tank: string;
  low: number;
  high: number;
  lowSignal: string;
  highSignal: string;
}
export interface TransmitterDef extends Base {
  type: 'transmitter';
  tank: string;
  signal: string; // mA
  noise?: number; // mA, peak
}
export interface AnalogDef extends Base {
  type: 'analog';
  signal: string;
  value: number;
  unit: string;
  min: number;
  max: number;
}
export interface OverloadDef extends Base {
  type: 'overload';
  signal: string; // true while tripped
  /** Seconds a jammed motor runs before the overload trips. */
  tripAfter?: number;
  /** Seconds after a trip before the reset button will latch. */
  coolFor?: number;
}
export interface OperatorDef extends Base {
  type: 'button' | 'estop' | 'selector' | 'lamp' | 'horn' | 'switch';
  signal: string;
  positions?: string[];
  color?: string;
}
export interface ScaleDef extends Base {
  /** Filter or membrane whose pressure drop builds while filtering and clears on backwash. */
  type: 'filter';
  signal: string; // psi
  clean: number;
  foulPerMin: number;
  filterWhen: string[];
  cleanWhen: string[];
}
export interface DecorDef extends Base {
  type: 'pipe' | 'label' | 'panel' | 'decor';
}

export type PartDef =
  | TankDef
  | PumpDef
  | ValveDef
  | MotorDef
  | ScrewDef
  | VfdDef
  | FloatDef
  | ElectrodeDef
  | TransmitterDef
  | AnalogDef
  | OverloadDef
  | OperatorDef
  | ScaleDef
  | DecorDef;

export type WorldFault =
  | { type: 'jam'; part: string } // mechanical jam: high current, overload trips
  | { type: 'trip'; part: string } // overload tripped
  | { type: 'vfdFault'; part: string }
  | { type: 'fouled'; part: string } // sludge bridging the high rod: reads full
  | { type: 'floatStuck'; part: string; actuated: boolean }
  | { type: 'wireBreak'; part: string } // transmitter loop open: 0 mA
  | { type: 'valueOverride'; part: string; value: number };

export interface WorldEvent {
  t: number;
  kind: string;
  part: string;
  text: string;
}

const isTank = (p: PartDef): p is TankDef => p.type === 'tank';

export class World {
  parts = new Map<string, PartDef>();
  level = new Map<string, number>();
  faults: WorldFault[] = [];
  events: WorldEvent[] = [];
  t = 0;
  private jamTime = new Map<string, number>();
  private tripTime = new Map<string, number>();
  private estops = new Set<string>();
  private seed = 1;
  /** Latest actual flows (gpm) by part. */
  flow = new Map<string, number>();
  private active = new Set<string>();

  constructor(defs: PartDef[]) {
    for (const d of defs) this.parts.set(d.id, d);
    for (const d of defs) if (isTank(d)) this.level.set(d.id, d.level);
  }

  /** Put every operator device and sensor into the signal table at its resting state. */
  init(sig: Signals) {
    for (const p of this.parts.values()) {
      if (p.type === 'button' || p.type === 'estop') sig.set(p.signal, false);
      if (p.type === 'selector' || p.type === 'switch') sig.set(p.signal, (p.positions ?? ['off', 'on'])[0]);
      if (p.type === 'overload') sig.set(p.signal, false);
      if (p.type === 'vfd') sig.set(`${p.id}.fault`, false);
      if (p.type === 'analog') sig.set(p.signal, p.value);
      if (p.type === 'filter') sig.set(p.signal, p.clean);
    }
    this.sense(sig);
  }

  private hasFault(type: WorldFault['type'], part: string) {
    return this.faults.find((f) => f.type === type && f.part === part);
  }

  private rand() {
    // xorshift, seeded so tests repeat exactly
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 4294967296;
  }

  private emit(kind: string, part: string, text: string) {
    const key = `${kind}:${part}`;
    if (this.active.has(key)) return;
    this.active.add(key);
    this.events.push({ t: this.t, kind, part, text });
  }
  private clearEvent(kind: string, part: string) {
    this.active.delete(`${kind}:${part}`);
  }

  /** Sensors: write what the instruments read into the signal table. */
  sense(sig: Signals) {
    for (const p of this.parts.values()) {
      if (isTank(p)) {
        sig.set(`${p.id}.level`, this.level.get(p.id) ?? 0);
        sig.set(`${p.id}.gal`, (this.level.get(p.id) ?? 0) * p.capacity);
      } else if (p.type === 'float') {
        const stuck = this.hasFault('floatStuck', p.id) as { actuated: boolean } | undefined;
        sig.set(p.signal, stuck ? stuck.actuated : (this.level.get(p.tank) ?? 0) >= p.at_level);
      } else if (p.type === 'electrodes') {
        const lvl = this.level.get(p.tank) ?? 0;
        const fouled = !!this.hasFault('fouled', p.id);
        sig.set(p.lowSignal, lvl >= p.low || fouled);
        sig.set(p.highSignal, lvl >= p.high || fouled);
      } else if (p.type === 'transmitter') {
        const lvl = this.level.get(p.tank) ?? 0;
        const noise = (p.noise ?? 0) * (this.rand() * 2 - 1);
        const ov = this.hasFault('valueOverride', p.id) as { value: number } | undefined;
        let mA = 4 + 16 * lvl + noise;
        if (ov) mA = ov.value;
        if (this.hasFault('wireBreak', p.id)) mA = 0;
        sig.set(p.signal, Math.round(mA * 1000) / 1000);
      } else if (p.type === 'analog') {
        const ov = this.hasFault('valueOverride', p.id) as { value: number } | undefined;
        if (ov) sig.set(p.signal, ov.value);
      } else if (p.type === 'overload') {
        sig.set(p.signal, this.tripTime.has(p.id));
      } else if (p.type === 'vfd') {
        sig.set(`${p.id}.fault`, !!this.hasFault('vfdFault', p.id));
      }
    }
  }

  private running(p: PumpDef | MotorDef | ScrewDef, sig: Signals): boolean {
    if ('overload' in p && p.overload && this.tripTime.has(p.overload)) return false;
    if ('vfd' in p && p.vfd && this.hasFault('vfdFault', p.vfd)) return false;
    if (p.type === 'motor' && (p.fwd || p.rev)) return sig.b(p.fwd ?? '') !== sig.b(p.rev ?? '');
    return sig.b((p as PumpDef).drive ?? '');
  }

  /** Move the plant forward dt seconds using the outputs in the signal table. */
  act(dt: number, sig: Signals) {
    this.t += dt;
    const delta = new Map<string, number>(); // gallons per tank this step
    const add = (tank: string, gal: number) => {
      if (!this.parts.has(tank)) return;
      delta.set(tank, (delta.get(tank) ?? 0) + gal);
    };

    for (const p of this.parts.values()) {
      if (isTank(p)) {
        const inflow = sig.has(`${p.id}.inflow`) ? sig.n(`${p.id}.inflow`) : p.inflow ?? 0;
        add(p.id, (inflow / 60) * dt);
      }
      if (p.type === 'pump') {
        const on = this.running(p, sig);
        const src = this.parts.get(p.from);
        const dry = !!src && isTank(src) && (this.level.get(p.from) ?? 0) <= (p.dryAt ?? 0.02);
        const gpm = on && !dry ? p.gpm : 0;
        this.flow.set(p.id, gpm);
        sig.set(`${p.id}.running`, on);
        sig.set(`${p.id}.flow`, gpm);
        if (on && dry) this.emit('dryRun', p.id, `${p.label ?? p.id} is running dry.`);
        else this.clearEvent('dryRun', p.id);
        add(p.from, -(gpm / 60) * dt);
        add(p.to, (gpm / 60) * dt);
        this.overloadHeat(p, on, dt);
      } else if (p.type === 'valve') {
        const open = sig.b(p.drive) !== !!p.failOpen;
        const src = this.parts.get(p.from);
        const empty = !!src && isTank(src) && (this.level.get(p.from) ?? 0) <= 0.001;
        const gpm = open && !empty ? p.gpm : 0;
        this.flow.set(p.id, gpm);
        sig.set(`${p.id}.open`, open);
        sig.set(`${p.id}.flow`, gpm);
        add(p.from, -(gpm / 60) * dt);
        add(p.to, (gpm / 60) * dt);
      } else if (p.type === 'motor') {
        const on = this.running(p, sig);
        sig.set(`${p.id}.running`, on);
        if (p.fwd && p.rev) {
          sig.set(`${p.id}.dir`, on ? (sig.b(p.fwd) ? 1 : -1) : 0);
          if (sig.b(p.fwd) && sig.b(p.rev)) this.emit('phaseShort', p.id, `Forward and reverse closed together on ${p.label ?? p.id}: a phase-to-phase short.`);
          else this.clearEvent('phaseShort', p.id);
        }
        this.overloadHeat(p, on, dt);
      } else if (p.type === 'screw') {
        const on = this.running(p, sig);
        const lvl = this.level.get(p.from) ?? 0;
        const gpm = on && lvl > 0.12 ? p.gpm : 0;
        sig.set(`${p.id}.running`, on);
        sig.set(`${p.id}.flow`, gpm);
        this.flow.set(p.id, gpm);
        add(p.from, -(gpm / 60) * dt);
      } else if (p.type === 'filter') {
        const filtering = p.filterWhen.every((s) => sig.b(s));
        const cleaning = p.cleanWhen.every((s) => sig.b(s));
        let v = sig.n(p.signal, p.clean);
        if (cleaning) v = Math.max(p.clean, v - (v - p.clean) * Math.min(1, dt / 8) - 0.05 * dt);
        else if (filtering) v += (p.foulPerMin / 60) * dt;
        const ov = this.hasFault('valueOverride', p.id) as { value: number } | undefined;
        sig.set(p.signal, ov ? ov.value : v);
      }
    }

    for (const [id, gal] of delta) {
      const p = this.parts.get(id) as TankDef;
      let lvl = (this.level.get(id) ?? 0) + gal / p.capacity;
      if (lvl > 1) {
        lvl = 1;
        this.emit('overflow', id, `${p.label ?? id} is overflowing.`);
      } else if (lvl < 0.995) this.clearEvent('overflow', id);
      this.level.set(id, Math.max(0, lvl));
    }

    // Feed going in with no dose (the press's polymer gap).
    for (const p of this.parts.values()) {
      if (!isTank(p) || !p.feedBy) continue;
      const feeding = p.feedBy.some((f) => (this.flow.get(f) ?? 0) > 0);
      const dosing = (p.doseBy ?? []).some((f) => (this.flow.get(f) ?? 0) > 0);
      const undosed = feeding && !dosing;
      sig.set(`${p.id}.undosed`, undosed);
      if (undosed) this.emit('undosed', p.id, `Sludge is going into ${p.label ?? p.id} with no polymer.`);
      else this.clearEvent('undosed', p.id);
    }

    // Faults that act on the next sense pass (overload trips from injection).
    for (const f of this.faults) if (f.type === 'trip' && !this.tripTime.has(f.part)) this.trip(f.part);
  }

  private overloadHeat(p: PumpDef | MotorDef, on: boolean, dt: number) {
    if (!p.overload) return;
    const ol = this.parts.get(p.overload) as OverloadDef | undefined;
    if (!ol || this.tripTime.has(ol.id)) return;
    if (on && this.hasFault('jam', p.id)) {
      const t = (this.jamTime.get(p.id) ?? 0) + dt;
      this.jamTime.set(p.id, t);
      if (t >= (ol.tripAfter ?? 4)) this.trip(ol.id);
    } else this.jamTime.set(p.id, Math.max(0, (this.jamTime.get(p.id) ?? 0) - dt * 0.5));
  }

  private trip(id: string) {
    this.tripTime.set(id, this.t);
    const ol = this.parts.get(id);
    this.events.push({ t: this.t, kind: 'trip', part: id, text: `Overload ${ol?.label ?? id} tripped.` });
  }

  inject(f: WorldFault) {
    this.faults.push(f);
  }

  clearFault(match: (f: WorldFault) => boolean) {
    this.faults = this.faults.filter((f) => !match(f));
  }

  /**
   * Operator and technician actions.
   * - reset an overload (only after it has cooled)
   * - reset a VFD fault, clear a jam, clean an electrode
   * - set a tank level (dragging it on screen)
   */
  action(part: string, what: 'reset' | 'clearJam' | 'clean' | 'setLevel', value?: number): string | null {
    const p = this.parts.get(part);
    if (!p) return `No part called ${part}.`;
    if (what === 'reset' && p.type === 'overload') {
      const since = this.tripTime.get(part);
      if (since === undefined) return null;
      if (this.t - since < (p.coolFor ?? 3)) return `${p.label ?? part} is still hot. Overloads have to cool before they will reset.`;
      this.tripTime.delete(part);
      this.clearFault((f) => f.type === 'trip' && f.part === part);
      return null;
    }
    if (what === 'reset' && p.type === 'vfd') {
      this.clearFault((f) => f.type === 'vfdFault' && f.part === part);
      return null;
    }
    if (what === 'clearJam') {
      this.clearFault((f) => f.type === 'jam' && f.part === part);
      this.jamTime.set(part, 0);
      return null;
    }
    if (what === 'clean') {
      this.clearFault((f) => f.type === 'fouled' && f.part === part);
      return null;
    }
    if (what === 'setLevel' && isTank(p) && value !== undefined) {
      this.level.set(part, Math.min(1, Math.max(0, value)));
      return null;
    }
    return null;
  }

  /** Latching E-stops: pressing toggles in/out (twist to release). */
  toggleLatch(signal: string, sig: Signals) {
    if (this.estops.has(signal)) this.estops.delete(signal);
    else this.estops.add(signal);
    sig.set(signal, this.estops.has(signal));
  }

  setLevel(id: string, v: number) {
    this.level.set(id, v);
  }

  snapshotLevels(): Record<string, Val> {
    return Object.fromEntries(this.level);
  }
}
