import { describe, it, expect } from 'vitest';
import { parseRungs, parseRung, printRungs, insertAt, removeAt, wrapInBranch } from '../src/engine/rung';
import { RelayCircuit } from '../src/engine/relay/circuit';
import { Signals } from '../src/engine/signals';
import type { DeviceDef } from '../src/engine/relay/devices';

const devs: Record<string, DeviceDef> = {
  SB1: { tag: 'SB1', type: 'pushbutton' },
  SB2: { tag: 'SB2', type: 'pushbutton' },
  SB3: { tag: 'SB3', type: 'pushbutton' },
  SA2: { tag: 'SA2', type: 'selector', positions: ['manual', 'stop', 'auto'] },
  LVS1: { tag: 'LVS1', type: 'levelRelay', low: 'E2', high: 'E3' },
};

function run(c: RelayCircuit, sig: Signals, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds - 1e-9; t += dt) c.step(dt, sig);
}

describe('rung text', () => {
  it('round-trips neutral text with branches, wire labels and start nodes', () => {
    const text = '// Start/stop\nNC(SB1)@3[NO(SB2),NO(KM1)]COIL(KM1);\n@19: POS(SA11,on)@22 NC(KA20) [COIL(KM11),LAMP(H5)];';
    const rungs = parseRungs(text);
    expect(rungs).toHaveLength(2);
    expect(rungs[0].comment).toBe('Start/stop');
    expect(rungs[1].start).toBe('19');
    expect(printRungs(rungs)).toBe('// Start/stop\nNC(SB1)@3[NO(SB2),NO(KM1)]COIL(KM1);\n@19: POS(SA11,on)@22NC(KA20)[COIL(KM11),LAMP(H5)];');
  });

  it('reports a missing bracket in plain words', () => {
    expect(() => parseRung('XIC(A)[XIC(B)OTE(C)')).toThrow(/closing \]/);
  });

  it('edits the tree: insert, wrap in a branch, remove', () => {
    let r = parseRung('NO(SB2)COIL(KM1)');
    r = insertAt(r, [0], { op: 'NC', args: ['SB1'] });
    r = wrapInBranch(r, [1]);
    r = insertAt(r, [1, 1, 0], { op: 'NO', args: ['KM1'] });
    expect(printRungs([r])).toBe('NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);');
    r = removeAt(r, [1, 1, 0]);
    expect(printRungs([r])).toBe('NC(SB1)[NO(SB2),]COIL(KM1);');
  });
});

