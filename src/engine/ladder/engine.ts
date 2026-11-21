// Ladder scan engine with Logix (Studio 5000) semantics.
//
// Every instruction receives rung-condition-in and produces rung-condition-out.
// Input instructions AND their condition into it; output instructions pass it
// through unchanged. Every instruction executes on every scan, true or false:
// that is how OTE writes 0 on a false rung and how TON resets.
//
// A scan: copy the input image into the input tags, solve rungs top to bottom,
// copy the output tags into the output image. (That synchronous model matches
// Micro800. ControlLogix/CompactLogix update I/O asynchronously; see the
// scan-cycle help card.)

import { isBranch, type Instr, type Path, type Rung, type Series } from '../rung';
import type { Val } from '../signals';

export type DataType = 'BOOL' | 'DINT' | 'REAL' | 'TIMER' | 'COUNTER';

export interface TimerVal {
  PRE: number;
  ACC: number;
  EN: boolean;
  TT: boolean;
  DN: boolean;
}
export interface CounterVal {
  PRE: number;
  ACC: number;
  CU: boolean;
  CD: boolean;
  DN: boolean;
  OV: boolean;
  UN: boolean;
}

export interface TagDef {
  name: string;
  type: DataType;
  usage: 'input' | 'output' | 'internal';
  initial?: number;
  desc?: string;
  address?: string;
}

type Value = boolean | number | TimerVal | CounterVal;

export const OPS: Record<string, { args: string[]; kind: 'input' | 'output'; desc: string }> = {
  XIC: { args: ['Bit'], kind: 'input', desc: 'Examine If Closed: true when the bit is 1' },
  XIO: { args: ['Bit'], kind: 'input', desc: 'Examine If Open: true when the bit is 0' },
  OTE: { args: ['Bit'], kind: 'output', desc: 'Output Energize: bit = rung condition' },
  OTL: { args: ['Bit'], kind: 'output', desc: 'Output Latch: sets the bit when the rung is true' },
  OTU: { args: ['Bit'], kind: 'output', desc: 'Output Unlatch: clears the bit when the rung is true' },
  ONS: { args: ['Storage bit'], kind: 'input', desc: 'One Shot: true for one scan when the rung goes true' },
  TON: { args: ['Timer', 'Preset', 'Accum'], kind: 'output', desc: 'Timer On Delay' },
  TOF: { args: ['Timer', 'Preset', 'Accum'], kind: 'output', desc: 'Timer Off Delay' },
  RTO: { args: ['Timer', 'Preset', 'Accum'], kind: 'output', desc: 'Retentive Timer On' },
  CTU: { args: ['Counter', 'Preset', 'Accum'], kind: 'output', desc: 'Count Up' },
  CTD: { args: ['Counter', 'Preset', 'Accum'], kind: 'output', desc: 'Count Down' },
  RES: { args: ['Timer or counter'], kind: 'output', desc: 'Reset a timer or counter' },
  EQU: { args: ['Source A', 'Source B'], kind: 'input', desc: 'Equal: A = B' },
  NEQ: { args: ['Source A', 'Source B'], kind: 'input', desc: 'Not Equal: A ≠ B' },
  GRT: { args: ['Source A', 'Source B'], kind: 'input', desc: 'Greater Than: A > B' },
  LES: { args: ['Source A', 'Source B'], kind: 'input', desc: 'Less Than: A < B' },
  GEQ: { args: ['Source A', 'Source B'], kind: 'input', desc: 'Greater Than or Equal: A ≥ B' },
  LEQ: { args: ['Source A', 'Source B'], kind: 'input', desc: 'Less Than or Equal: A ≤ B' },
  MOV: { args: ['Source', 'Dest'], kind: 'output', desc: 'Move: Dest = Source' },
  ADD: { args: ['Source A', 'Source B', 'Dest'], kind: 'output', desc: 'Add: Dest = A + B' },
  SUB: { args: ['Source A', 'Source B', 'Dest'], kind: 'output', desc: 'Subtract: Dest = A − B' },
  MUL: { args: ['Source A', 'Source B', 'Dest'], kind: 'output', desc: 'Multiply: Dest = A × B' },
  DIV: { args: ['Source A', 'Source B', 'Dest'], kind: 'output', desc: 'Divide: Dest = A ÷ B' },
};

