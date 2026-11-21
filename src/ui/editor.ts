// The rung editor, shared by relay circuits and ladder programs.
// Mouse: tap an element to select it, tap a + to insert. Touch works the same.
// Keyboard: arrows move, Delete removes, B wraps in a branch, letters start
// typing an instruction ("XIC Start_PB"), Enter opens the selected element.

import { clear, h, s } from './dom';
import {
  addLeg,
  clone,
  getAt,
  insertAt,
  isBranch,
  parseRung,
  parseRungs,
  printRungs,
  removeAt,
  removeLeg,
  replaceAt,
  wrapInBranch,
  type El,
  type Instr,
  type Path,
  type Rung,
  type Series,
} from '../engine/rung';

export const CW = 92; // cell width
export const CH = 84; // cell height
export const WY = 46; // wire height inside a cell
const PADX = 14; // branch rail inset
const GUTTER = 44; // rung number column
const RAIL = 14;

export interface ArgSpec {
  name: string;
  kind: 'tag' | 'number' | 'choice' | 'text';
  choices?: string[];
  /** Hint text for the input. */
  hint?: string;
}

export interface PaletteItem {
  op: string;
  label: string;
  group: string;
  args: string[];
}

export interface Probe {
  kind: 'in' | 'out';
  ri: number;
  path: Path;
}

/** What an engine has to provide so the editor can draw and edit its rungs. */
export interface Kit {
  engine: 'relay' | 'ladder';
  size(ins: Instr): [number, number];
  draw(ins: Instr, ri: number, path: Path): SVGGElement;
  /** Relay loads end their line at N; ladder outputs don't. */
  terminates(ins: Instr): boolean;
  palette(): PaletteItem[];
  argSpec(ins: Instr): ArgSpec[];
  tagChoices(ins: Instr, arg: number): string[];
  /** Live power at a probe point. */
  probe(p: Probe): boolean;
  /** Is this instruction closed / true right now? */
  active(ri: number, path: Path): boolean;
  /** Live text inside an element (timer accumulators, compare values). */
  liveText?(ins: Instr, ri: number, path: Path): Record<string, string>;
  /** Help card id for an instruction. */
  helpFor(ins: Instr): string;
  describe(ins: Instr): string;
  /** Meter reading at a probe point (relay only). */
  meter?(p: Probe): string;
  /** Right-rail label (N or nothing). */
  rails: { left: string; right: string };
}

type Sel = { ri: number; path: Path } | { ri: number; rung: true } | null;

interface LiveRef {
  el: SVGElement;
  probe?: Probe;
  active?: { ri: number; path: Path };
  text?: { key: string; ins: Instr; ri: number; path: Path };
}

interface Opts {
  kit: Kit;
  rungs: Rung[];
  /** Rungs before this index are drawn locked (hardwired). */
  locked: number;
  editable: boolean | 'presets';
  onChange?: (rungs: Rung[]) => void;
  onHelp?: (id: string) => void;
  onRepair?: (target: string) => void;
  /** Extra buttons in the inspector for a device tag. */
  meterOn?: () => boolean;
}

export class RungEditor {
  root: HTMLElement;
  private svgWrap: HTMLElement;
  private inspector: HTMLElement;
  private textBox: HTMLElement;
  private refs: LiveRef[] = [];
  sel: Sel = null;
  private history: string[] = [];
  private future: string[] = [];
  rungs: Rung[];

  constructor(public o: Opts) {
    this.rungs = clone(o.rungs);
    this.svgWrap = h('div', { class: 'ladder-scroll', tabindex: '0', 'aria-label': 'Rung editor. Arrow keys move, Delete removes, letters type an instruction.' });
    this.inspector = h('div', { class: 'inspector', 'aria-live': 'polite' });
    this.textBox = h('div', { class: 'textbox', hidden: true });
    const tools = this.toolbar();
    this.root = h('div', { class: 'editor' }, tools, this.svgWrap, this.textBox, this.inspector);
    this.svgWrap.addEventListener('keydown', (e) => this.onKey(e));
    this.render();
  }

