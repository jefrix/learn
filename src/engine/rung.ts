// The rung tree shared by relay circuits and ladder programs.
//
// A rung is a series list of elements. An element is an instruction (a contact,
// a coil, a timer...) or a parallel branch whose legs are themselves series lists.
// The text form follows Logix "neutral text":
//
//   XIC(Start)[XIC(Pump),XIO(Fault)]OTE(Pump);
//
// Two additions for relay drawings: a rung may start at a wire number instead of
// the L1 rail ("@19: ..."), and any element may name the wire leaving it ("NO(KA5)@20").

export interface Instr {
  op: string;
  args: string[];
  /** Wire number of the node on the right side of this element (relay drawings). */
  wire?: string;
}

export interface Branch {
  branch: Series[];
  wire?: string;
}

export type El = Instr | Branch;
export type Series = El[];

export interface Rung {
  /** Node the rung starts from. Undefined means the left rail (L1 in relay, power rail in ladder). */
  start?: string;
  els: Series;
  comment?: string;
}

/** Path to an element: [index in rung] or [index, leg, index, leg, index...]. */
export type Path = number[];

export function isBranch(e: El | undefined): e is Branch {
  return !!e && (e as Branch).branch !== undefined;
}

export class RungParseError extends Error {
  constructor(message: string, public at: number) {
    super(message);
  }
}

// ---------- parsing ----------

const NAME = /[A-Za-z_][A-Za-z0-9_]*/y;

class Parser {
  i = 0;
  constructor(public s: string) {}
  ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
  }
  peek() {
    this.ws();
    return this.s[this.i];
  }
  fail(msg: string): never {
    throw new RungParseError(msg, this.i);
  }
  wireLabel(): string | undefined {
    this.ws();
    if (this.s[this.i] !== '@') return undefined;
    this.i++;
    const m = /[A-Za-z0-9_.+-]+/y;
    m.lastIndex = this.i;
    const r = m.exec(this.s);
    if (!r) this.fail('Expected a wire number after @');
    this.i += r[0].length;
    return r[0];
  }
  series(stop: string[]): Series {
    const out: Series = [];
    for (;;) {
      const c = this.peek();
      if (c === undefined || stop.includes(c)) return out;
      if (c === '[') {
        this.i++;
        const legs: Series[] = [this.series([',', ']'])];
        while (this.peek() === ',') {
          this.i++;
          legs.push(this.series([',', ']']));
        }
        if (this.peek() !== ']') this.fail('A branch opened with [ needs a closing ]');
        this.i++;
        const b: Branch = { branch: legs };
        const w = this.wireLabel();
        if (w) b.wire = w;
        out.push(b);
        continue;
      }
      NAME.lastIndex = this.i;
      const m = NAME.exec(this.s);
      if (!m) this.fail(`Unexpected "${c}"`);
      this.i += m[0].length;
      if (this.peek() !== '(') this.fail(`${m[0]} needs its operands in ( )`);
      this.i++;
      const args: string[] = [];
      let cur = '';
      for (;;) {
        const ch = this.s[this.i];
        if (ch === undefined) this.fail(`${m[0]}( is missing its closing )`);
        this.i++;
        if (ch === ')') break;
        if (ch === ',') {
          args.push(cur.trim());
          cur = '';
        } else cur += ch;
      }
      if (cur.trim() !== '' || args.length) args.push(cur.trim());
      const ins: Instr = { op: m[0].toUpperCase(), args };
      const w = this.wireLabel();
      if (w) ins.wire = w;
      out.push(ins);
    }
  }
}

/** Parse one rung (with or without the trailing semicolon). */
export function parseRung(text: string): Rung {
  let s = text.trim();
  if (s.endsWith(';')) s = s.slice(0, -1);
  const rung: Rung = { els: [] };
  const startMatch = /^@([A-Za-z0-9_.+-]+)\s*:/.exec(s);
  let offset = 0;
  if (startMatch) {
    rung.start = startMatch[1];
    offset = startMatch[0].length;
  }
  const p = new Parser(s);
  p.i = offset;
  rung.els = p.series([]);
  p.ws();
  if (p.i < s.length) p.fail(`Unexpected "${s[p.i]}"`);
  return rung;
}

/**
 * Parse many rungs separated by semicolons. Lines starting with // become the
 * comment of the rung that follows.
 */