const NUM = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

export function isLiteral(s: string) {
  return NUM.test(s.trim());
}

/** Round half to even, as Logix does when a REAL is stored into a DINT. */
export function roundEven(x: number): number {
  const r = Math.round(x);
  if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
  return r;
}

function int32(x: number): { v: number; overflow: boolean } {
  const v = x | 0;
  return { v, overflow: v !== x };
}

export interface Trace {
  in: boolean;
  out: boolean;
}

export class LadderError extends Error {}

export class LadderEngine {
  tags = new Map<string, { def: TagDef; v: Value }>();
  rungs: Rung[] = [];
  /** Last scan's rung-condition in/out per element id "ri.path". */
  trace = new Map<string, Trace>();
  inputImage = new Map<string, Val>();
  outputImage = new Map<string, Val>();
  firstScan = true;
  running = true;
  /** Minor faults (overflow, divide by zero) seen since the last clear. */
  minorFaults: string[] = [];
  scans = 0;
  private dtMs = 0;

  constructor(defs: TagDef[], rungs: Rung[]) {
    for (const d of defs) this.addTag(d);
    this.rungs = rungs;
  }

  addTag(d: TagDef) {
    this.tags.set(d.name, { def: d, v: this.initial(d) });
  }

  private initial(d: TagDef): Value {
    switch (d.type) {
      case 'BOOL':
        return !!d.initial;
      case 'DINT':
        return (d.initial ?? 0) | 0;
      case 'REAL':
        return Math.fround(d.initial ?? 0);
      case 'TIMER':
        return { PRE: d.initial ?? 0, ACC: 0, EN: false, TT: false, DN: false };
      case 'COUNTER':
        return { PRE: d.initial ?? 0, ACC: 0, CU: false, CD: false, DN: false, OV: false, UN: false };
    }
  }

  /** Replace the program (online edit). Existing tag values are kept. */
  load(defs: TagDef[], rungs: Rung[]) {
    const old = this.tags;
    this.tags = new Map();
    for (const d of defs) {
      const prev = old.get(d.name);
      if (prev && prev.def.type === d.type) {
        this.tags.set(d.name, { def: d, v: prev.v });
        if ((d.type === 'TIMER' || d.type === 'COUNTER') && d.initial !== undefined) (prev.v as TimerVal).PRE = d.initial;
      } else this.addTag(d);
    }
    this.rungs = rungs;
  }

  // ---------- operand access ----------

  private split(ref: string): { base: string; member?: string } {
    const r = ref.trim();
    if (r.startsWith('S:')) return { base: r };
    const dot = r.indexOf('.');
    if (dot < 0) return { base: r };
    return { base: r.slice(0, dot), member: r.slice(dot + 1).toUpperCase() };
  }

  /** Read a BOOL operand: a BOOL tag, a timer/counter status bit, a DINT bit, or S:FS. */
  bit(ref: string): boolean {
    if (ref === 'S:FS') return this.firstScan;
    const { base, member } = this.split(ref);
    const t = this.tags.get(base);
    if (!t) throw new LadderError(`Tag ${base} doesn't exist.`);
    if (member === undefined) {
      if (t.def.type !== 'BOOL') throw new LadderError(`${ref} is a ${t.def.type}, not a BOOL.`);
      return t.v as boolean;
    }
    if (t.def.type === 'DINT' && /^\d+$/.test(member)) return (((t.v as number) >> Number(member)) & 1) === 1;
    const obj = t.v as unknown as Record<string, Value>;
    if (!(member in obj)) throw new LadderError(`${ref}: ${t.def.type} has no member ${member}.`);
    return !!obj[member];
  }

  setBit(ref: string, v: boolean) {
    const { base, member } = this.split(ref);
    const t = this.tags.get(base);
    if (!t) throw new LadderError(`Tag ${base} doesn't exist.`);
    if (member === undefined) {
      if (t.def.type !== 'BOOL') throw new LadderError(`${ref} is a ${t.def.type}, not a BOOL.`);
      t.v = v;
      return;
    }
    if (t.def.type === 'DINT' && /^\d+$/.test(member)) {
      const b = Number(member);
      t.v = v ? (t.v as number) | (1 << b) : (t.v as number) & ~(1 << b);
      return;
    }
    (t.v as unknown as Record<string, Value>)[member] = v;
  }

