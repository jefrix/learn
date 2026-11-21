// Relay schematic symbols (NFPA-style horizontal ladder) and live state for the editor.

import { s } from './dom';
import { CW, WY, type ArgSpec, type Kit, type PaletteItem, type Probe } from './editor';
import type { Instr, Path } from '../engine/rung';
import type { Sim } from '../engine/sim';
import type { MachineDef } from '../engine/machine';
import { deviceType, inferType } from '../engine/relay/devices';

const LOADS = new Set(['COIL', 'TMR', 'LAMP', 'SOL', 'HORN', 'IN']);

export function relayKit(machine: MachineDef, getSim: () => Sim, getRungs: () => { args: string[]; op: string }[], palette?: string[], volts = '120 VAC'): Kit {
  const id = (ri: number, path: Path) => `r${ri}.${path.join('.')}`;
  const lampColor = (tag: string) => {
    const p = machine.parts.find((x) => x.type === 'lamp' && (x as { signal: string }).signal === tag) as { color?: string } | undefined;
    return p?.color ?? 'amber';
  };
  const label = (tag: string) => machine.devices[tag]?.label ?? '';

  const tagText = (g: SVGGElement, tag: string, x: number) => {
    const w = Math.max(28, tag.length * 8 + 8);
    g.appendChild(s('rect', { x: x - w / 2, y: 6, width: w, height: 17, class: 'tag-bg', rx: 1 }));
    g.appendChild(s('text', { x, y: 19, class: 'tag-text' }, tag || '?'));
  };
  const sub = (g: SVGGElement, text: string, x: number) => {
    if (!text) return;
    const t = text.length > 15 ? text.slice(0, 14) + '…' : text;
    g.appendChild(s('text', { x, y: WY + 30, class: 'sub-text' }, t));
  };
  const stubs = (g: SVGGElement, a: number, b: number | null) => {
    g.appendChild(s('line', { x1: 0, y1: WY, x2: a, y2: WY, class: 'wire', 'data-side': 'in' }));
    if (b !== null) g.appendChild(s('line', { x1: b, y1: WY, x2: CW, y2: WY, class: 'wire', 'data-side': 'out' }));
  };

  const kit: Kit = {
    engine: 'relay',
    rails: { left: 'L1', right: 'N' },
    size: () => [1, 1],
    terminates: (ins) => LOADS.has(ins.op),
    describe(ins) {
      const t = ins.args[0] ?? '';
      const what: Record<string, string> = {
        NO: `Normally open contact of ${t}`,
        NC: `Normally closed contact of ${t}`,
        POS: `Contact of selector ${t}, closed at ${ins.args[1] ?? ''}`,
        WIRE: 'Plain wire',
        COIL: `Coil of ${t}`,
        TMR: `Timer coil ${t}`,
        LAMP: `Pilot lamp ${t}`,
        SOL: `Solenoid valve ${t}`,
        HORN: `Horn ${t}`,
        IN: `PLC input terminal ${t}`,
      };
      const l = label(t);
      return (what[ins.op] ?? ins.op) + (l ? ` (${l})` : '');
    },
    helpFor(ins) {
      const t = ins.args[0] ?? '';
      if (ins.op === 'TMR') return ({ on: 'on-delay', off: 'off-delay', cycle: 'cycle-timer' } as Record<string, string>)[ins.args[1]] ?? 'on-delay';
      if (ins.op === 'LAMP') return 'pilot-lamp';
      if (ins.op === 'SOL') return 'solenoid-valve';
      if (ins.op === 'POS') return 'selector-switch';
      if (ins.op === 'IN') return 'dry-contacts';
      if (ins.op === 'COIL') return inferType(t) === 'contactor' ? 'contactor' : 'control-relay';
      const type = deviceType(t, machine.devices);
      const map: Record<string, string> = {
        pushbutton: 'pushbutton',
        estop: 'e-stop',
        selector: 'selector-switch',
        relay: 'control-relay',
        contactor: 'contactor',
        timer: 'on-delay',
        overload: 'overload-relay',
        float: 'float-switch',
        levelRelay: 'level-relay',
        signal: 'dry-contacts',
      };
      return ins.op === 'NC' && (type === 'pushbutton' || type === 'estop') ? 'fail-safe' : map[type] ?? 'no-nc-contacts';
    },
    palette(): PaletteItem[] {
      const all: PaletteItem[] = [
        { op: 'NO', label: 'NO contact', group: 'Contacts', args: ['?'] },
        { op: 'NC', label: 'NC contact', group: 'Contacts', args: ['?'] },
        { op: 'POS', label: 'Selector contact', group: 'Contacts', args: ['?', 'on'] },
        { op: 'COIL', label: 'Relay / contactor coil', group: 'Loads', args: ['?'] },
        { op: 'TMR', label: 'Timer coil', group: 'Loads', args: ['KT1', 'on', '5'] },
        { op: 'LAMP', label: 'Pilot lamp', group: 'Loads', args: ['?'] },
        { op: 'SOL', label: 'Solenoid valve', group: 'Loads', args: ['?'] },
        { op: 'HORN', label: 'Horn', group: 'Loads', args: ['?'] },
      ];
      return palette ? all.filter((p) => palette.includes(p.op)) : all;
    },
    argSpec(ins): ArgSpec[] {
      switch (ins.op) {
        case 'POS': {
          const def = machine.devices[ins.args[0]];
          return [
            { name: 'Selector', kind: 'tag' },
            { name: 'Closed at', kind: 'choice', choices: def?.positions ?? ['on', 'off'] },
          ];
        }
        case 'TMR':
          return [
            { name: 'Timer', kind: 'tag' },
            { name: 'Type', kind: 'choice', choices: ['on', 'off', 'cycle'] },
            { name: ins.args[1] === 'cycle' ? 'OFF time (s)' : 'Delay (s)', kind: 'number' },
            ...(ins.args[1] === 'cycle' ? [{ name: 'ON time (s)', kind: 'number' as const }] : []),
          ];
        case 'WIRE':
          return [];
        default:
          return [{ name: 'Device tag', kind: 'tag', hint: 'e.g. KM1' }];
      }
    },
    tagChoices(ins) {
      const tags = new Set<string>(Object.keys(machine.devices));
      for (const r of getRungs()) if (r.args?.[0]) tags.add(r.args[0]);
      const list = [...tags].filter((t) => t !== '?');
      const want = (t: string) => {
        const ty = deviceType(t, machine.devices);
        switch (ins.op) {
          case 'POS':
            return ty === 'selector';
          case 'COIL':
            return ty === 'relay' || ty === 'contactor';
          case 'TMR':
            return ty === 'timer';
          case 'LAMP':
            return ty === 'lamp';
          case 'SOL':
            return ty === 'solenoid';
          case 'HORN':
            return ty === 'horn';
          default:
            return !['lamp', 'solenoid', 'horn', 'plcInput', 'selector'].includes(ty);
        }
      };
      return list.filter(want).sort();
    },
    probe(p: Probe) {
      const sim = getSim();
      const r = sim.relay;
      if (!r) return false;
      const e = r.net.ends.get(id(p.ri, p.path));
      if (!e) return false;
      const node = p.kind === 'in' ? e.a : e.b;
      return node !== null && r.live.has(node);
    },
    active(ri, path) {
      const sim = getSim();
      const r = sim.relay;
      if (!r) return false;
      const key = id(ri, path);
      if (r.closed.has(key)) return r.closed.get(key) as boolean;
      const e = r.net.ends.get(key);
      return !!e && e.b === null && r.live.has(e.a);
    },
    liveText(ins): Record<string, string> {
      if (ins.op !== 'TMR') return {};
      const sim = getSim();
      const acc = sim.sig.n(`${ins.args[0]}.acc`);
      return { acc: fmtS(acc) };
    },
    meter(p: Probe) {
      const r = getSim().relay;
      const e = r?.net.ends.get(id(p.ri, p.path));
      if (!r || !e) return 'No reading.';
      const node = p.kind === 'in' ? e.a : e.b;
      if (node === null) return 'That side goes to N.';
      const name = /^n\d+$/.test(node) ? 'this wire' : `wire ${node}`;
      return r.live.has(node) ? `${volts} on ${name} (to N).` : `0 V on ${name}. It's dead.`;
    },
    draw(ins: Instr): SVGGElement {
      const g = s('g', { class: `sym sym-${ins.op.toLowerCase()}` });
      g.appendChild(s('rect', { x: 2, y: 2, width: CW - 4, height: 80, class: 'hit', rx: 4 }));
      const tag = ins.args[0] ?? '';
      const cx = CW / 2;
      switch (ins.op) {
        case 'WIRE':
          g.appendChild(s('line', { x1: 0, y1: WY, x2: CW, y2: WY, class: 'wire', 'data-side': 'in' }));
          break;
        case 'NO':
        case 'NC':
        case 'POS': {
          stubs(g, cx - 12, cx + 12);
          g.appendChild(s('line', { x1: cx - 12, y1: WY - 14, x2: cx - 12, y2: WY + 14, class: 'contact' }));
          g.appendChild(s('line', { x1: cx + 12, y1: WY - 14, x2: cx + 12, y2: WY + 14, class: 'contact' }));
          if (ins.op === 'NC') g.appendChild(s('line', { x1: cx - 18, y1: WY + 14, x2: cx + 18, y2: WY - 14, class: 'contact' }));
          g.appendChild(s('rect', { x: cx - 10, y: WY - 12, width: 20, height: 24, class: 'closed-fill' }));
          tagText(g, tag, cx);
          if (ins.op === 'POS') sub(g, `at ${(ins.args[1] ?? 'on').toUpperCase()}`, cx);
          else sub(g, label(tag), cx);
          if (deviceType(tag, machine.devices) === 'timer') g.appendChild(s('path', { d: `M${cx - 5} ${WY - 21} a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0`, class: 'timer-mark' }));
          break;
        }
        case 'COIL':
        case 'TMR':
        case 'HORN':
        case 'IN': {
          stubs(g, cx - 15, null);
          g.appendChild(s('line', { x1: cx + 15, y1: WY, x2: CW, y2: WY, class: 'wire n-side' }));
          if (ins.op === 'IN') g.appendChild(s('rect', { x: cx - 14, y: WY - 12, width: 28, height: 24, class: 'coil' }));
          else g.appendChild(s('circle', { cx, cy: WY, r: 15, class: 'coil' }));
          if (ins.op === 'TMR') {
            g.appendChild(s('text', { x: cx, y: WY + 4, class: 'coil-text' }, 'TD'));
            const mode = ins.args[1] ?? 'on';
            const txt = mode === 'cycle' ? `${fmtS(+ins.args[2])} off / ${fmtS(+ins.args[3])} on` : `${mode === 'off' ? 'off' : 'on'}-delay ${fmtS(+ins.args[2])}`;
            g.appendChild(s('text', { x: cx, y: WY + 30, class: 'sub-text' }, txt));
            g.appendChild(s('text', { x: cx, y: WY + 41, class: 'live-text', 'data-live': 'acc' }, ''));
          } else {
            if (ins.op === 'IN') g.appendChild(s('text', { x: cx, y: WY + 4, class: 'coil-text' }, 'IN'));
            if (ins.op === 'HORN') g.appendChild(s('path', { d: `M${cx - 6} ${WY - 5}h5l7 -6v22l-7 -6h-5z`, class: 'coil-text-fill' }));
            sub(g, label(tag), cx);
          }
          tagText(g, tag, cx);
          break;
        }
        case 'LAMP': {
          stubs(g, cx - 15, null);
          g.appendChild(s('line', { x1: cx + 15, y1: WY, x2: CW, y2: WY, class: 'wire n-side' }));
          g.appendChild(s('circle', { cx, cy: WY, r: 15, class: `lamp lamp-${lampColor(tag)}` }));
          g.appendChild(s('path', { d: `M${cx - 10} ${WY - 10}L${cx + 10} ${WY + 10}M${cx + 10} ${WY - 10}L${cx - 10} ${WY + 10}`, class: 'lamp-x' }));
          tagText(g, tag, cx);
          sub(g, label(tag), cx);
          break;
        }
        case 'SOL': {
          stubs(g, cx - 14, null);
          g.appendChild(s('line', { x1: cx + 14, y1: WY, x2: CW, y2: WY, class: 'wire n-side' }));
          g.appendChild(s('rect', { x: cx - 14, y: WY - 10, width: 28, height: 20, class: 'coil' }));
          g.appendChild(s('line', { x1: cx - 14, y1: WY + 10, x2: cx + 14, y2: WY - 10, class: 'contact' }));
          tagText(g, tag, cx);
          sub(g, label(tag), cx);
          break;
        }
        default: {
          stubs(g, cx - 20, cx + 20);
          g.appendChild(s('rect', { x: cx - 20, y: WY - 14, width: 40, height: 28, class: 'coil bad' }));
          g.appendChild(s('text', { x: cx, y: WY + 4, class: 'coil-text' }, ins.op));
        }
      }
      if (ins.wire) g.appendChild(s('text', { x: CW - 4, y: WY - 6, class: 'wire-num' }, ins.wire));
      return g;
    },
  };
  return kit;
}

export function fmtS(sec: number): string {
  if (!Number.isFinite(sec)) return '?';
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const r = Math.round(sec - m * 60);
    return r ? `${m}m${String(r).padStart(2, '0')}s` : `${m} min`;
  }
  return `${Math.round(sec * 10) / 10} s`;
}