export function parseRungs(text: string): Rung[] {
  const rungs: Rung[] = [];
  let comment: string[] = [];
  let buf = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('//')) {
      comment.push(line.slice(2).trim());
      continue;
    }
    buf += ' ' + line;
    let idx: number;
    while ((idx = buf.indexOf(';')) >= 0) {
      const chunk = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (chunk === '') continue;
      const r = parseRung(chunk);
      if (comment.length) r.comment = comment.join(' ');
      comment = [];
      rungs.push(r);
    }
  }
  if (buf.trim() !== '') {
    const r = parseRung(buf);
    if (comment.length) r.comment = comment.join(' ');
    rungs.push(r);
  }
  return rungs;
}

// ---------- printing ----------

export function printEl(e: El): string {
  if (isBranch(e)) return '[' + e.branch.map(printSeries).join(',') + ']' + (e.wire ? '@' + e.wire : '');
  return `${e.op}(${e.args.join(',')})` + (e.wire ? '@' + e.wire : '');
}

export function printSeries(s: Series): string {
  return s.map(printEl).join('');
}

export function printRung(r: Rung): string {
  return (r.start ? `@${r.start}: ` : '') + printSeries(r.els) + ';';
}

export function printRungs(rs: Rung[]): string {
  return rs.map((r) => (r.comment ? `// ${r.comment}\n` : '') + printRung(r)).join('\n');
}

// ---------- tree walking and editing (pure, used by the editors) ----------

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

/** Visit every instruction with its path. */
export function forEachInstr(series: Series, fn: (ins: Instr, path: Path) => void, base: Path = []): void {
  series.forEach((e, i) => {
    if (isBranch(e)) e.branch.forEach((leg, l) => forEachInstr(leg, fn, [...base, i, l]));
    else fn(e, [...base, i]);
  });
}

/** The series list that contains the element at `path`, and the element's index in it. */
export function locate(rung: Rung, path: Path): { series: Series; index: number } {
  let series = rung.els;
  for (let k = 0; k < path.length - 1; k += 2) {
    const b = series[path[k]];
    if (!isBranch(b)) throw new Error('Bad path');
    series = b.branch[path[k + 1]];
  }
  return { series, index: path[path.length - 1] };
}

export function getAt(rung: Rung, path: Path): El | undefined {
  const { series, index } = locate(rung, path);
  return series[index];
}

/** Insert before the element at `path` (index may equal the series length to append). */
export function insertAt(rung: Rung, path: Path, el: El): Rung {
  const r = clone(rung);
  const { series, index } = locate(r, path);
  series.splice(index, 0, el);
  return r;
}

export function replaceAt(rung: Rung, path: Path, el: El): Rung {
  const r = clone(rung);
  const { series, index } = locate(r, path);
  series[index] = el;
  return r;
}

/** Remove an element. A branch left with one leg is unwrapped; an empty branch is removed. */
export function removeAt(rung: Rung, path: Path): Rung {
  const r = clone(rung);
  const { series, index } = locate(r, path);
  series.splice(index, 1);
  return tidy(r);
}

/** Wrap elements [from..to] of one series in a branch, adding an empty leg below. */
export function wrapInBranch(rung: Rung, path: Path, count = 1): Rung {
  const r = clone(rung);
  const { series, index } = locate(r, path);
  const taken = series.splice(index, count);
  series.splice(index, 0, { branch: [taken, []] });
  return r;
}

/** Add an empty leg to the branch at `path`. */
export function addLeg(rung: Rung, path: Path): Rung {
  const r = clone(rung);
  const b = getAt(r, path);
  if (isBranch(b)) b.branch.push([]);
  return r;
}

/** Remove a leg of the branch at `path`. */
export function removeLeg(rung: Rung, path: Path, leg: number): Rung {
  const r = clone(rung);
  const b = getAt(r, path);
  if (isBranch(b)) b.branch.splice(leg, 1);
  return tidy(r);
}

function tidySeries(s: Series): Series {
  const out: Series = [];
  for (const e of s) {
    if (isBranch(e)) {
      e.branch = e.branch.map(tidySeries);
      const legs = e.branch;
      if (legs.length === 0 || legs.every((l) => l.length === 0)) continue;
      if (legs.length === 1) {
        out.push(...legs[0]);
        continue;
      }
    }
    out.push(e);
  }
  return out;
}

export function tidy(r: Rung): Rung {
  r.els = tidySeries(r.els);
  return r;
}