  private get canEdit() {
    return this.o.editable === true;
  }

  private toolbar() {
    if (!this.canEdit) return h('div', { class: 'editor-tools' }, h('span', { class: 'muted small' }, this.o.editable === 'presets' ? 'Locked drawing. You can change timer settings.' : 'Locked drawing: read it, run it, measure it.'));
    return h(
      'div',
      { class: 'editor-tools' },
      h('button', { class: 'btn small', onclick: () => this.addRung() }, '+ Rung'),
      h('button', { class: 'btn small', onclick: () => this.undo(), title: 'Undo (Ctrl+Z)' }, 'Undo'),
      h('button', { class: 'btn small', onclick: () => this.redo(), title: 'Redo (Ctrl+Y)' }, 'Redo'),
      h('button', { class: 'btn small', onclick: () => this.toggleText(), title: 'Edit every rung as text' }, 'Text'),
    );
  }

  // ---------- edits ----------

  private commit(next: Rung[]) {
    this.history.push(printRungs(this.rungs));
    if (this.history.length > 100) this.history.shift();
    this.future = [];
    this.rungs = next;
    this.render();
    this.o.onChange?.(this.rungs);
  }

  undo() {
    const prev = this.history.pop();
    if (prev === undefined) return;
    this.future.push(printRungs(this.rungs));
    this.rungs = parseRungs(prev);
    this.sel = null;
    this.render();
    this.o.onChange?.(this.rungs);
  }

  redo() {
    const nxt = this.future.pop();
    if (nxt === undefined) return;
    this.history.push(printRungs(this.rungs));
    this.rungs = parseRungs(nxt);
    this.render();
    this.o.onChange?.(this.rungs);
  }

  setRungs(r: Rung[]) {
    this.rungs = clone(r);
    this.sel = null;
    this.render();
  }

  private editRung(ri: number, fn: (r: Rung) => Rung) {
    const next = clone(this.rungs);
    next[ri] = fn(next[ri]);
    this.commit(next);
  }

  addRung() {
    const next = clone(this.rungs);
    next.push({ els: [] });
    this.sel = { ri: next.length - 1, rung: true };
    this.commit(next);
    this.openPalette(next.length - 1, [0]);
  }

  private insert(ri: number, path: Path, el: El) {
    this.editRung(ri, (r) => insertAt(r, path, el));
    this.sel = { ri, path };
    this.render();
    this.showInspector();
  }

  // ---------- layout and drawing ----------

