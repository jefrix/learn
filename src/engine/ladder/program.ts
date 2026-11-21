// Loading a ladder program: tag declarations, type inference, verification
// (the "Verify" step in Studio 5000), the duplicate-output lint, and the PLC
// adapter the sim plugs in.
//
// Program text = optional TAG lines, then rungs in neutral text:
//   TAG Level_In REAL        // scaled level, inches
//   TAG Run_Tmr TIMER 5000
//   XIC(Start_PB)[XIC(Pump_Run),...]XIC(Stop_PB)OTE(Pump_Run);

import type { MachineDef } from '../machine';
import { forEachInstr, parseRungs, printRungs, type Rung } from '../rung';
import type { PlcLike } from '../sim';
import type { Val } from '../signals';
import { LadderEngine, LadderError, OPS, isLiteral, type DataType, type TagDef } from './engine';

export interface Analysis {
  tags: TagDef[];
  rungs: Rung[];
  errors: string[];
  warnings: string[];
}

const TYPES: DataType[] = ['BOOL', 'DINT', 'REAL', 'TIMER', 'COUNTER'];

export function splitProgram(text: string): { decls: TagDef[]; body: string; declErrors: string[] } {
  const decls: TagDef[] = [];
  const declErrors: string[] = [];
  const body: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = /^\s*TAG\s+(\S+)\s+(\S+)(?:\s+([-+.\deE]+))?\s*(?:\/\/\s*(.*))?$/i.exec(raw);
    if (m) {
      const type = m[2].toUpperCase() as DataType;
      if (!TYPES.includes(type)) declErrors.push(`TAG ${m[1]}: ${m[2]} is not a data type. Use BOOL, DINT, REAL, TIMER or COUNTER.`);
      else decls.push({ name: m[1], type, usage: 'internal', initial: m[3] !== undefined ? Number(m[3]) : undefined, desc: m[4] });
    } else body.push(raw);
  }
  return { decls, body: body.join('\n'), declErrors };
}

export function joinProgram(decls: TagDef[], rungs: Rung[]): string {
  const lines = decls
    .filter((d) => d.usage === 'internal')
    .map((d) => `TAG ${d.name} ${d.type}${d.initial !== undefined ? ' ' + d.initial : ''}${d.desc ? ' // ' + d.desc : ''}`);
  return [...lines, printRungs(rungs)].filter((x) => x !== '').join('\n');
}

/** The tags a machine's PLC I/O gives you for free. */
export function ioTags(machine: MachineDef): TagDef[] {
  const out: TagDef[] = [];
  for (const p of machine.plc?.inputs ?? []) out.push({ name: p.tag, type: p.type ?? 'BOOL', usage: 'input', desc: p.desc, address: p.address });
  for (const p of machine.plc?.outputs ?? []) out.push({ name: p.tag, type: p.type ?? 'BOOL', usage: 'output', desc: p.desc, address: p.address });
  return out;
}

const BIT_OPS = new Set(['XIC', 'XIO', 'OTE', 'OTL', 'OTU', 'ONS']);
const WRITE_OPS = new Set(['OTE', 'OTL', 'OTU', 'ONS']);
const TIMER_OPS = new Set(['TON', 'TOF', 'RTO']);
const COUNTER_OPS = new Set(['CTU', 'CTD']);
const COMPARE_OPS = new Set(['EQU', 'NEQ', 'GRT', 'LES', 'GEQ', 'LEQ']);
const MATH_OPS = new Set(['ADD', 'SUB', 'MUL', 'DIV']);

