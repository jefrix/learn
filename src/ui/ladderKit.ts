// Ladder symbols in the Allen-Bradley style: -] [-, -]/[-, -( )-, and boxes for
// timers, counters, compares and math, with live values like Studio 5000's
// online view.

import { s } from './dom';
import { CH, CW, WY, type ArgSpec, type Kit, type PaletteItem, type Probe } from './editor';
import type { Instr, Path } from '../engine/rung';
import { OPS, isLiteral, type TagDef } from '../engine/ladder/engine';
import type { LadderPlc } from '../engine/ladder/program';

const BOX3 = new Set(['TON', 'TOF', 'RTO', 'CTU', 'CTD', 'ADD', 'SUB', 'MUL', 'DIV']);
const BOX2 = new Set(['EQU', 'NEQ', 'GRT', 'LES', 'GEQ', 'LEQ', 'MOV']);
const TITLES: Record<string, string> = {
  TON: 'Timer On Delay',
  TOF: 'Timer Off Delay',
  RTO: 'Retentive Timer On',
  CTU: 'Count Up',
  CTD: 'Count Down',
  EQU: 'Equal',
  NEQ: 'Not Equal',
  GRT: 'Greater Than (A>B)',
  LES: 'Less Than (A<B)',
  GEQ: 'Grtr Than or Eql (A>=B)',
  LEQ: 'Less Than or Eql (A<=B)',
  MOV: 'Move',
  ADD: 'Add',
  SUB: 'Subtract',
  MUL: 'Multiply',
  DIV: 'Divide',
};

