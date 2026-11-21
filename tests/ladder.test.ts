// The ladder engine against Allen-Bradley Logix behavior, instruction by instruction.
import { describe, it, expect } from 'vitest';
import { LadderEngine, roundEven, type TagDef, type TimerVal, type CounterVal } from '../src/engine/ladder/engine';
import { analyze, buildPlc } from '../src/engine/ladder/program';
import { parseRungs } from '../src/engine/rung';
import type { MachineDef } from '../src/engine/machine';

const DT = 0.01; // 10 ms scans

function plc(text: string, tags: [string, TagDef['type'], number?][]) {
  const defs: TagDef[] = tags.map(([name, type, initial]) => ({ name, type, usage: 'internal', initial }));
  return new LadderEngine(defs, parseRungs(text));
}
const set = (e: LadderEngine, ref: string, v: boolean | number) => (typeof v === 'boolean' ? e.setBit(ref, v) : e.store(ref, v));
const scans = (e: LadderEngine, n: number) => {
  for (let i = 0; i < n; i++) e.scan(DT);
};
const T = (e: LadderEngine, n: string) => e.timer(n) as TimerVal;
const C = (e: LadderEngine, n: string) => e.counter(n) as CounterVal;

describe('bit instructions', () => {
  it('XIC is true when the bit is 1; XIO when it is 0', () => {
    const e = plc('XIC(A)OTE(X);XIO(A)OTE(Y);', [['A', 'BOOL'], ['X', 'BOOL'], ['Y', 'BOOL']]);
    e.scan(DT);
    expect([e.bit('X'), e.bit('Y')]).toEqual([false, true]);
    set(e, 'A', true);
    e.scan(DT);
    expect([e.bit('X'), e.bit('Y')]).toEqual([true, false]);
  });

  it('OTE writes the rung condition, including 0 on a false rung', () => {
    const e = plc('XIC(A)OTE(X);', [['A', 'BOOL'], ['X', 'BOOL', 1]]);
    expect(e.bit('X')).toBe(true);
    e.scan(DT);
    expect(e.bit('X')).toBe(false);
  });

  it('OTL sets and OTU clears; both do nothing on a false rung', () => {
    const e = plc('XIC(A)OTL(X);XIC(B)OTU(X);', [['A', 'BOOL'], ['B', 'BOOL'], ['X', 'BOOL']]);
    set(e, 'A', true);
    e.scan(DT);
    set(e, 'A', false);
    scans(e, 3);
    expect(e.bit('X')).toBe(true);
    set(e, 'B', true);
    e.scan(DT);
    set(e, 'B', false);
    scans(e, 3);
    expect(e.bit('X')).toBe(false);
  });

  it('series is AND, branches are OR, and outputs pass the condition through', () => {
    const e = plc('XIC(A)[XIC(B),XIC(C)]OTE(X)OTE(Y);', [['A', 'BOOL'], ['B', 'BOOL'], ['C', 'BOOL'], ['X', 'BOOL'], ['Y', 'BOOL']]);
    set(e, 'A', true);
    set(e, 'C', true);
    e.scan(DT);
    expect([e.bit('X'), e.bit('Y')]).toEqual([true, true]);
    set(e, 'A', false);
    e.scan(DT);
    expect([e.bit('X'), e.bit('Y')]).toEqual([false, false]);
  });

  it('duplicate OTE: the last rung wins, and the lint warns', () => {
    const e = plc('XIC(A)OTE(X);XIC(B)OTE(X);', [['A', 'BOOL'], ['B', 'BOOL'], ['X', 'BOOL']]);
    set(e, 'A', true);
    e.scan(DT);
    expect(e.bit('X')).toBe(false);
    set(e, 'B', true);
    e.scan(DT);
    expect(e.bit('X')).toBe(true);
    const m: MachineDef = { id: 'm', title: '', site: '', size: [1, 1], parts: [], devices: {} };
    expect(analyze('XIC(A)OTE(X);XIC(B)OTE(X);', m).warnings[0]).toMatch(/only the last one counts/i);
  });

  it('rung order matters: a bit set on a later rung is seen one scan late', () => {
    const e = plc('XIC(B)OTE(C);XIC(A)OTE(B);', [['A', 'BOOL'], ['B', 'BOOL'], ['C', 'BOOL']]);
    set(e, 'A', true);
    e.scan(DT);
    expect([e.bit('B'), e.bit('C')]).toEqual([true, false]);
    e.scan(DT);
    expect(e.bit('C')).toBe(true);
  });

  it('ONS is true for exactly one scan per false-to-true transition', () => {
    const e = plc('XIC(A)ONS(St)OTE(P);', [['A', 'BOOL'], ['St', 'BOOL'], ['P', 'BOOL']]);
    set(e, 'A', true);
    e.scan(DT);
    expect(e.bit('P')).toBe(true);
    expect(e.bit('St')).toBe(true);
    scans(e, 5);
    expect(e.bit('P')).toBe(false);
    set(e, 'A', false);
    e.scan(DT);
    expect(e.bit('St')).toBe(false);
    set(e, 'A', true);
    e.scan(DT);
    expect(e.bit('P')).toBe(true);
  });
});

