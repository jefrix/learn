// The simulation clock: couples the plant, the relay circuit (hardwired rungs
// plus any the player drew) and the PLC on one fixed time step.
//
// Each tick:  plant sensors -> PLC scan -> relay circuit settles -> plant moves.

import type { MachineDef } from './machine';
import { World, type WorldFault } from './process/world';
import { RelayCircuit, type RelayFault } from './relay/circuit';
import { parseRungs, type Rung } from './rung';
import { Signals, type Val } from './signals';

/** What the sim needs from a PLC. The ladder engine implements this. */
export interface PlcLike {
  writeInput(tag: string, v: Val): void;
  readOutput(tag: string): Val;
  /** One scan; dt in seconds. */
  scan(dt: number): void;
  /** Power-up: prescan, first-scan bit. */
  powerUp(): void;
  /** Power-down: outputs go off. */
  powerDown(): void;
}

export type PlcFault =
  /** Every PLC output forced on, as if the program or a force went wrong. */
  | { type: 'forceOutputs' }
  /** The CPU faults and stops scanning; its outputs turn off. */
  | { type: 'plcHalt' };

export type Fault = RelayFault | WorldFault | PlcFault;

const RELAY_FAULTS = new Set(['open', 'openWire', 'welded', 'jumper', 'coilOpen']);
const PLC_FAULTS = new Set(['forceOutputs', 'plcHalt']);

export class Sim {
  sig = new Signals();
  world: World;
  relay: RelayCircuit | null = null;
  plc: PlcLike | null = null;
  powered = true;
  t = 0;
  hardRungs: Rung[];
  playerRungs: Rung[] = [];
  plcFaults: PlcFault[] = [];
  private estopSignals = new Set<string>();

  constructor(
    public machine: MachineDef,
    opts: { relay?: Rung[] | string; plc?: PlcLike } = {},
  ) {
    this.world = new World(machine.parts.map((p) => ({ ...p })));
    this.hardRungs = machine.hardwired ? parseRungs(machine.hardwired) : [];
    for (const p of machine.parts) if (p.type === 'estop') this.estopSignals.add((p as { signal: string }).signal);
    this.world.init(this.sig);
    this.setRelay(opts.relay ?? []);
    if (opts.plc) this.setPlc(opts.plc);
  }

  /** Replace the player's relay rungs (an online edit). Relay and timer states carry over. */
  setRelay(r: Rung[] | string) {
    this.playerRungs = typeof r === 'string' ? parseRungs(r) : r;
    const all = [...this.hardRungs, ...this.playerRungs];
    if (all.length === 0) {
      this.relay = null;
      return;
    }
    if (this.relay) this.relay.reload(all);
    else this.relay = new RelayCircuit(all, this.machine.devices, ['L1', ...(this.machine.sources ?? [])]);
  }

  setPlc(plc: PlcLike) {
    this.plc = plc;
    if (this.powered) plc.powerUp();
  }

  /** The rung index in the relay netlist where the player's rungs begin. */
  get playerOffset() {
    return this.hardRungs.length;
  }

  private readInput(p: NonNullable<MachineDef['plc']>['inputs'][number]): Val {
    if (p.device && p.pos) {
      const relayOpen = this.relay?.faults.some((f) => f.type === 'open' && f.device === p.device) ?? false;
      return !relayOpen && this.sig.s(p.device) === p.pos;
    }
    if (p.device) {
      const relayOpen = this.relay?.faults.some((f) => f.type === 'open' && f.device === p.device) ?? false;
      if (relayOpen) return false;
      const def = this.machine.devices[p.device];
      const act = this.sig.b(def?.signal ?? p.device);
      return p.contact === 'NC' ? !act : act;
    }
    if (p.signal) {
      const v = this.sig.get(p.signal);
      if (p.type === 'REAL' || p.type === 'DINT') return typeof v === 'number' ? v : Number(v) || 0;
      return this.sig.b(p.signal);
    }
    return false;
  }

  private get plcHalted() {
    return this.plcFaults.some((f) => f.type === 'plcHalt');
  }

  /** Stage 1: instruments read the plant; the PLC's input terminals see the field. */
  readInputs() {
    this.world.sense(this.sig);
    const io = this.machine.plc;
    if (this.plc && io && this.powered && !this.plcHalted) {
      for (const p of io.inputs) this.plc.writeInput(p.tag, this.readInput(p));
    }
  }

  /** Stage 3: the PLC's output image drives its output terminals. */
  writeOutputs() {
    const io = this.machine.plc;
    if (!this.plc || !io) return;
    const halted = this.plcHalted;
    const forced = this.plcFaults.some((f) => f.type === 'forceOutputs');
    for (const p of io.outputs) {
      if (!p.signal) continue;
      let v: Val = this.powered && !halted ? this.plc.readOutput(p.tag) : false;
      if (forced && this.powered && typeof v === 'boolean') v = true;
      this.sig.set(p.signal, v);
    }
    this.sig.set('PLC.halted', halted);
    this.sig.set('PLC.ok', this.powered && !halted && !(this.plc as { fault?: string | null }).fault);
  }

  /** Stage 4: the relay circuit settles and the plant moves. */
  finishTick(dt: number) {
    if (this.relay) this.relay.step(dt, this.sig, this.powered);
    this.world.act(dt, this.sig);
    this.t += dt;
  }

  tick(dt: number) {
    this.readInputs();
    if (this.plc && this.machine.plc && this.powered && !this.plcHalted) this.plc.scan(dt);
    this.writeOutputs();
    this.finishTick(dt);
  }

  run(seconds: number, dt: number) {
    const n = Math.round(seconds / dt);
    for (let i = 0; i < n; i++) this.tick(dt);
  }

  // ---------- operator ----------

  press(signal: string) {
    if (this.estopSignals.has(signal)) {
      if (!this.sig.b(signal)) this.world.toggleLatch(signal, this.sig);
      return;
    }
    this.sig.set(signal, true);
  }

  release(signal: string) {
    if (this.estopSignals.has(signal)) {
      if (this.sig.b(signal)) this.world.toggleLatch(signal, this.sig);
      return;
    }
    this.sig.set(signal, false);
  }

  set(signal: string, v: Val) {
    this.sig.set(signal, v);
  }

  setPower(on: boolean) {
    if (on === this.powered) return;
    this.powered = on;
    if (this.plc) {
      if (on) this.plc.powerUp();
      else this.plc.powerDown();
    }
  }

  // ---------- faults ----------

  inject(f: Fault) {
    if (RELAY_FAULTS.has(f.type)) this.relay?.faults.push(f as RelayFault);
    else if (PLC_FAULTS.has(f.type)) this.plcFaults.push(f as PlcFault);
    else this.world.inject(f as WorldFault);
  }

  clearFault(f: Fault) {
    const same = (g: Fault) => JSON.stringify(g) === JSON.stringify(f);
    if (this.relay) this.relay.faults = this.relay.faults.filter((g) => !same(g));
    this.plcFaults = this.plcFaults.filter((g) => !same(g));
    this.world.clearFault((g) => same(g));
  }

  allFaults(): Fault[] {
    return [...(this.relay?.faults ?? []), ...this.plcFaults, ...this.world.faults];
  }
}
