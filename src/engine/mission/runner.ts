// Commissioning: runs a mission's scenarios against the player's logic,
// headless and as fast as the CPU allows, and reports in plain English.

import type { MachineDef } from '../machine';
import { Sim, type Fault, type PlcLike } from '../sim';
import { Signals, type Val } from '../signals';
import type { Expect, Mission, Objective, Scenario, Step } from './types';

export interface Logic {
  relay?: string;
  /** Builds a fresh PLC loaded with the player's program. */
  plc?: () => PlcLike;
}

export interface ScenarioResult {
  name: string;
  pass: boolean;
  /** The failure sentence, when it failed. */
  say?: string;
  at?: number;
  /** What the failing signals actually read. */
  actual?: Record<string, Val | undefined>;
}

export function matches(v: Val | undefined, e: Expect): boolean {
  if (typeof e === 'object') {
    const n = typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : NaN;
    if (Number.isNaN(n)) return false;
    if (e.min !== undefined && n < e.min) return false;
    if (e.max !== undefined && n > e.max) return false;
    return true;
  }
  if (typeof e === 'boolean') return (v === true || v === 1 || v === 'on') === e;
  if (typeof e === 'number' && typeof v === 'number') return Math.abs(v - e) < 1e-6;
  return v === e;
}

export function allMatch(sig: Signals, want: Record<string, Expect>): boolean {
  return Object.entries(want).every(([k, e]) => matches(sig.get(k), e));
}

export function makeSim(machine: MachineDef, logic: Logic): Sim {
  const sim = new Sim(machine, { relay: logic.relay ?? '' });
  if (logic.plc) sim.setPlc(logic.plc());
  return sim;
}

export function applyInit(sim: Sim, init?: Scenario['init']) {
  if (!init) return;
  for (const [k, v] of Object.entries(init.signals ?? {})) sim.set(k, v);
  for (const [k, v] of Object.entries(init.levels ?? {})) sim.world.setLevel(k, v);
}

/** Apply one step's actions (not its checks). */
export function applyStep(sim: Sim, s: Step) {
  if (s.press) sim.press(s.press);
  if (s.release) sim.release(s.release);
  if (s.tap) sim.press(s.tap);
  if (s.set) for (const [k, v] of Object.entries(s.set)) sim.set(k, v);
  if (s.level) for (const [k, v] of Object.entries(s.level)) sim.world.setLevel(k, v);
  if (s.fault) sim.inject(s.fault);
  if (s.clear) sim.clearFault(s.clear);
  if (s.power !== undefined) sim.setPower(s.power);
  if (s.action) sim.world.action(s.action.part, s.action.do);
}

/** Expand taps into a press and a release. */
function expand(steps: Step[]): Step[] {
  const out: Step[] = [];
  for (const s of steps) {
    out.push(s);
    if (s.tap) out.push({ t: s.t + 0.5, release: s.tap });
  }
  return out.sort((a, b) => a.t - b.t);
}

export function runScenario(
  machine: MachineDef,
  logic: Logic,
  sc: Scenario,
  opts: { faults?: Fault[]; init?: Scenario['init']; onTick?: (sim: Sim) => void } = {},
): ScenarioResult {
  const dt = sc.dt ?? 0.05;
  const sim = makeSim(machine, logic);
  applyInit(sim, opts.init);
  applyInit(sim, sc.init);
  for (const f of opts.faults ?? []) sim.inject(f);
  const steps = expand(sc.steps);
  const end = Math.max(0, ...steps.map((s) => Math.max(s.t, s.until ?? 0))) + dt;
  const acted = new Set<Step>();
  const checked = new Set<Step>();
  const eps = dt / 2;

  for (let n = 0; ; n++) {
    const now = n * dt;
    for (const s of steps) {
      if (!acted.has(s) && s.t <= now + eps) {
        acted.add(s);
        applyStep(sim, s);
      }
    }
    sim.tick(dt);
    opts.onTick?.(sim);
    const after = now + dt;
    for (const s of steps) {
      if (!s.expect) continue;
      const inWindow = s.until !== undefined ? s.t <= after + eps && after <= s.until + eps : !checked.has(s) && s.t <= after + eps;
      if (!inWindow) continue;
      checked.add(s);
      if (!allMatch(sim.sig, s.expect)) {
        const actual: Record<string, Val | undefined> = {};
        for (const k of Object.keys(s.expect)) actual[k] = sim.sig.get(k);
        return { name: sc.name, pass: false, say: s.say ?? `Something was off at ${after.toFixed(1)} s.`, at: after, actual };
      }
    }
    if (after >= end) break;
  }
  return { name: sc.name, pass: true };
}

export interface CommissionReport {
  pass: boolean;
  results: ScenarioResult[];
  /** Wiring or program problems found before running (dead shorts, duplicate outputs). */
  problems: string[];
}

export function commission(mission: Mission, machine: MachineDef, logic: Logic, faults: Fault[] = [], problems: string[] = []): CommissionReport {
  const results = mission.tests.map((sc) => runScenario(machine, logic, sc, { faults, init: mission.init }));
  return { pass: results.every((r) => r.pass), results, problems };
}

/** Investigate missions: watch a session and tick off objectives. */
export class ObjectiveWatcher {
  met = new Set<string>();
  constructor(public objectives: Objective[]) {}
  check(sim: Sim) {
    for (const o of this.objectives) {
      if (this.met.has(o.id)) continue;
      if (o.after && !this.met.has(o.after)) continue;
      if (o.event) {
        if (sim.world.events.some((e) => e.kind === o.event) && allMatch(sim.sig, o.when)) this.met.add(o.id);
      } else if (allMatch(sim.sig, o.when)) this.met.add(o.id);
    }
  }
  get done() {
    return this.objectives.every((o) => this.met.has(o.id));
  }
}