describe('timers', () => {
  it('TON: EN and TT while timing, DN at the preset, ACC stops at PRE', () => {
    const e = plc('XIC(A)TON(T1,100,0);', [['A', 'BOOL'], ['T1', 'TIMER', 100]]);
    set(e, 'A', true);
    e.scan(DT); // first true scan starts timing
    expect(T(e, 'T1')).toMatchObject({ EN: true, TT: true, DN: false, ACC: 0 });
    scans(e, 9);
    expect(T(e, 'T1')).toMatchObject({ ACC: 90, DN: false, TT: true });
    e.scan(DT);
    expect(T(e, 'T1')).toMatchObject({ ACC: 100, DN: true, TT: false, EN: true });
    scans(e, 5);
    expect(T(e, 'T1').ACC).toBe(100);
  });

  it('TON resets ACC, EN, TT and DN when the rung goes false', () => {
    const e = plc('XIC(A)TON(T1,50,0);', [['A', 'BOOL'], ['T1', 'TIMER', 50]]);
    set(e, 'A', true);
    scans(e, 3);
    set(e, 'A', false);
    e.scan(DT);
    expect(T(e, 'T1')).toEqual({ PRE: 50, ACC: 0, EN: false, TT: false, DN: false });
  });

  it('TOF: DN on at once, stays on PRE after the rung goes false, then drops', () => {
    const e = plc('XIC(A)TOF(T1,100,0);', [['A', 'BOOL'], ['T1', 'TIMER', 100]]);
    set(e, 'A', true);
    e.scan(DT);
    expect(T(e, 'T1')).toMatchObject({ EN: true, DN: true, TT: false, ACC: 0 });
    set(e, 'A', false);
    e.scan(DT);
    expect(T(e, 'T1')).toMatchObject({ EN: false, DN: true, TT: true, ACC: 0 });
    scans(e, 9);
    expect(T(e, 'T1')).toMatchObject({ DN: true, ACC: 90 });
    e.scan(DT);
    expect(T(e, 'T1')).toMatchObject({ DN: false, TT: false, ACC: 100 });
  });

  it('TOF: going true again during timing resets it with DN still on', () => {
    const e = plc('XIC(A)TOF(T1,100,0);', [['A', 'BOOL'], ['T1', 'TIMER', 100]]);
    set(e, 'A', true);
    e.scan(DT);
    set(e, 'A', false);
    scans(e, 5);
    set(e, 'A', true);
    e.scan(DT);
    expect(T(e, 'T1')).toMatchObject({ DN: true, ACC: 0, TT: false, EN: true });
  });

  it('RTO keeps ACC and DN when the rung goes false; RES clears them', () => {
    const e = plc('XIC(A)RTO(T1,100,0);XIC(R)RES(T1);', [['A', 'BOOL'], ['R', 'BOOL'], ['T1', 'TIMER', 100]]);
    set(e, 'A', true);
    scans(e, 5); // 40 ms accumulated
    set(e, 'A', false);
    scans(e, 10);
    expect(T(e, 'T1')).toMatchObject({ ACC: 40, EN: false, TT: false, DN: false });
    set(e, 'A', true);
    scans(e, 8); // resumes: 40 + 70 >= 100
    expect(T(e, 'T1')).toMatchObject({ ACC: 100, DN: true });
    set(e, 'A', false);
    scans(e, 3);
    expect(T(e, 'T1').DN).toBe(true);
    set(e, 'R', true);
    e.scan(DT);
    expect(T(e, 'T1')).toMatchObject({ ACC: 0, DN: false });
  });

  it('RES on a TON clears ACC, EN, TT and DN', () => {
    const e = plc('XIC(A)TON(T1,20,0);XIC(R)RES(T1);', [['A', 'BOOL'], ['R', 'BOOL'], ['T1', 'TIMER', 20]]);
    set(e, 'A', true);
    scans(e, 5);
    expect(T(e, 'T1').DN).toBe(true);
    set(e, 'R', true);
    e.scan(DT);
    expect(T(e, 'T1')).toMatchObject({ ACC: 0, DN: false, EN: false, TT: false });
  });
});