  /** Read a numeric operand: a literal, a DINT/REAL tag, or a .PRE/.ACC member. */
  num(ref: string): number {
    const r = ref.trim();
    if (isLiteral(r)) return Number(r);
    const { base, member } = this.split(r);
    const t = this.tags.get(base);
    if (!t) throw new LadderError(`Tag ${base} doesn't exist.`);
    if (member === undefined) {
      if (t.def.type === 'DINT' || t.def.type === 'REAL') return t.v as number;
      if (t.def.type === 'BOOL') return t.v ? 1 : 0;
      throw new LadderError(`${ref} is a ${t.def.type}. Use .PRE or .ACC.`);
    }
    const obj = t.v as unknown as Record<string, Value>;
    const m = obj[member];
    if (typeof m === 'number') return m;
    if (typeof m === 'boolean') return m ? 1 : 0;
    throw new LadderError(`${ref}: no member ${member}.`);
  }

  /** The data type a destination would store as. */
  destType(ref: string): 'DINT' | 'REAL' {
    const { base, member } = this.split(ref);
    const t = this.tags.get(base);
    if (!t) throw new LadderError(`Tag ${base} doesn't exist.`);
    if (member !== undefined) return 'DINT'; // .PRE / .ACC are DINT
    if (t.def.type === 'REAL') return 'REAL';
    if (t.def.type === 'DINT') return 'DINT';
    throw new LadderError(`${ref} is a ${t.def.type}; math needs a DINT or REAL destination.`);
  }

  store(ref: string, x: number, truncate = false) {
    const type = this.destType(ref);
    let v: number;
    if (type === 'REAL') v = Math.fround(x);
    else {
      const r = Number.isInteger(x) ? x : truncate ? Math.trunc(x) : roundEven(x);
      const w = int32(r);
      if (w.overflow) this.minorFaults.push(`Overflow storing ${x} into ${ref}`);
      v = w.v;
    }
    const { base, member } = this.split(ref);
    const t = this.tags.get(base)!;
    if (member === undefined) t.v = v;
    else (t.v as unknown as Record<string, Value>)[member] = v;
  }

  timer(ref: string): TimerVal {
    const t = this.tags.get(ref.trim());
    if (!t || t.def.type !== 'TIMER') throw new LadderError(`${ref} must be a TIMER tag.`);
    return t.v as TimerVal;
  }

  counter(ref: string): CounterVal {
    const t = this.tags.get(ref.trim());
    if (!t || t.def.type !== 'COUNTER') throw new LadderError(`${ref} must be a COUNTER tag.`);
    return t.v as CounterVal;
  }

  // ---------- execution ----------