export function analyze(text: string, machine: MachineDef): Analysis {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { decls, body, declErrors } = splitProgram(text);
  errors.push(...declErrors);
  let rungs: Rung[] = [];
  try {
    rungs = parseRungs(body);
  } catch (e) {
    errors.push((e as Error).message);
    return { tags: [...ioTags(machine), ...decls], rungs: [], errors, warnings };
  }
  const tags = new Map<string, TagDef>();
  for (const t of ioTags(machine)) tags.set(t.name, t);
  for (const d of decls) {
    if (tags.has(d.name)) errors.push(`${d.name} is already an I/O tag.`);
    else tags.set(d.name, d);
  }
  const inferred = new Map<string, DataType>();
  const typeOf = (name: string) => tags.get(name)?.type ?? inferred.get(name);
  const want = (name: string, type: DataType, where: string) => {
    if (!name || name === '?' || isLiteral(name) || name.startsWith('S:')) return;
    const known = typeOf(name);
    if (known && known !== type) {
      const numericOk = (type === 'DINT' && known === 'REAL') || (type === 'REAL' && known === 'DINT');
      if (!numericOk) errors.push(`${where}: ${name} is a ${known}, but this needs a ${type}.`);
      return;
    }
    if (!known) inferred.set(name, type);
  };
  const base = (ref: string) => ref.split('.')[0];
  const memberType = (ref: string): DataType | null => {
    const m = ref.split('.')[1]?.toUpperCase();
    if (!m) return null;
    if (/^\d+$/.test(m)) return 'DINT';
    if (['CU', 'CD', 'OV', 'UN'].includes(m)) return 'COUNTER';
    if (['EN', 'TT'].includes(m)) return 'TIMER';
    return null; // PRE, ACC, DN: a timer or a counter
  };
  const outputs = new Map<string, number[]>();

  // First pass: the instructions that fix a tag's type outright.
  rungs.forEach((r, ri) =>
    forEachInstr(r.els, (ins) => {
      const where = `Rung ${ri} ${ins.op}`;
      if (TIMER_OPS.has(ins.op) && ins.args[0]) want(ins.args[0], 'TIMER', where);
      if (COUNTER_OPS.has(ins.op) && ins.args[0]) want(ins.args[0], 'COUNTER', where);
    }),
  );

  rungs.forEach((r, ri) =>
    forEachInstr(r.els, (ins) => {
      const where = `Rung ${ri} ${ins.op}`;
      const spec = OPS[ins.op];
      if (!spec) {
        errors.push(`${where}: ${ins.op} is not an instruction this PLC knows.`);
        return;
      }
      const need = TIMER_OPS.has(ins.op) || COUNTER_OPS.has(ins.op) ? 1 : spec.args.length;
      if (ins.args.length < need || ins.args.slice(0, need).some((a) => a === '' || a === '?')) {
        errors.push(`${where}: needs ${spec.args.slice(0, need).join(', ')}.`);
        return;
      }
      const a = ins.args;
      const memberRef = (x: string) => {
        const mt = memberType(x);
        if (mt) want(base(x), mt, where);
        else if (!typeOf(base(x))) inferred.set(base(x), 'TIMER');
      };
      if (BIT_OPS.has(ins.op)) {
        if (a[0].includes('.') && !a[0].startsWith('S:')) memberRef(a[0]);
        else want(a[0], 'BOOL', where);
        if (WRITE_OPS.has(ins.op) && tags.get(base(a[0]))?.usage === 'input') errors.push(`${where}: ${a[0]} is an input. The PLC can't write to it; the field device sets it.`);
        if (ins.op === 'OTE') {
          if (!outputs.has(a[0])) outputs.set(a[0], []);
          outputs.get(a[0])!.push(ri);
        }
      } else if (ins.op === 'RES') {
        if (!typeOf(a[0])) inferred.set(a[0], 'TIMER');
        else if (!['TIMER', 'COUNTER'].includes(typeOf(a[0]) as string)) errors.push(`${where}: RES needs a TIMER or COUNTER.`);
      } else if (COMPARE_OPS.has(ins.op) || MATH_OPS.has(ins.op) || ins.op === 'MOV') {
        a.forEach((x, i) => {
          if (isLiteral(x)) return;
          if (x.includes('.')) return memberRef(x);
          const isDest = (ins.op === 'MOV' && i === 1) || (MATH_OPS.has(ins.op) && i === 2);
          if (isDest && tags.get(x)?.usage === 'input') errors.push(`${where}: ${x} is an input; it can't be a destination.`);
          const t = typeOf(x);
          if (t === 'BOOL' || t === 'TIMER' || t === 'COUNTER') errors.push(`${where}: ${x} is a ${t}; this needs a number (DINT or REAL).`);
          else want(x, t ?? 'DINT', where);
        });
      }
    }),
  );
  for (const [name, type] of inferred) if (!tags.has(name)) tags.set(name, { name, type, usage: 'internal' });
  // Presets written in the instruction set the tag's starting .PRE.
  rungs.forEach((r) =>
    forEachInstr(r.els, (ins) => {
      if ((TIMER_OPS.has(ins.op) || COUNTER_OPS.has(ins.op)) && ins.args[1] && isLiteral(ins.args[1])) {
        const t = tags.get(ins.args[0]);
        if (t) t.initial = Number(ins.args[1]);
      }
    }),
  );
  for (const [tag, list] of outputs) {
    if (list.length > 1) warnings.push(`${tag} is written by OTE on rungs ${list.join(' and ')}. Only the last one counts: it overwrites the earlier rung every scan.`);
  }
  return { tags: [...tags.values()], rungs, errors, warnings };
}

export class ProgramError extends Error {
  constructor(public problems: string[]) {
    super(problems.join('\n'));
  }
}

/** The PLC as the sim sees it: I/O by tag name, with scan and power events. */
export class LadderPlc implements PlcLike {
  engine: LadderEngine;
  /** A major fault stops the program; outputs turn off. */
  fault: string | null = null;

  constructor(public analysis: Analysis) {
    this.engine = new LadderEngine(analysis.tags, analysis.rungs);
  }

  reload(a: Analysis) {
    this.analysis = a;
    this.engine.load(a.tags, a.rungs);
    this.fault = null;
    this.engine.running = true;
  }

  writeInput(tag: string, v: Val) {
    this.engine.inputImage.set(tag, v);
  }
  readOutput(tag: string): Val {
    return this.fault ? false : this.engine.outputImage.get(tag) ?? false;
  }
  scan(dt: number) {
    if (this.fault) return;
    try {
      this.engine.scan(dt);
    } catch (e) {
      this.fault = e instanceof LadderError ? e.message : String(e);
      this.engine.powerDown();
    }
  }
  powerUp() {
    this.fault = null;
    this.engine.powerUp();
  }
  powerDown() {
    this.engine.powerDown();
  }
}

/** Build a PLC from program text, or throw with the verification errors. */
export function buildPlc(text: string, machine: MachineDef): LadderPlc {
  const a = analyze(text, machine);
  if (a.errors.length) throw new ProgramError(a.errors);
  return new LadderPlc(a);
}