describe('counters', () => {
  it('CTU counts each false-to-true transition once; DN when ACC >= PRE', () => {
    const e = plc('XIC(A)CTU(C1,3,0);', [['A', 'BOOL'], ['C1', 'COUNTER', 3]]);
    for (let i = 0; i < 3; i++) {
      set(e, 'A', true);
      scans(e, 4);
      set(e, 'A', false);
      scans(e, 2);
    }
    expect(C(e, 'C1')).toMatchObject({ ACC: 3, DN: true, CU: false });
  });

  it('CTD counts down and shares ACC with CTU on the same tag', () => {
    const e = plc('XIC(U)CTU(C1,2,0);XIC(D)CTD(C1,2,0);', [['U', 'BOOL'], ['D', 'BOOL'], ['C1', 'COUNTER', 2]]);
    set(e, 'U', true);
    e.scan(DT);
    set(e, 'U', false);
    e.scan(DT);
    set(e, 'U', true);
    e.scan(DT);
    expect(C(e, 'C1')).toMatchObject({ ACC: 2, DN: true });
    set(e, 'D', true);
    e.scan(DT);
    expect(C(e, 'C1')).toMatchObject({ ACC: 1, DN: false });
  });

  it('CTU overflows from 2147483647 to -2147483648 and sets OV; RES clears it', () => {
    const e = plc('XIC(A)CTU(C1,0,0);XIC(R)RES(C1);', [['A', 'BOOL'], ['R', 'BOOL'], ['C1', 'COUNTER']]);
    C(e, 'C1').ACC = 2147483647;
    set(e, 'A', true);
    e.scan(DT);
    expect(C(e, 'C1')).toMatchObject({ ACC: -2147483648, OV: true });
    set(e, 'R', true);
    e.scan(DT);
    expect(C(e, 'C1')).toMatchObject({ ACC: 0, OV: false, DN: false });
  });

  it('CTD underflows and sets UN', () => {
    const e = plc('XIC(A)CTD(C1,0,0);', [['A', 'BOOL'], ['C1', 'COUNTER']]);
    C(e, 'C1').ACC = -2147483648;
    set(e, 'A', true);
    e.scan(DT);
    expect(C(e, 'C1')).toMatchObject({ ACC: 2147483647, UN: true });
  });
});