  private layout(series: Series, x0: number, y0: number, base: Path, ri: number, g: SVGGElement, rungIn: Probe | null): { w: number; h: number; terminal: boolean; ends: { x: number; y: number; probe: Probe | null }[] } {
    const { kit } = this.o;
    const cy = y0 + WY;
    let x = x0;
    let hMax = CH;
    let prev: Probe | null = rungIn;
    const railEnds: { x: number; y: number; probe: Probe | null }[] = [];
    const editable = this.canEdit && ri >= this.o.locked;

    const gap = (gx: number, gy: number, path: Path) => {
      if (!editable || !this.isSelRung(ri)) return;
      const b = s('g', { class: 'gap', transform: `translate(${gx},${gy})`, role: 'button', tabindex: '-1', 'aria-label': 'Insert here' });
      b.appendChild(s('circle', { r: 13 }));
      b.appendChild(s('path', { d: 'M-6 0H6M0 -6V6' }));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPalette(ri, path);
      });
      g.appendChild(b);
    };
    const wire = (x1: number, y1: number, x2: number, y2: number, probe: Probe | null) => {
      const l = s('line', { x1, y1, x2, y2, class: 'wire' });
      g.appendChild(l);
      if (probe) this.refs.push({ el: l, probe });
      if (probe && kit.meter) {
        l.addEventListener('click', (e) => {
          if (!this.o.meterOn?.()) return;
          e.stopPropagation();
          this.meterRead(probe);
        });
      }
    };

    if (series.length === 0) {
      const w = CW * 0.6;
      wire(x, cy, x + w, cy, prev);
      gap(x + w / 2, cy, [...base, 0]);
      return { w, h: CH, terminal: false, ends: [] };
    }

    let terminal = false;
    series.forEach((e, i) => {
      const path = [...base, i];
      const gapX = x;
      if (isBranch(e)) {
        let yy = y0;
        const legs: { y: number; w: number; terminal: boolean }[] = [];
        const inner = s('g', {});
        const legProbe: Probe = { kind: 'in', ri, path };
        const legEnds: { x: number; y: number; probe: Probe | null }[] = [];
        for (let l = 0; l < e.branch.length; l++) {
          const r = this.layout(e.branch[l], x + PADX, yy, [...path, l], ri, inner, legProbe);
          legs.push({ y: yy + WY, w: r.w, terminal: r.terminal });
          legEnds.push(...r.ends);
          yy += r.h;
        }
        const bw = Math.max(...legs.map((l) => l.w)) + 2 * PADX;
        const outProbe: Probe = { kind: 'out', ri, path };
        // left rail of the branch and each leg's lead-in
        wire(x, cy, x, legs[legs.length - 1].y, legProbe);
        legs.forEach((l) => wire(x, l.y, x + PADX, l.y, legProbe));
        const joining = legs.filter((l) => !l.terminal);
        legs.forEach((l, li) => {
          if (l.terminal) return;
          const legOut: Probe = e.branch[li].length ? { kind: 'out', ri, path: [...path, li, e.branch[li].length - 1] } : legProbe;
          wire(x + PADX + l.w, l.y, x + bw, l.y, legOut);
        });
        if (joining.length > 1) wire(x + bw, joining[0].y, x + bw, joining[joining.length - 1].y, outProbe);
        g.appendChild(inner);
        railEnds.push(...legEnds);
        gap(gapX, cy, path);
        // a selectable handle for the branch itself
        if (editable && this.isSelRung(ri)) {
          const hnd = s('rect', { x: x - 6, y: cy - 6, width: 12, height: 12, class: 'branch-handle' + (this.isSel(ri, path) ? ' sel' : ''), rx: 2 });
          hnd.addEventListener('click', (ev) => {
            ev.stopPropagation();
            this.select({ ri, path });
          });
          g.appendChild(hnd);
        }
        hMax = Math.max(hMax, yy - y0);
        x += bw;
        terminal = joining.length === 0;
        prev = terminal ? null : outProbe;
        if (terminal) {
          // every leg ended in a load: they run to the right rail
        }
        return;
      }
      const [cw, ch] = kit.size(e);
      const w = cw * CW;
      const el = kit.draw(e, ri, path);
      el.setAttribute('transform', `translate(${x},${y0})`);
      el.classList.add('ins');
      if (this.isSel(ri, path)) el.classList.add('sel');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', kit.describe(e));
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.select({ ri, path });
      });
      // the element's own wire stubs carry its in/out state
      el.querySelectorAll('[data-side]').forEach((n) => {
        const side = n.getAttribute('data-side') === 'in' ? 'in' : 'out';
        this.refs.push({ el: n as SVGElement, probe: { kind: side, ri, path } });
      });
      el.querySelectorAll('[data-live]').forEach((n) => this.refs.push({ el: n as SVGElement, text: { key: n.getAttribute('data-live') as string, ins: e, ri, path } }));
      this.refs.push({ el, active: { ri, path } });
      g.appendChild(el);
      gap(gapX, cy, path);
      hMax = Math.max(hMax, ch * CH);
      x += w;
      if (kit.terminates(e)) {
        terminal = true;
        railEnds.push({ x, y: cy, probe: null });
        prev = null;
      } else prev = { kind: 'out', ri, path };
    });
    if (!terminal) gap(x, cy, [...base, series.length]);
    return { w: x - x0, h: hMax, terminal, ends: railEnds };
  }

  private isSelRung(ri: number) {
    return !!this.sel && this.sel.ri === ri;
  }
  private isSel(ri: number, path: Path) {
    return !!this.sel && 'path' in this.sel && this.sel.ri === ri && this.sel.path.join('.') === path.join('.');
  }

  render() {
    const { kit } = this.o;
    this.refs = [];
    clear(this.svgWrap);
    const groups: { g: SVGGElement; h: number; w: number; ends: { x: number; y: number }[]; terminal: boolean; ri: number; endX: number; comment?: string }[] = [];
    this.rungs.forEach((r, ri) => {
      const g = s('g', { class: 'rung' + (ri < this.o.locked ? ' locked' : '') + (this.isSelRung(ri) ? ' rung-sel' : '') });
      const startProbe: Probe | null = r.els.length ? { kind: 'in', ri, path: [0] } : null;
      const res = this.layout(r.els, GUTTER + RAIL, 0, [], ri, g, startProbe);
      // lead-in from the left rail is drawn by the first element's stub
      groups.push({ g, h: res.h, w: res.w, ends: res.ends, terminal: res.terminal, ri, endX: GUTTER + RAIL + res.w, comment: r.comment });
    });
    const maxW = Math.max(CW * 6, ...groups.map((g) => g.w + CW * 0.5));
    const rightX = GUTTER + RAIL + maxW;
    let y = 10;
    const svg = s('svg', { class: 'ladder', role: 'group' });
    const rails = s('g', {});
    svg.appendChild(rails);
    for (const gr of groups) {
      const r = this.rungs[gr.ri];
      if (r.comment) {
        const txt = s('text', { x: GUTTER + RAIL + 4, y: y + 14, class: 'rung-comment' }, r.comment);
        svg.appendChild(txt);
        y += 22;
      }
      gr.g.setAttribute('transform', `translate(0,${y})`);
      // rung number / start node
      const label = r.start ? r.start : String(gr.ri);
      const num = s('text', { x: 6, y: WY + 5, class: 'rung-num' }, label);
      num.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select({ ri: gr.ri, rung: true });
      });
      gr.g.insertBefore(num, gr.g.firstChild);
      if (r.start) gr.g.insertBefore(s('line', { x1: GUTTER - 6, y1: WY, x2: GUTTER + RAIL, y2: WY, class: 'wire start-stub' }), gr.g.firstChild);
      // wires from terminal ends to the right rail
      for (const e of gr.ends) {
        const l = s('line', { x1: e.x, y1: e.y, x2: rightX, y2: e.y, class: 'wire to-rail' });
        gr.g.appendChild(l);
      }
      if (!gr.terminal && this.rungs[gr.ri].els.length) {
        const last = this.rungs[gr.ri].els;
        const lastWire = (last[last.length - 1] as { wire?: string }).wire;
        if (lastWire) gr.g.appendChild(s('text', { x: gr.endX + 4, y: WY - 6, class: 'wire-num' }, lastWire));
        else if (kit.engine === 'ladder') {
          const l = s('line', { x1: gr.endX, y1: WY, x2: rightX, y2: WY, class: 'wire' });
          gr.g.appendChild(l);
          this.refs.push({ el: l, probe: { kind: 'out', ri: gr.ri, path: [last.length - 1] } });
        } else {
          gr.g.appendChild(s('line', { x1: gr.endX, y1: WY, x2: rightX, y2: WY, class: 'wire short' }));
        }
      }
      if (this.rungs[gr.ri].els.length === 0) {
        gr.g.appendChild(s('text', { x: GUTTER + RAIL + 40, y: WY + 5, class: 'muted-svg' }, this.canEdit ? 'Empty rung: tap + to add' : ''));
      }
      svg.appendChild(gr.g);
      y += gr.h + 8;
    }
    const totalH = y + 40;
    rails.appendChild(s('line', { x1: GUTTER + RAIL / 2, y1: 0, x2: GUTTER + RAIL / 2, y2: totalH - 30, class: 'rail' }));
    rails.appendChild(s('line', { x1: rightX, y1: 0, x2: rightX, y2: totalH - 30, class: 'rail' }));
    rails.appendChild(s('text', { x: GUTTER - 2, y: totalH - 12, class: 'rail-label' }, kit.rails.left));
    rails.appendChild(s('text', { x: rightX - 6, y: totalH - 12, class: 'rail-label' }, kit.rails.right));
    svg.setAttribute('width', String(rightX + 30));
    svg.setAttribute('height', String(totalH));
    svg.setAttribute('viewBox', `0 0 ${rightX + 30} ${totalH}`);
    svg.addEventListener('click', () => this.select(null));
    this.svgWrap.appendChild(svg);
    this.refresh();
    this.showInspector();
  }

  /** Update power flow and live values; call every animation frame. */
  refresh() {
    const { kit } = this.o;
    const texts = new Map<string, Record<string, string>>();
    for (const r of this.refs) {
      if (r.probe) r.el.classList.toggle('live', kit.probe(r.probe));
      if (r.active) r.el.classList.toggle('on', kit.active(r.active.ri, r.active.path));
      if (r.text && kit.liveText) {
        const k = r.text.ri + ':' + r.text.path.join('.');
        let t = texts.get(k);
        if (!t) {
          t = kit.liveText(r.text.ins, r.text.ri, r.text.path);
          texts.set(k, t);
        }
        const v = t[r.text.key] ?? '';
        if (r.el.textContent !== v) r.el.textContent = v;
      }
    }
  }

  // ---------- selection, inspector, palette ----------

  select(sel: Sel) {
    const rungChanged = (sel?.ri ?? -1) !== (this.sel?.ri ?? -1);
    this.sel = sel;
    if (rungChanged) this.render();
    else {
      this.svgWrap.querySelectorAll('.ins.sel, .branch-handle.sel').forEach((n) => n.classList.remove('sel'));
      this.render();
    }
    this.svgWrap.focus({ preventScroll: true });
  }

  private meterRead(p: Probe) {
    const msg = this.o.kit.meter?.(p) ?? '';
    this.inspector.replaceChildren(h('div', { class: 'meter-read' }, h('strong', {}, 'Meter: '), msg));
  }

  private showInspector() {
    const box = this.inspector;
    clear(box);
    const sel = this.sel;
    if (!sel) {
      box.appendChild(h('p', { class: 'muted small' }, this.canEdit ? 'Tap an element to edit it, or tap a rung number to work on that rung.' : 'Tap an element to read about it.'));
      return;
    }
    const locked = sel.ri < this.o.locked || !this.canEdit;
    if ('rung' in sel) {
      if (locked) return;
      const r = this.rungs[sel.ri];
      box.appendChild(
        h(
          'div',
          { class: 'insp-row' },
          h('strong', {}, `Rung ${sel.ri}`),
          h('button', { class: 'btn small', onclick: () => this.moveRung(sel.ri, -1), disabled: sel.ri <= this.o.locked }, 'Move up'),
          h('button', { class: 'btn small', onclick: () => this.moveRung(sel.ri, 1), disabled: sel.ri >= this.rungs.length - 1 }, 'Move down'),
          h('button', { class: 'btn small', onclick: () => this.openPalette(sel.ri, [r.els.length]) }, 'Add to end'),
          h('button', { class: 'btn small', onclick: () => this.editRungText(sel.ri) }, 'Edit as text'),
          h('button', { class: 'btn small', onclick: () => this.editComment(sel.ri) }, 'Comment'),
          h('button', { class: 'btn small danger', onclick: () => this.deleteRung(sel.ri) }, 'Delete rung'),
        ),
      );
      return;
    }
    const el = getAt(this.rungs[sel.ri], sel.path);
    if (!el) return;
    if (isBranch(el)) {
      if (locked) return;
      box.appendChild(
        h(
          'div',
          { class: 'insp-row' },
          h('strong', {}, 'Branch'),
          h('button', { class: 'btn small', onclick: () => this.editRung(sel.ri, (r) => addLeg(r, sel.path)) }, 'Add leg'),
          el.branch.map((_, l) => h('button', { class: 'btn small', onclick: () => this.editRung(sel.ri, (r) => removeLeg(r, sel.path, l)) }, `Remove leg ${l + 1}`)),
          h('button', { class: 'btn small danger', onclick: () => this.remove() }, 'Delete branch'),
        ),
      );
      return;
    }
    const { kit } = this.o;
    const specs = kit.argSpec(el);
    const row = h('div', { class: 'insp-row' }, h('strong', { class: 'mono' }, el.op), h('span', { class: 'muted small' }, kit.describe(el)));
    box.appendChild(row);
    const fields = h('div', { class: 'insp-fields' });
    specs.forEach((sp, i) => {
      const id = `arg-${sel.ri}-${sel.path.join('-')}-${i}`;
      const val = el.args[i] ?? '';
      const presetOnly = this.o.editable === 'presets' && sp.kind === 'number' && el.op === 'TMR';
      const disabled = locked && !presetOnly;
      let input: HTMLInputElement | HTMLSelectElement;
      if (sp.kind === 'choice') {
        input = h('select', { id, disabled }, (sp.choices ?? []).map((c) => h('option', { value: c, selected: c === val }, c)));
      } else {
        input = h('input', { id, value: val, disabled, inputmode: sp.kind === 'number' ? 'decimal' : 'text', autocomplete: 'off', spellcheck: 'false', list: sp.kind === 'tag' ? id + '-list' : undefined, placeholder: sp.hint ?? '' });
      }
      input.addEventListener('change', () => {
        const ins = clone(el) as Instr;
        ins.args[i] = input.value.trim();
        this.editRung(sel.ri, (r) => replaceAt(r, sel.path, ins));
      });
      const choices = sp.kind === 'tag' ? kit.tagChoices(el, i) : [];
      fields.appendChild(
        h('label', { for: id, class: 'field' }, h('span', {}, sp.name), input, sp.kind === 'tag' ? h('datalist', { id: id + '-list' }, choices.map((c) => h('option', { value: c }))) : null),
      );
    });
    box.appendChild(fields);
    const acts = h('div', { class: 'insp-row' });
    acts.appendChild(h('button', { class: 'btn small', onclick: () => this.o.onHelp?.(kit.helpFor(el)) }, 'Help card'));
    if (this.o.onRepair && el.args[0] && el.op !== 'WIRE') {
      acts.appendChild(h('button', { class: 'btn small', onclick: () => this.o.onRepair?.(el.args[0]) }, `Inspect and repair ${el.args[0]}`));
    }
    if (!locked) {
      acts.appendChild(h('button', { class: 'btn small', onclick: () => this.wrap() }, 'Branch around it'));
      acts.appendChild(h('button', { class: 'btn small', onclick: () => this.nudge(-1) }, '◀ Move'));
      acts.appendChild(h('button', { class: 'btn small', onclick: () => this.nudge(1) }, 'Move ▶'));
      acts.appendChild(h('button', { class: 'btn small danger', onclick: () => this.remove() }, 'Delete'));
    }
    box.appendChild(acts);
  }

  openPalette(ri: number, path: Path) {
    const { kit } = this.o;
    const items = kit.palette();
    const groups = [...new Set(items.map((i) => i.group))];
    const box = this.inspector;
    clear(box);
    box.appendChild(h('div', { class: 'insp-row' }, h('strong', {}, 'Insert'), h('button', { class: 'btn small', onclick: () => this.showInspector() }, 'Cancel')));
    for (const g of groups) {
      box.appendChild(
        h(
          'div',
          { class: 'palette-group' },
          h('span', { class: 'palette-label' }, g),
          items
            .filter((i) => i.group === g)
            .map((i) =>
              h('button', { class: 'btn palette-btn', title: i.label, onclick: () => this.insert(ri, path, { op: i.op, args: [...i.args] }) }, h('span', { class: 'mono' }, i.op), h('span', { class: 'small' }, i.label)),
            ),
          g === groups[0] ? h('button', { class: 'btn palette-btn', onclick: () => this.insert(ri, path, { branch: [[], []] }) }, h('span', { class: 'mono' }, '[ , ]'), h('span', { class: 'small' }, 'Parallel branch')) : null,
        ),
      );
    }
    box.appendChild(this.typeBox(ri, path));
  }

  private typeBox(ri: number, path: Path, initial = '') {
    const input = h('input', { class: 'mono type-ins', value: initial, placeholder: this.o.kit.engine === 'ladder' ? 'or type: XIC Start_PB' : 'or type: NO KM1', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Type an instruction' });
    const err = h('span', { class: 'err small' });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const txt = input.value.trim();
        if (!txt) return;
        try {
          const norm = /\(/.test(txt) || /\[/.test(txt) ? txt : txt.replace(/^(\w+)\s+(.*)$/, (_, op, rest) => `${op}(${String(rest).trim().split(/[\s,]+/).join(',')})`).replace(/^(\w+)$/, '$1()');
          const els = parseRung(norm).els;
          let r = this.rungs[ri];
          els.forEach((el, k) => {
            const p = [...path];
            p[p.length - 1] += k;
            r = insertAt(r, p, el);
          });
          const next = clone(this.rungs);
          next[ri] = r;
          const p = [...path];
          p[p.length - 1] += els.length - 1;
          this.sel = { ri, path: p };
          this.commit(next);
        } catch (ex) {
          err.textContent = (ex as Error).message;
        }
      } else if (e.key === 'Escape') this.showInspector();
    });
    setTimeout(() => {
      if (initial) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
    return h('div', { class: 'insp-row' }, input, err);
  }

  private wrap() {
    const sel = this.sel;
    if (!sel || !('path' in sel)) return;
    this.editRung(sel.ri, (r) => wrapInBranch(r, sel.path));
    this.sel = { ri: sel.ri, path: sel.path };
    this.render();
  }

  private remove() {
    const sel = this.sel;
    if (!sel || !('path' in sel)) return;
    this.sel = { ri: sel.ri, rung: true };
    this.editRung(sel.ri, (r) => removeAt(r, sel.path));
  }

  private nudge(d: number) {
    const sel = this.sel;
    if (!sel || !('path' in sel)) return;
    const idx = sel.path[sel.path.length - 1];
    const el = getAt(this.rungs[sel.ri], sel.path);
    if (!el) return;
    const np = [...sel.path];
    np[np.length - 1] = idx + d;
    let r = removeAt(this.rungs[sel.ri], sel.path);
    try {
      r = insertAt(r, np[np.length - 1] < 0 ? sel.path : np, el);
    } catch {
      return;
    }
    const next = clone(this.rungs);
    next[sel.ri] = r;
    this.sel = { ri: sel.ri, path: np[np.length - 1] < 0 ? sel.path : np };
    this.commit(next);
  }

  private moveRung(ri: number, d: number) {
    const j = ri + d;
    if (j < this.o.locked || j >= this.rungs.length) return;
    const next = clone(this.rungs);
    [next[ri], next[j]] = [next[j], next[ri]];
    this.sel = { ri: j, rung: true };
    this.commit(next);
  }

  private deleteRung(ri: number) {
    const next = clone(this.rungs);
    next.splice(ri, 1);
    this.sel = null;
    this.commit(next);
  }

  private editComment(ri: number) {
    const c = prompt('Rung comment', this.rungs[ri].comment ?? '');
    if (c === null) return;
    this.editRung(ri, (r) => ({ ...r, comment: c.trim() || undefined }));
  }

  private editRungText(ri: number) {
    const box = this.inspector;
    clear(box);
    const ta = h('textarea', { class: 'mono rung-text', rows: 3, spellcheck: 'false' }, printRungs([{ ...this.rungs[ri], comment: undefined }]));
    const err = h('div', { class: 'err small' });
    box.appendChild(h('label', { class: 'field' }, h('span', {}, `Rung ${ri} as text`), ta));
    box.appendChild(
      h(
        'div',
        { class: 'insp-row' },
        h('button', {
          class: 'btn small primary',
          onclick: () => {
            try {
              const r = parseRung(ta.value);
              r.comment = this.rungs[ri].comment;
              const next = clone(this.rungs);
              next[ri] = r;
              this.commit(next);
            } catch (e) {
              err.textContent = (e as Error).message;
            }
          },
        }, 'Apply'),
        h('button', { class: 'btn small', onclick: () => this.showInspector() }, 'Cancel'),
        err,
      ),
    );
    ta.focus();
  }

  private toggleText() {
    const box = this.textBox;
    if (!box.hidden) {
      box.hidden = true;
      return;
    }
    clear(box);
    const editable = this.rungs.slice(this.o.locked);
    const ta = h('textarea', { class: 'mono program-text', rows: Math.min(18, editable.length * 2 + 3), spellcheck: 'false' }, printRungs(editable));
    const err = h('div', { class: 'err small' });
    box.appendChild(h('p', { class: 'small muted' }, 'One rung per semicolon. Lines starting with // are rung comments.'));
    box.appendChild(ta);
    box.appendChild(
      h(
        'div',
        { class: 'insp-row' },
        h('button', {
          class: 'btn small primary',
          onclick: () => {
            try {
              const parsed = parseRungs(ta.value);
              this.commit([...this.rungs.slice(0, this.o.locked), ...parsed]);
              box.hidden = true;
            } catch (e) {
              err.textContent = (e as Error).message;
            }
          },
        }, 'Apply text'),
        h('button', { class: 'btn small', onclick: () => (box.hidden = true) }, 'Close'),
        err,
      ),
    );
    box.hidden = false;
    ta.focus();
  }

  // ---------- keyboard ----------

  private flatPaths(ri: number): Path[] {
    const out: Path[] = [];
    const walk = (series: Series, base: Path) =>
      series.forEach((e, i) => {
        out.push([...base, i]);
        if (isBranch(e)) e.branch.forEach((leg, l) => walk(leg, [...base, i, l]));
      });
    walk(this.rungs[ri]?.els ?? [], []);
    return out;
  }

  private onKey(e: KeyboardEvent) {
    const sel = this.sel;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      this.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }
    if (e.target !== this.svgWrap) return;
    if (!sel) {
      if (['ArrowDown', 'ArrowRight', 'Enter'].includes(e.key) && this.rungs.length) {
        e.preventDefault();
        this.select({ ri: Math.max(0, this.o.locked > 0 && this.canEdit ? this.o.locked : 0), rung: true });
      }
      return;
    }
    const ri = sel.ri;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const j = Math.max(0, Math.min(this.rungs.length - 1, ri + (e.key === 'ArrowUp' ? -1 : 1)));
      this.select({ ri: j, rung: true });
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const paths = this.flatPaths(ri);
      if (!paths.length) return;
      const cur = 'path' in sel ? paths.findIndex((p) => p.join('.') === sel.path.join('.')) : -1;
      const nxt = e.key === 'ArrowRight' ? Math.min(paths.length - 1, cur + 1) : Math.max(0, cur - 1);
      this.select({ ri, path: paths[nxt] });
      return;
    }
    if (!this.canEdit || ri < this.o.locked) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if ('path' in sel) this.remove();
      else this.deleteRung(ri);
      return;
    }
    if (e.key.toLowerCase() === 'b' && 'path' in sel && !e.ctrlKey) {
      e.preventDefault();
      this.wrap();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      (this.inspector.querySelector('input,select') as HTMLElement | null)?.focus();
      return;
    }
    if (e.key === 'Insert' || (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey)) {
      e.preventDefault();
      const at: Path = 'path' in sel ? [...sel.path.slice(0, -1), sel.path[sel.path.length - 1] + 1] : [this.rungs[ri].els.length];
      clear(this.inspector);
      this.inspector.appendChild(h('div', { class: 'small muted' }, 'Type an instruction and press Enter. Esc cancels.'));
      this.inspector.appendChild(this.typeBox(ri, at, e.key === 'Insert' ? '' : e.key.toUpperCase()));
    }
  }
}