  private exec(ins: Instr, rin: boolean): boolean {
    const a = ins.args;
    switch (ins.op) {
      case 'XIC':
        return rin && this.bit(a[0]);
      case 'XIO':
        return rin && !this.bit(a[0]);
      case 'OTE':
        this.setBit(a[0], rin);
        return rin;
      case 'OTL':
        if (rin) this.setBit(a[0], true);
        return rin;
      case 'OTU':
        if (rin) this.setBit(a[0], false);
        return rin;
      case 'ONS': {
        // Storage bit remembers last scan's rung-condition-in.
        if (!rin) {
          this.setBit(a[0], false);
          return false;
        }
        const stored = this.bit(a[0]);
        this.setBit(a[0], true);
        return !stored;
      }
      case 'TON': {
        const t = this.timer(a[0]);
        if (!rin) {
          t.EN = false;
          t.TT = false;
          t.DN = false;
          t.ACC = 0;
          return rin;
        }
        if (!t.DN) {
          if (!t.EN) {
            // First true scan: start timing; time accumulates from the next scan.
            t.EN = true;
            t.TT = true;
          } else t.ACC += this.dtMs;
          if (t.ACC >= t.PRE) {
            t.ACC = t.PRE;
            t.DN = true;
            t.TT = false;
          }
        }
        t.EN = true;
        return rin;
      }
      case 'TOF': {
        const t = this.timer(a[0]);
        if (rin) {
          t.EN = true;
          t.TT = false;
          t.DN = true;
          t.ACC = 0;
          return rin;
        }
        if (t.DN) {
          if (t.EN) {
            // First false scan: start timing.
            t.EN = false;
            t.TT = true;
          } else t.ACC += this.dtMs;
          if (t.ACC >= t.PRE) {
            t.ACC = t.PRE;
            t.DN = false;
            t.TT = false;
          }
        }
        t.EN = false;
        return rin;
      }
      case 'RTO': {
        const t = this.timer(a[0]);
        if (!rin) {
          // Retentive: ACC and DN are kept.
          t.EN = false;
          t.TT = false;
          return rin;
        }
        if (!t.DN) {
          if (!t.EN) t.TT = true;
          else t.ACC += this.dtMs;
          if (t.ACC >= t.PRE) {
            t.ACC = t.PRE;
            t.DN = true;
            t.TT = false;
          } else t.TT = true;
        }
        t.EN = true;
        return rin;
      }
      case 'CTU': {
        const c = this.counter(a[0]);
        if (rin && !c.CU) {
          if (c.ACC === 2147483647) {
            c.ACC = -2147483648;
            c.OV = true;
          } else c.ACC += 1;
        }
        c.CU = rin;
        c.DN = c.ACC >= c.PRE;
        return rin;
      }
      case 'CTD': {
        const c = this.counter(a[0]);
        if (rin && !c.CD) {
          if (c.ACC === -2147483648) {
            c.ACC = 2147483647;
            c.UN = true;
          } else c.ACC -= 1;
        }
        c.CD = rin;
        c.DN = c.ACC >= c.PRE;
        return rin;
      }
      case 'RES': {
        if (!rin) return rin;
        const t = this.tags.get(a[0]);
        if (!t || (t.def.type !== 'TIMER' && t.def.type !== 'COUNTER')) throw new LadderError(`RES needs a TIMER or COUNTER, not ${a[0]}.`);
        if (t.def.type === 'TIMER') Object.assign(t.v as TimerVal, { ACC: 0, EN: false, TT: false, DN: false });
        else Object.assign(t.v as CounterVal, { ACC: 0, CU: false, CD: false, DN: false, OV: false, UN: false });
        return rin;
      }
      case 'EQU':
        return rin && this.num(a[0]) === this.num(a[1]);
      case 'NEQ':
        return rin && this.num(a[0]) !== this.num(a[1]);
      case 'GRT':
        return rin && this.num(a[0]) > this.num(a[1]);
      case 'LES':
        return rin && this.num(a[0]) < this.num(a[1]);
      case 'GEQ':
        return rin && this.num(a[0]) >= this.num(a[1]);
      case 'LEQ':
        return rin && this.num(a[0]) <= this.num(a[1]);
      case 'MOV':
        if (rin) this.store(a[1], this.num(a[0]));
        return rin;
      case 'ADD':
      case 'SUB':
      case 'MUL':
      case 'DIV': {
        if (!rin) return rin;
        const x = this.num(a[0]);
        const y = this.num(a[1]);
        if (ins.op === 'DIV' && y === 0) {
          this.minorFaults.push(`Divide by zero in DIV(${a.join(',')}). Dest left unchanged.`);
          return rin;
        }
        const r = ins.op === 'ADD' ? x + y : ins.op === 'SUB' ? x - y : ins.op === 'MUL' ? x * y : x / y;
        // Integer DIV into an integer destination truncates; everything else rounds.
        const intDiv = ins.op === 'DIV' && Number.isInteger(x) && Number.isInteger(y) && this.isIntRef(a[0]) && this.isIntRef(a[1]);
        this.store(a[2], r, intDiv);
        return rin;
      }
      default:
        throw new LadderError(`${ins.op} is not an instruction this PLC knows.`);
    }
  }

  private isIntRef(ref: string): boolean {
    const r = ref.trim();
    if (isLiteral(r)) return !/[.eE]/.test(r);
    const { base, member } = this.split(r);
    const t = this.tags.get(base);
    if (!t) return false;
    if (member !== undefined) return true;
    return t.def.type === 'DINT' || t.def.type === 'BOOL';
  }