describe('compare and math', () => {
  const cmp = (op: string, a: number, b: number) => {
    const e = plc(`${op}(A,B)OTE(X);`, [['A', 'DINT', a], ['B', 'DINT', b], ['X', 'BOOL']]);
    e.scan(DT);
    return e.bit('X');
  };
  it('EQU, NEQ, GRT, LES, GEQ, LEQ', () => {
    expect([cmp('EQU', 3, 3), cmp('EQU', 3, 4)]).toEqual([true, false]);
    expect([cmp('NEQ', 3, 4), cmp('NEQ', 3, 3)]).toEqual([true, false]);
    expect([cmp('GRT', 4, 3), cmp('GRT', 3, 3)]).toEqual([true, false]);
    expect([cmp('LES', 2, 3), cmp('LES', 3, 3)]).toEqual([true, false]);
    expect([cmp('GEQ', 3, 3), cmp('GEQ', 2, 3)]).toEqual([true, false]);
    expect([cmp('LEQ', 3, 3), cmp('LEQ', 4, 3)]).toEqual([true, false]);
  });

  it('compares accept literals and timer members', () => {
    const e = plc('XIC(A)TON(T1,1000,0);GEQ(T1.ACC,500)OTE(X);', [['A', 'BOOL'], ['T1', 'TIMER', 1000], ['X', 'BOOL']]);
    set(e, 'A', true);
    scans(e, 50);
    expect(e.bit('X')).toBe(false);
    scans(e, 2);
    expect(e.bit('X')).toBe(true);
  });

  it('MOV and math only execute when the rung is true', () => {
    const e = plc('XIC(A)MOV(42,D);XIC(A)ADD(D,1,E);', [['A', 'BOOL'], ['D', 'DINT'], ['E', 'DINT']]);
    e.scan(DT);
    expect([e.num('D'), e.num('E')]).toEqual([0, 0]);
    set(e, 'A', true);
    e.scan(DT);
    expect([e.num('D'), e.num('E')]).toEqual([42, 43]);
  });

  it('ADD, SUB, MUL, DIV with REAL results; REAL into DINT rounds half to even', () => {
    const e = plc('SUB(I,4,R1)MUL(R1,1.5,R2)DIV(R2,4,R3)MOV(2.5,D1)MOV(3.5,D2)MOV(-2.5,D3);', [['I', 'REAL', 12], ['R1', 'REAL'], ['R2', 'REAL'], ['R3', 'REAL'], ['D1', 'DINT'], ['D2', 'DINT'], ['D3', 'DINT']]);
    e.scan(DT);
    expect([e.num('R1'), e.num('R2'), e.num('R3')]).toEqual([8, 12, 3]);
    expect([e.num('D1'), e.num('D2'), e.num('D3')]).toEqual([2, 4, -2]);
    expect([roundEven(0.5), roundEven(1.5), roundEven(1.4)]).toEqual([0, 2, 1]);
  });

  it('integer DIV into a DINT truncates toward zero', () => {
    const e = plc('DIV(A,B,Q)DIV(N,B,Q2);', [['A', 'DINT', 7], ['N', 'DINT', -7], ['B', 'DINT', 2], ['Q', 'DINT'], ['Q2', 'DINT']]);
    e.scan(DT);
    expect([e.num('Q'), e.num('Q2')]).toEqual([3, -3]);
  });

  it('divide by zero raises a minor fault and leaves the destination alone', () => {
    const e = plc('DIV(A,0,Q);', [['A', 'DINT', 7], ['Q', 'DINT', 5]]);
    e.scan(DT);
    expect(e.num('Q')).toBe(5);
    expect(e.minorFaults[0]).toMatch(/divide by zero/i);
  });

  it('REAL tags are single precision', () => {
    const e = plc('MOV(0.1,R);', [['R', 'REAL']]);
    e.scan(DT);
    expect(e.num('R')).toBe(Math.fround(0.1));
    expect(e.num('R')).not.toBe(0.1);
  });
});