export function ladderKit(getPlc: () => LadderPlc | null, getTags: () => TagDef[], palette?: string[]): Kit {
  const trace = (ri: number, path: Path) => getPlc()?.engine.trace.get(`${ri}.${path.join('.')}`);
  const fmt = (v: unknown) => {
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    if (typeof v === 'boolean') return v ? '1' : '0';
    return v === undefined || v === '' ? '?' : String(v);
  };
  const val = (ref: string) => {
    const e = getPlc()?.engine;
    if (!e || !ref || ref === '?') return '';
    if (isLiteral(ref)) return '';
    try {
      const t = e.tags.get(ref);
      if (t?.def.type === 'BOOL' || ref.includes('.')) {
        const m = ref.split('.')[1]?.toUpperCase();
        if (m && ['PRE', 'ACC'].includes(m)) return fmt(e.num(ref));
        if (t?.def.type === 'BOOL') return fmt(e.bit(ref));
        return fmt(e.bit(ref));
      }
      return fmt(e.num(ref));
    } catch {
      return '';
    }
  };
  const desc = (tag: string) => getTags().find((t) => t.name === tag.split('.')[0])?.desc ?? '';

  const tagText = (g: SVGGElement, tag: string, x: number) => {
    const w = Math.max(30, Math.min(CW - 4, tag.length * 7.4 + 8));
    g.appendChild(s('rect', { x: x - w / 2, y: 6, width: w, height: 17, class: 'tag-bg', rx: 1 }));
    g.appendChild(s('text', { x, y: 19, class: 'tag-text' + (tag.length > 11 ? ' small' : '') }, tag.length > 13 ? tag.slice(0, 12) + '…' : tag || '?'));
  };

  const kit: Kit = {
    engine: 'ladder',
    rails: { left: '', right: '' },
    size(ins) {
      if (BOX3.has(ins.op)) return [2, 1.75];
      if (BOX2.has(ins.op)) return [2, 1.45];
      return [1, 1];
    },
    terminates: () => false,
    describe(ins) {
      const d = OPS[ins.op]?.desc ?? ins.op;
      return `${ins.op}: ${d}. ${ins.args.filter((a) => a && a !== '?').join(', ')}`;
    },
    helpFor(ins) {
      const map: Record<string, string> = { OTL: 'otl-otu', OTU: 'otl-otu', CTU: 'ctu-ctd', CTD: 'ctu-ctd', EQU: 'compare', NEQ: 'compare', GRT: 'compare', LES: 'compare', GEQ: 'compare', LEQ: 'compare', ADD: 'math', SUB: 'math', MUL: 'math', DIV: 'math' };
      return map[ins.op] ?? ins.op.toLowerCase();
    },
    palette(): PaletteItem[] {
      const groups: [string, string[]][] = [
        ['Bits', ['XIC', 'XIO', 'OTE', 'OTL', 'OTU', 'ONS']],
        ['Timers and counters', ['TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES']],
        ['Compare', ['EQU', 'NEQ', 'GRT', 'LES', 'GEQ', 'LEQ']],
        ['Move and math', ['MOV', 'ADD', 'SUB', 'MUL', 'DIV']],
      ];
      const out: PaletteItem[] = [];
      for (const [g, ops] of groups) {
        for (const op of ops) {
          if (palette && !palette.includes(op)) continue;
          const n = OPS[op].args.length;
          const args = op === 'TON' || op === 'TOF' || op === 'RTO' || op === 'CTU' || op === 'CTD' ? ['?', '1000', '0'] : Array(n).fill('?');
          if (op === 'CTU' || op === 'CTD') args[1] = '10';
          out.push({ op, label: OPS[op].desc.split(':')[0], group: g, args });
        }
      }
      return out;
    },
    argSpec(ins): ArgSpec[] {
      const spec = OPS[ins.op];
      if (!spec) return [];
      return spec.args.map((name) => ({
        name,
        kind: name === 'Preset' ? 'number' : name === 'Accum' ? 'number' : 'tag',
        hint: name.startsWith('Source') ? 'tag or number' : undefined,
      }));
    },
    tagChoices(ins, arg) {
      const tags = getTags();
      const bit = (t: TagDef) => t.type === 'BOOL';
      const op = ins.op;
      let list: string[];
      if (['XIC', 'XIO'].includes(op)) list = [...tags.filter(bit).map((t) => t.name), ...members(tags, ['DN', 'TT', 'EN'])];
      else if (['OTE', 'OTL', 'OTU', 'ONS'].includes(op)) list = tags.filter((t) => bit(t) && t.usage !== 'input').map((t) => t.name);
      else if (['TON', 'TOF', 'RTO'].includes(op)) list = tags.filter((t) => t.type === 'TIMER').map((t) => t.name);
      else if (['CTU', 'CTD'].includes(op)) list = tags.filter((t) => t.type === 'COUNTER').map((t) => t.name);
      else if (op === 'RES') list = tags.filter((t) => t.type === 'TIMER' || t.type === 'COUNTER').map((t) => t.name);
      else {
        const nums = tags.filter((t) => t.type === 'DINT' || t.type === 'REAL');
        const isDest = (op === 'MOV' && arg === 1) || (['ADD', 'SUB', 'MUL', 'DIV'].includes(op) && arg === 2);
        list = (isDest ? nums.filter((t) => t.usage !== 'input') : nums).map((t) => t.name);
        if (!isDest) list.push(...members(tags, ['ACC', 'PRE']));
      }
      return [...new Set(list)].sort();
    },
    probe(p: Probe) {
      const t = trace(p.ri, p.path);
      if (!t) return false;
      return p.kind === 'in' ? t.in : t.out;
    },
    active(ri, path) {
      const plc = getPlc();
      if (!plc) return false;
      const t = trace(ri, path);
      return !!t && (t.out || t.in) && t.out;
    },
    liveText(ins: Instr) {
      const out: Record<string, string> = {};
      ins.args.forEach((a, i) => (out[`a${i}`] = val(a)));
      if (['TON', 'TOF', 'RTO', 'CTU', 'CTD'].includes(ins.op)) {
        out.pre = val(`${ins.args[0]}.PRE`);
        out.acc = val(`${ins.args[0]}.ACC`);
        const e = getPlc()?.engine;
        try {
          const isT = ['TON', 'TOF', 'RTO'].includes(ins.op);
          out.en = e ? (e.bit(`${ins.args[0]}.${isT ? 'EN' : ins.op === 'CTU' ? 'CU' : 'CD'}`) ? '1' : '0') : '';
          out.dn = e ? (e.bit(`${ins.args[0]}.DN`) ? '1' : '0') : '';
        } catch {
          out.en = out.dn = '';
        }
      }
      if (['XIC', 'XIO', 'OTE', 'OTL', 'OTU', 'ONS'].includes(ins.op)) out.bitv = val(ins.args[0]);
      return out;
    },
    draw(ins: Instr): SVGGElement {
      const [cw, chh] = kit.size(ins);
      const g = s('g', { class: `sym lad-${ins.op.toLowerCase()}` });
      const W = cw * CW;
      g.appendChild(s('rect', { x: 2, y: 2, width: W - 4, height: chh * CH - 4, class: 'hit', rx: 4 }));
      const cx = W / 2;
      const tag = ins.args[0] ?? '';
      const stub = (a: number, b: number) => {
        g.appendChild(s('line', { x1: 0, y1: WY, x2: a, y2: WY, class: 'wire', 'data-side': 'in' }));
        g.appendChild(s('line', { x1: b, y1: WY, x2: W, y2: WY, class: 'wire', 'data-side': 'out' }));
      };
      const bitv = () => g.appendChild(s('text', { x: cx + 26, y: WY - 16, class: 'bit-val', 'data-live': 'bitv' }, ''));
      const sub = (text: string) => {
        if (!text) return;
        g.appendChild(s('text', { x: cx, y: WY + 32, class: 'sub-text' }, text.length > 16 ? text.slice(0, 15) + '…' : text));
      };
      switch (ins.op) {
        case 'XIC':
        case 'XIO':
        case 'ONS': {
          stub(cx - 12, cx + 12);
          g.appendChild(s('path', { d: `M${cx - 12} ${WY - 13}h5v26h-5M${cx + 12} ${WY - 13}h-5v26h5`, class: 'contact br' }));
          if (ins.op === 'XIO') g.appendChild(s('line', { x1: cx - 6, y1: WY + 11, x2: cx + 6, y2: WY - 11, class: 'contact' }));
          if (ins.op === 'ONS') g.appendChild(s('text', { x: cx, y: WY + 4, class: 'coil-text' }, 'ONS'));
          g.appendChild(s('rect', { x: cx - 6, y: WY - 11, width: 12, height: 22, class: 'closed-fill' }));
          tagText(g, tag, cx);
          sub(desc(tag));
          bitv();
          break;
        }
        case 'OTE':
        case 'OTL':
        case 'OTU':
        case 'RES': {
          stub(cx - 14, cx + 14);
          g.appendChild(s('path', { d: `M${cx - 8} ${WY - 14}a 16 16 0 0 0 0 28M${cx + 8} ${WY - 14}a 16 16 0 0 1 0 28`, class: 'contact coil-arc' }));
          const letter = ins.op === 'OTL' ? 'L' : ins.op === 'OTU' ? 'U' : ins.op === 'RES' ? 'RES' : '';
          if (letter) g.appendChild(s('text', { x: cx, y: WY + 4, class: 'coil-text' }, letter));
          g.appendChild(s('circle', { cx, cy: WY, r: 6, class: 'closed-fill' }));
          tagText(g, tag, cx);
          sub(desc(tag));
          if (ins.op !== 'RES') bitv();
          break;
        }
        default: {
          // Box instruction
          const h = chh * CH - 14;
          g.appendChild(s('line', { x1: 0, y1: WY, x2: 10, y2: WY, class: 'wire', 'data-side': 'in' }));
          g.appendChild(s('line', { x1: W - 10, y1: WY, x2: W, y2: WY, class: 'wire', 'data-side': 'out' }));
          g.appendChild(s('rect', { x: 10, y: 8, width: W - 20, height: h, class: 'box', rx: 2 }));
          g.appendChild(s('text', { x: 16, y: 24, class: 'box-op' }, ins.op));
          g.appendChild(s('text', { x: 52, y: 24, class: 'box-title' }, TITLES[ins.op] ?? ''));
          const names = OPS[ins.op]?.args ?? [];
          let y = 42;
          names.forEach((n, i) => {
            g.appendChild(s('text', { x: 16, y, class: 'box-label' }, n));
            const a = ins.args[i] ?? '?';
            g.appendChild(s('text', { x: 84, y, class: 'box-arg' }, a.length > 13 ? a.slice(0, 12) + '…' : a));
            if (!(['TON', 'TOF', 'RTO', 'CTU', 'CTD'].includes(ins.op) && i > 0) && !isLiteral(a)) {
              g.appendChild(s('text', { x: W - 16, y: y + 11, class: 'box-val', 'data-live': `a${i}` }, ''));
              y += 11;
            }
            if (['TON', 'TOF', 'RTO', 'CTU', 'CTD'].includes(ins.op) && i > 0) {
              g.lastChild?.remove();
              g.appendChild(s('text', { x: 84, y, class: 'box-arg', 'data-live': i === 1 ? 'pre' : 'acc' }, ''));
            }
            y += 15;
          });
          if (['TON', 'TOF', 'RTO', 'CTU', 'CTD'].includes(ins.op)) {
            const isT = ['TON', 'TOF', 'RTO'].includes(ins.op);
            g.appendChild(s('text', { x: W - 32, y: 50, class: 'box-flag' }, isT ? 'EN' : ins.op === 'CTU' ? 'CU' : 'CD'));
            g.appendChild(s('text', { x: W - 18, y: 50, class: 'box-flag-v', 'data-live': 'en' }, ''));
            g.appendChild(s('text', { x: W - 32, y: 70, class: 'box-flag' }, 'DN'));
            g.appendChild(s('text', { x: W - 18, y: 70, class: 'box-flag-v', 'data-live': 'dn' }, ''));
          }
        }
      }
      return g;
    },
  };
  return kit;
}

function members(tags: TagDef[], ms: string[]): string[] {
  const out: string[] = [];
  for (const t of tags) if (t.type === 'TIMER' || t.type === 'COUNTER') for (const m of ms) out.push(`${t.name}.${m}`);
  return out;
}