describe('relay circuit', () => {
  it('lights a lamp through a NO button only while pressed, and through a NC button only at rest', () => {
    const c = new RelayCircuit(parseRungs('NO(SB1)LAMP(H1);NC(SB2)LAMP(H2);'), devs);
    const s = new Signals();
    c.step(0.05, s);
    expect(s.get('H1')).toBe(false);
    expect(s.get('H2')).toBe(true);
    s.set('SB1', true);
    s.set('SB2', true);
    c.step(0.05, s);
    expect(s.get('H1')).toBe(true);
    expect(s.get('H2')).toBe(false);
  });

  it('seals in, stops, and stop wins when both are held', () => {
    const c = new RelayCircuit(parseRungs('NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);'), devs);
    const s = new Signals();
    s.set('SB2', true);
    c.step(0.05, s);
    s.set('SB2', false);
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(true);
    s.set('SB1', true);
    s.set('SB2', true);
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(false);
    s.set('SB1', false);
    s.set('SB2', false);
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(false);
  });

  it('a broken wire to a NC stop stops the motor; to a NO stop it cannot', () => {
    const good = new RelayCircuit(parseRungs('NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);'), devs);
    const s = new Signals([['SB2', true]]);
    good.step(0.05, s);
    s.set('SB2', false);
    good.faults.push({ type: 'open', device: 'SB1' });
    good.step(0.05, s);
    expect(s.get('KM1')).toBe(false);
  });

  it('drops out on power loss and stays out when power returns (three-wire control)', () => {
    const c = new RelayCircuit(parseRungs('NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);'), devs);
    const s = new Signals([['SB2', true]]);
    c.step(0.05, s);
    s.set('SB2', false);
    c.step(0.05, s, false);
    expect(s.get('KM1')).toBe(false);
    c.step(0.05, s, true);
    expect(s.get('KM1')).toBe(false);
  });

  it('interlocks forward and reverse', () => {
    const c = new RelayCircuit(
      parseRungs('NC(SB1)[NO(SB2),NO(KM1)]NC(KM2)COIL(KM1);NC(SB1)[NO(SB3),NO(KM2)]NC(KM1)COIL(KM2);'),
      devs,
    );
    const s = new Signals([['SB2', true]]);
    c.step(0.05, s);
    s.set('SB2', false);
    s.set('SB3', true);
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(true);
    expect(s.get('KM2')).toBe(false);
  });

  it('times an on-delay, resets it when the coil drops', () => {
    const c = new RelayCircuit(parseRungs('NO(SB1)TMR(KT1,on,5);NO(KT1)LAMP(H1);'), devs);
    const s = new Signals([['SB1', true]]);
    run(c, s, 4.9);
    expect(s.get('H1')).toBe(false);
    run(c, s, 0.2);
    expect(s.get('H1')).toBe(true);
    s.set('SB1', false);
    c.step(0.05, s);
    expect(s.get('H1')).toBe(false);
    expect(s.get('KT1.acc')).toBe(0);
  });

  it('holds an off-delay output after the coil drops', () => {
    const c = new RelayCircuit(parseRungs('NO(SB1)TMR(KT1,off,3);NO(KT1)LAMP(H1);'), devs);
    const s = new Signals([['SB1', true]]);
    c.step(0.05, s);
    expect(s.get('H1')).toBe(true);
    s.set('SB1', false);
    run(c, s, 2.9);
    expect(s.get('H1')).toBe(true);
    run(c, s, 0.2);
    expect(s.get('H1')).toBe(false);
  });

  it('cycles like KT1: off for the preset, then on, repeating', () => {
    const c = new RelayCircuit(parseRungs('NO(SB1)TMR(KT1,cycle,10,2);NO(KT1)SOL(Y1);'), devs);
    const s = new Signals([['SB1', true]]);
    run(c, s, 9.9);
    expect(s.get('Y1')).toBe(false);
    run(c, s, 0.2);
    expect(s.get('Y1')).toBe(true);
    run(c, s, 2);
    expect(s.get('Y1')).toBe(false);
    run(c, s, 10);
    expect(s.get('Y1')).toBe(true);
  });

  it('blows the fuse on a dead short and reports the rung', () => {
    const c = new RelayCircuit(parseRungs('NO(SB1);'), devs);
    expect(c.net.problems[0].message).toMatch(/dead short/);
    const s = new Signals([['SB1', true]]);
    c.step(0.05, s);
    expect(s.get('FU1.blown')).toBe(true);
  });

  it('reports chatter when a relay opens its own coil circuit', () => {
    const c = new RelayCircuit(parseRungs('NC(KA1)COIL(KA1);'), devs);
    const r = c.step(0.05, new Signals());
    expect(r.chatter).toBe(true);
  });

  it('joins rungs by wire number', () => {
    const c = new RelayCircuit(parseRungs('POS(SA2,manual)@17;POS(SA2,auto)@18;@17: WIRE()@19;@18: NO(SB1)@19;@19: COIL(KM1);'), devs);
    const s = new Signals([['SA2', 'manual']]);
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(true);
    s.set('SA2', 'auto');
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(false);
    s.set('SB1', true);
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(true);
    expect(c.nodeLive('19')).toBe(true);
  });

  it('holds a level relay between its rods, and a fouled high rod keeps it off', () => {
    const c = new RelayCircuit(parseRungs('NO(LVS1)COIL(KM3);'), devs);
    const s = new Signals([['E2', false], ['E3', false]]);
    c.step(0.05, s);
    expect(s.get('KM3')).toBe(true);
    s.set('E2', true);
    c.step(0.05, s);
    expect(s.get('KM3')).toBe(true);
    s.set('E3', true);
    c.step(0.05, s);
    expect(s.get('KM3')).toBe(false);
    s.set('E3', false);
    c.step(0.05, s);
    expect(s.get('KM3')).toBe(false);
    s.set('E2', false);
    c.step(0.05, s);
    expect(s.get('KM3')).toBe(true);
  });

  it('a welded contactor keeps its contacts closed with the coil dead', () => {
    const c = new RelayCircuit(parseRungs('NO(SB1)COIL(KM1);'), devs);
    const s = new Signals();
    c.faults.push({ type: 'welded', device: 'KM1' });
    c.step(0.05, s);
    expect(s.get('KM1.coil')).toBe(false);
    expect(s.get('KM1')).toBe(true);
  });

  it('a jumper across a float makes it always conduct', () => {
    const c = new RelayCircuit(parseRungs('NC(LSH1)COIL(KM1);'), { LSH1: { tag: 'LSH1', type: 'float' } });
    const s = new Signals([['LSH1', true]]);
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(false);
    c.faults.push({ type: 'jumper', device: 'LSH1' });
    c.step(0.05, s);
    expect(s.get('KM1')).toBe(true);
  });
});