describe('scan cycle and power', () => {
  const m: MachineDef = {
    id: 'm',
    title: '',
    site: '',
    size: [1, 1],
    parts: [],
    devices: {},
    plc: { inputs: [{ tag: 'In1' }], outputs: [{ tag: 'Out1', signal: 'Q0' }] },
  };

  it('reads inputs once at the start of the scan and writes outputs at the end', () => {
    const p = buildPlc('XIC(In1)OTE(Out1);XIO(In1)OTE(Out2);', m);
    p.writeInput('In1', true);
    expect(p.readOutput('Out1')).toBe(false); // nothing until a scan
    p.scan(DT);
    expect(p.readOutput('Out1')).toBe(true);
    p.writeInput('In1', false); // changes mid-way don't matter until the next scan
    expect(p.engine.bit('In1')).toBe(true);
  });

  it('OTL survives a power cycle; OTE does not; S:FS is true on the first scan only', () => {
    const p = buildPlc('XIC(In1)OTL(Latched);XIC(In1)OTE(Ote);XIC(S:FS)OTE(Saw_FS);', m);
    p.powerUp();
    p.writeInput('In1', true);
    p.scan(DT);
    expect(p.engine.bit('Saw_FS')).toBe(true);
    p.writeInput('In1', false);
    p.scan(DT);
    expect(p.engine.bit('Saw_FS')).toBe(false);
    p.writeInput('In1', true);
    p.scan(DT);
    p.powerDown();
    p.powerUp(); // prescan
    expect(p.engine.bit('Latched')).toBe(true);
    expect(p.engine.bit('Ote')).toBe(false);
    p.writeInput('In1', false);
    p.scan(DT);
    expect(p.engine.bit('Latched')).toBe(true);
    expect(p.engine.bit('Saw_FS')).toBe(true);
  });

  it('prescan sets ONS storage so a held input does not fire on the first scan', () => {
    const p = buildPlc('XIC(In1)ONS(St)CTU(C,10,0);', m);
    p.writeInput('In1', true);
    p.powerUp();
    p.scan(DT);
    expect(p.engine.counter('C').ACC).toBe(0);
  });

  it('prescan resets TON, sets TOF ACC to PRE, and keeps RTO ACC', () => {
    const p = buildPlc('XIC(In1)TON(A,100,0);XIC(In1)TOF(B,100,0);XIC(In1)RTO(C,100,0);', m);
    p.writeInput('In1', true);
    for (let i = 0; i < 6; i++) p.scan(DT);
    p.powerDown();
    p.powerUp();
    expect(p.engine.timer('A')).toMatchObject({ ACC: 0, DN: false, EN: false });
    expect(p.engine.timer('B')).toMatchObject({ ACC: 100, DN: false });
    expect(p.engine.timer('C').ACC).toBe(50);
  });

  it('verification catches unknown tags types, writes to inputs, and bad instructions', () => {
    const a = analyze('OTE(In1);XIC(T1)TON(T1,1,0);FOO(X);', m);
    expect(a.errors.join(' ')).toMatch(/In1 is an input/);
    expect(a.errors.join(' ')).toMatch(/T1 is a TIMER/);
    expect(a.errors.join(' ')).toMatch(/FOO/);
  });

  it('infers tag types from use, and TAG lines declare REALs', () => {
    const a = analyze('TAG Lvl REAL\nXIC(Run)TON(T1,5000)CTU(C1,3)MOV(1.5,Lvl)MOV(2,Cnt);', m);
    const ty = Object.fromEntries(a.tags.map((t) => [t.name, t.type]));
    expect(ty).toMatchObject({ Run: 'BOOL', T1: 'TIMER', C1: 'COUNTER', Lvl: 'REAL', Cnt: 'DINT' });
    expect(a.tags.find((t) => t.name === 'T1')?.initial).toBe(5000);
  });
});
