import { describe, it, expect } from 'vitest';
import { World, type PartDef } from '../src/engine/process/world';
import { Signals } from '../src/engine/signals';
import { runScenario } from '../src/engine/mission/runner';
import type { Scenario } from '../src/engine/mission/types';
import type { MachineDef } from '../src/engine/machine';

const parts: PartDef[] = [
  { id: 'TK1', type: 'tank', capacity: 100, level: 0.5 },
  { id: 'TK2', type: 'tank', capacity: 100, level: 0 },
  { id: 'P1', type: 'pump', from: 'TK1', to: 'TK2', gpm: 60, drive: 'KM1', overload: 'FR1' },
  { id: 'FR1', type: 'overload', signal: 'FR1', tripAfter: 2, coolFor: 3 },
  { id: 'LSH', type: 'float', tank: 'TK2', at_level: 0.2, signal: 'LSH' },
  { id: 'LT1', type: 'transmitter', tank: 'TK2', signal: 'LT1.mA' },
  { id: 'XV1', type: 'valve', from: 'TK1', to: 'TK2', gpm: 60, drive: 'XV1.cmd', failOpen: true },
];

function step(w: World, s: Signals, seconds: number, dt = 0.1) {
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    w.sense(s);
    w.act(dt, s);
  }
  w.sense(s);
}

describe('process physics', () => {
  it('a running pump moves liquid at its rate and trips a float', () => {
    const w = new World(parts.filter((p) => p.id !== 'XV1'));
    const s = new Signals([['KM1', true]]);
    w.init(s);
    step(w, s, 10); // 60 gpm for 10 s = 10 gal = 0.1 of the tank
    expect(w.level.get('TK2')).toBeCloseTo(0.1, 2);
    expect(s.get('LSH')).toBe(false);
    step(w, s, 12);
    expect(s.get('LSH')).toBe(true);
    expect(s.get('LT1.mA')).toBeGreaterThan(7.5);
  });

  it('runs dry when the suction tank is empty and logs it', () => {
    const w = new World(parts.filter((p) => p.id !== 'XV1'));
    w.setLevel('TK1', 0.01);
    const s = new Signals([['KM1', true]]);
    w.init(s);
    step(w, s, 1);
    expect(s.get('P1.flow')).toBe(0);
    expect(w.events.some((e) => e.kind === 'dryRun')).toBe(true);
  });

  it('a jammed pump trips its overload, which resets only after cooling', () => {
    const w = new World(parts.filter((p) => p.id !== 'XV1'));
    const s = new Signals([['KM1', true]]);
    w.init(s);
    w.inject({ type: 'jam', part: 'P1' });
    step(w, s, 2.5);
    expect(s.get('FR1')).toBe(true);
    expect(s.get('P1.running')).toBe(false);
    expect(w.action('FR1', 'reset')).toMatch(/still hot/);
    step(w, s, 3);
    expect(w.action('FR1', 'reset')).toBeNull();
    w.sense(s);
    expect(s.get('FR1')).toBe(false);
  });

  it('a fail-open valve opens when its signal drops', () => {
    const w = new World(parts);
    const s = new Signals([['XV1.cmd', true]]);
    w.init(s);
    step(w, s, 1);
    expect(s.get('XV1.open')).toBe(false);
    s.set('XV1.cmd', false);
    step(w, s, 1);
    expect(s.get('XV1.open')).toBe(true);
  });

  it('a transmitter wire break reads 0 mA', () => {
    const w = new World(parts);
    const s = new Signals();
    w.init(s);
    w.inject({ type: 'wireBreak', part: 'LT1' });
    w.sense(s);
    expect(s.get('LT1.mA')).toBe(0);
  });
});

describe('mission runner', () => {
  const machine: MachineDef = {
    id: 'test',
    title: 'Test',
    site: 'Bench',
    size: [100, 100],
    parts: [
      { id: 'SB1', type: 'button', signal: 'SB1' },
      { id: 'SB2', type: 'button', signal: 'SB2' },
      ...parts.slice(0, 4),
    ],
    devices: { SB1: { tag: 'SB1', type: 'pushbutton' }, SB2: { tag: 'SB2', type: 'pushbutton' }, FR1: { tag: 'FR1', type: 'overload' } },
  };
  const scenario: Scenario = {
    name: 'Start, then stop',
    steps: [
      { t: 1, tap: 'SB2' },
      { t: 2, expect: { KM1: true, 'P1.running': true }, say: 'After start, the pump did not keep running.' },
      { t: 3, tap: 'SB1' },
      { t: 4, until: 6, expect: { KM1: false }, say: 'After stop, the pump kept running.' },
    ],
  };

  it('passes a seal-in circuit', () => {
    const r = runScenario(machine, { relay: 'NC(SB1)[NO(SB2),NO(KM1)]NC(FR1)COIL(KM1);' }, scenario);
    expect(r).toEqual({ name: 'Start, then stop', pass: true });
  });

  it('fails a circuit with no seal-in, with the plain-language sentence', () => {
    const r = runScenario(machine, { relay: 'NC(SB1)NO(SB2)COIL(KM1);' }, scenario);
    expect(r.pass).toBe(false);
    expect(r.say).toBe('After start, the pump did not keep running.');
  });
});