  private series(series: Series, rin: boolean, ri: number, base: Path): boolean {
    let c = rin;
    series.forEach((e, i) => {
      const path = [...base, i];
      const id = `${ri}.${path.join('.')}`;
      if (isBranch(e)) {
        const cin = c;
        let any = false;
        e.branch.forEach((leg, l) => {
          if (this.series(leg, cin, ri, [...path, l])) any = true;
        });
        c = any;
        this.trace.set(id, { in: cin, out: c });
        return;
      }
      const cin = c;
      c = this.exec(e, cin);
      this.trace.set(id, { in: cin, out: c });
    });
    return c;
  }

  // ---------- the scan ----------

  /** Start a scan: copy the input image into the input tags. dt in seconds. */
  beginScan(dt: number) {
    this.dtMs = Math.round(dt * 1000);
    for (const [tag, v] of this.inputImage) {
      const t = this.tags.get(tag);
      if (!t || t.def.usage !== 'input') continue;
      if (t.def.type === 'BOOL') t.v = v === true || v === 1 || v === 'on';
      else if (t.def.type === 'REAL') t.v = Math.fround(Number(v) || 0);
      else if (t.def.type === 'DINT') t.v = (Number(v) || 0) | 0;
    }
  }

  /** Solve one rung. */
  execRung(ri: number) {
    const r = this.rungs[ri];
    if (!r) return;
    this.trace.set(`${ri}`, { in: true, out: this.series(r.els, true, ri, []) });
  }

  /** Finish a scan: copy output tags into the output image. */
  endScan() {
    for (const [name, t] of this.tags) {
      if (t.def.usage === 'output') this.outputImage.set(name, t.v as Val);
    }
    this.firstScan = false;
    this.scans++;
  }

  scan(dt: number) {
    if (!this.running) return;
    this.beginScan(dt);
    for (let i = 0; i < this.rungs.length; i++) this.execRung(i);
    this.endScan();
  }

  /**
   * Power-up: prescan. Logix keeps every tag's value through a power cycle,
   * then prescan clears OTE outputs, resets TON and TOF timers, and sets ONS
   * and counter storage bits so nothing fires falsely on the first scan.
   * OTL/OTU bits and RTO accumulators are left alone.
   */
  powerUp() {
    this.running = true;
    const walk = (s: Series) =>
      s.forEach((e) => {
        if (isBranch(e)) return e.branch.forEach(walk);
        try {
          this.prescanInstr(e);
        } catch {
          // a bad operand is reported by the verifier, not here
        }
      });
    this.rungs.forEach((r) => walk(r.els));
    this.firstScan = true;
    this.trace.clear();
    for (const k of this.outputImage.keys()) this.outputImage.set(k, false);
  }

  private prescanInstr(ins: Instr) {
    const a = ins.args;
    switch (ins.op) {
      case 'OTE':
        this.setBit(a[0], false);
        break;
      case 'ONS':
        this.setBit(a[0], true);
        break;
      case 'TON':
        Object.assign(this.timer(a[0]), { EN: false, TT: false, DN: false, ACC: 0 });
        break;
      case 'TOF': {
        const t = this.timer(a[0]);
        Object.assign(t, { EN: false, TT: false, DN: false, ACC: t.PRE });
        break;
      }
      case 'RTO':
        Object.assign(this.timer(a[0]), { EN: false, TT: false });
        break;
      case 'CTU':
        this.counter(a[0]).CU = true;
        break;
      case 'CTD':
        this.counter(a[0]).CD = true;
        break;
    }
  }

  powerDown() {
    this.running = false;
    for (const k of this.outputImage.keys()) this.outputImage.set(k, false);
  }

  /** A tag value as a display string or primitive. */
  read(ref: string): Val {
    const t = this.tags.get(ref);
    if (t && (t.def.type === 'BOOL' || t.def.type === 'DINT' || t.def.type === 'REAL')) return t.v as Val;
    try {
      return this.num(ref);
    } catch {
      return '';
    }
  }
}
