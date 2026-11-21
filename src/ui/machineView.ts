// The animated machine. Parts are drawn from machine data; operator devices are
// clickable, tanks can be dragged to set a level, and everything updates from
// the signal table every frame.

import { s, toast } from './dom';
import type { MachineDef } from '../engine/machine';
import type { PartDef } from '../engine/process/world';
import type { Sim } from '../engine/sim';

interface Updater {
  (sim: Sim, t: number): void;
}

type AnyPart = PartDef & Record<string, unknown>;

const FLUID: Record<string, string> = { water: 'var(--water)', sludge: 'var(--sludge)', poly: 'var(--poly)', floc: 'var(--floc)', air: 'var(--steel2)' };

export class MachineView {
  svg: SVGSVGElement;
  private ups: Updater[] = [];
  /** Pushbuttons locked in with Shift+click or a long press. */
  held = new Set<string>();
  /** Called when the player does something, with a short description. */
  onAction?: (what: string) => void;
  /** Set to make technician actions (clear jam, clean rods) check conditions first. */
  guard?: (part: string, what: string) => string | null;

  constructor(
    public machine: MachineDef,
    private getSim: () => Sim,
  ) {
    const [w, h] = machine.size;
    this.svg = s('svg', { class: 'machine', viewBox: `0 0 ${w} ${h}`, role: 'group', 'aria-label': machine.title });
    // draw order: panels and pipes first, then equipment, then operator devices
    const order = (p: AnyPart) => (p.type === 'panel' ? 0 : p.type === 'pipe' ? 1 : p.type === 'tank' ? 2 : ['button', 'estop', 'selector', 'switch', 'lamp', 'horn'].includes(p.type) ? 5 : 3);
    const parts = [...machine.parts].sort((a, b) => order(a as AnyPart) - order(b as AnyPart)) as AnyPart[];
    for (const p of parts) this.add(p);
  }

  update(t: number) {
    const sim = this.getSim();
    for (const u of this.ups) u(sim, t);
  }

  private act(what: string) {
    this.onAction?.(what);
  }

  private add(p: AnyPart) {
    const at = (p.at as [number, number] | undefined) ?? [0, 0];
    const g = s('g', { transform: `translate(${at[0]},${at[1]})`, class: `part part-${p.type}` });
    const lbl = (text: string | undefined, x: number, y: number, cls = 'part-label') => text && g.appendChild(s('text', { x, y, class: cls }, text));
    const tag = (text: string, x: number, y: number) => {
      const w = text.length * 7.4 + 8;
      g.appendChild(s('rect', { x: x - w / 2, y: y - 12, width: w, height: 16, class: 'tag-bg', rx: 1 }));
      g.appendChild(s('text', { x, y: y + 0.5, class: 'tag-text small' }, text));
    };

    switch (p.type) {
      case 'panel': {
        const [w, h] = (p.size as [number, number]) ?? [200, 200];
        g.appendChild(s('rect', { x: 0, y: 0, width: w, height: h, class: 'panel-door', rx: 6 }));
        lbl(p.label, 10, 20, 'panel-title');
        break;
      }
      case 'label': {
        lbl(p.label, 0, 0, (p.cls as string) ?? 'part-label');
        break;
      }
      case 'pipe': {
        const pts = (p.points as [number, number][]).map((q) => q.join(',')).join(' ');
        const fluid = FLUID[(p.fluid as string) ?? 'water'];
        g.appendChild(s('polyline', { points: pts, class: 'pipe' }));
        const flow = s('polyline', { points: pts, class: 'pipe-flow', style: `stroke:${fluid}` });
        g.appendChild(flow);
        const sigName = p.flow as string | undefined;
        if (sigName) this.ups.push((sim) => flow.classList.toggle('flowing', sim.sig.n(sigName) > 0 || sim.sig.b(sigName)));
        break;
      }
      case 'tank': {
        const [w, h] = (p.size as [number, number]) ?? [120, 150];
        const fluid = FLUID[(p.fluid as string) ?? 'water'];
        g.appendChild(s('rect', { x: 0, y: 0, width: w, height: h, class: 'tank-shell', rx: 4 }));
        const liquid = s('rect', { x: 3, y: h, width: w - 6, height: 0, class: 'tank-liquid', style: `fill:${fluid}` });
        g.appendChild(liquid);
        const pct = s('text', { x: w / 2, y: h - 8, class: 'tank-pct' }, '');
        g.appendChild(pct);
        g.appendChild(s('rect', { x: 0, y: 0, width: w, height: h, class: 'tank-frame', rx: 4 }));
        lbl(p.label, w / 2, -8, 'part-label center');
        const spill = s('text', { x: w / 2, y: -24, class: 'warn-text' }, '');
        g.appendChild(spill);
        // drag to set level
        const drag = (ev: PointerEvent) => {
          const r = (g as SVGGElement).getScreenCTM();
          if (!r) return;
          const pt = this.svg.createSVGPoint();
          pt.x = ev.clientX;
          pt.y = ev.clientY;
          const loc = pt.matrixTransform(r.inverse());
          const lvl = Math.max(0, Math.min(1, 1 - loc.y / h));
          this.getSim().world.action(p.id, 'setLevel', lvl);
        };
        g.style.cursor = 'ns-resize';
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', `${p.label ?? p.id} level. Drag, or use arrow keys.`);
        g.addEventListener('pointerdown', (ev) => {
          (ev.target as Element).setPointerCapture?.(ev.pointerId);
          drag(ev);
          const move = (e: PointerEvent) => drag(e);
          const up = () => {
            g.removeEventListener('pointermove', move);
            g.removeEventListener('pointerup', up);
            this.act(`set ${p.label ?? p.id} level`);
          };
          g.addEventListener('pointermove', move);
          g.addEventListener('pointerup', up);
        });
        g.addEventListener('keydown', (ev) => {
          const w2 = this.getSim().world;
          const cur = w2.level.get(p.id) ?? 0;
          if (ev.key === 'ArrowUp') w2.action(p.id, 'setLevel', cur + 0.05);
          else if (ev.key === 'ArrowDown') w2.action(p.id, 'setLevel', cur - 0.05);
          else return;
          ev.preventDefault();
        });
        this.ups.push((sim) => {
          const lv = sim.world.level.get(p.id) ?? 0;
          const hh = (h - 6) * lv;
          liquid.setAttribute('y', String(h - 3 - hh));
          liquid.setAttribute('height', String(hh));
          pct.textContent = `${Math.round(lv * 100)}%`;
          spill.textContent = lv >= 0.999 ? 'OVERFLOW' : '';
        });
        // marks for floats and rods are drawn by those parts
        break;
      }
      case 'float': {
        const tank = this.machine.parts.find((x) => x.id === p.tank) as AnyPart | undefined;
        const [tw, th] = (tank?.size as [number, number]) ?? [120, 150];
        const ta = (tank?.at as [number, number]) ?? [0, 0];
        const y = ta[1] + th - th * (p.at_level as number);
        const side = (p.side as string) === 'left' ? -1 : 1;
        const x = side > 0 ? ta[0] + tw + 6 : ta[0] - 6;
        g.setAttribute('transform', `translate(${x},${y})`);
        g.appendChild(s('line', { x1: 0, y1: 0, x2: -side * 22, y2: 0, class: 'float-arm' }));
        const ball = s('circle', { cx: -side * 26, cy: 0, r: 6, class: 'float-ball' });
        g.appendChild(ball);
        const t = s('text', { x: side * 6, y: 4, class: 'part-label' + (side < 0 ? ' end' : '') }, (p.label as string) ?? p.id);
        g.appendChild(t);
        this.ups.push((sim) => g.classList.toggle('on', sim.sig.b(p.signal as string)));
        break;
      }
      case 'electrodes': {
        const tank = this.machine.parts.find((x) => x.id === p.tank) as AnyPart | undefined;
        const [tw, th] = (tank?.size as [number, number]) ?? [120, 150];
        const ta = (tank?.at as [number, number]) ?? [0, 0];
        g.setAttribute('transform', `translate(${ta[0] + tw - 34},${ta[1] - 10})`);
        const rods: [number, number, string][] = [
          [0, th * 0.92, 'E1'],
          [10, th * (1 - (p.low as number)) + 10, 'E2'],
          [20, th * (1 - (p.high as number)) + 10, 'E3'],
        ];
        for (const [x, len, name] of rods) {
          g.appendChild(s('line', { x1: x, y1: 0, x2: x, y2: len, class: 'rod' + (name === 'E3' ? ' rod-high' : '') }));
          g.appendChild(s('text', { x, y: -3, class: 'rod-label' }, name));
        }
        const gunk = s('rect', { x: 14, y: th * (1 - (p.high as number)) - 6, width: 12, height: 22, class: 'gunk', rx: 3 });
        g.appendChild(gunk);
        lbl((p.label as string) ?? 'Rods', 30, 6, 'part-label');
        this.ups.push((sim) => {
          gunk.style.display = sim.world.faults.some((f) => f.type === 'fouled' && f.part === p.id) ? '' : 'none';
        });
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => this.tech(p.id, 'clean', 'Clean the electrode rods'));
        break;
      }
      case 'pump':
      case 'motor': {
        const r = 20;
        g.appendChild(s('circle', { cx: 0, cy: 0, r, class: 'pump-body' }));
        const imp = s('g', { class: 'impeller' });
        if (p.type === 'pump') {
          for (let k = 0; k < 3; k++) imp.appendChild(s('path', { d: `M0 0 L${r * 0.8} -4 L${r * 0.8} 4Z`, transform: `rotate(${k * 120})`, class: 'blade' }));
        } else {
          imp.appendChild(s('text', { x: 0, y: 5, class: 'motor-m' }, 'M'));
          imp.appendChild(s('line', { x1: 0, y1: -r + 4, x2: 0, y2: -r + 10, class: 'motor-tick' }));
        }
        g.appendChild(imp);
        lbl(p.label, 0, r + 16, 'part-label center');
        if (p.tag) tag(p.tag as string, 0, -r - 8);
        const dir = s('text', { x: r + 6, y: 4, class: 'part-label' }, '');
        g.appendChild(dir);
        const jam = s('text', { x: 0, y: -r - 24, class: 'warn-text' }, '');
        g.appendChild(jam);
        let ang = 0;
        let last = 0;
        this.ups.push((sim, t) => {
          const on = sim.sig.b(`${p.id}.running`);
          const d = sim.sig.n(`${p.id}.dir`, 1) || 1;
          const jammed = sim.world.faults.some((f) => f.type === 'jam' && f.part === p.id);
          if (on && !jammed) ang = (ang + d * (t - last) * 0.6) % 360;
          last = t;
          imp.setAttribute('transform', `rotate(${ang})`);
          g.classList.toggle('on', on);
          g.classList.toggle('jammed', jammed);
          jam.textContent = jammed ? 'JAMMED' : '';
          if (p.fwd) dir.textContent = on ? (d > 0 ? 'FWD' : 'REV') : '';
        });
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => {
          if (this.getSim().world.faults.some((f) => f.type === 'jam' && f.part === p.id)) this.tech(p.id, 'clearJam', `Clear the jam in ${p.label ?? p.id}`);
        });
        break;
      }
      case 'screw': {
        const w = (p.length as number) ?? 220;
        g.appendChild(s('rect', { x: 0, y: -16, width: w, height: 32, class: 'barrel', rx: 6 }));
        const stripes = s('g', { class: 'screw-flights' });
        for (let x = -24; x < w + 24; x += 16) stripes.appendChild(s('line', { x1: x, y1: -12, x2: x + 10, y2: 12, class: 'flight' }));
        const clip = s('clipPath', { id: `clip-${p.id}` }, s('rect', { x: 2, y: -14, width: w - 4, height: 28, rx: 5 }));
        g.appendChild(clip);
        const sg = s('g', { 'clip-path': `url(#clip-${p.id})` }, stripes);
        g.appendChild(sg);
        lbl(p.label, w / 2, 32, 'part-label center');
        if (p.tag) tag(p.tag as string, -18, 4);
        const cake = s('g', {});
        g.appendChild(cake);
        let off = 0;
        let last = 0;
        this.ups.push((sim, t) => {
          const on = sim.sig.b(`${p.id}.running`);
          if (on) off = (off + (t - last) * 0.02) % 16;
          last = t;
          stripes.setAttribute('transform', `translate(${off},0)`);
          g.classList.toggle('on', on);
          g.classList.toggle('feeding', sim.sig.n(`${p.id}.flow`) > 0);
        });
        break;
      }
      case 'valve': {
        g.appendChild(s('path', { d: 'M-14 -10 L14 10 L14 -10 L-14 10 Z', class: 'valve-body' }));
        g.appendChild(s('line', { x1: 0, y1: 0, x2: 0, y2: -18, class: 'valve-stem' }));
        g.appendChild(s('rect', { x: -9, y: -28, width: 18, height: 11, class: 'valve-act', rx: 2 }));
        lbl(p.label, 0, 26, 'part-label center');
        if (p.tag) tag(p.tag as string, 0, -36);
        this.ups.push((sim) => g.classList.toggle('on', sim.sig.b(`${p.id}.open`)));
        break;
      }
      case 'transmitter': {
        g.appendChild(s('rect', { x: -26, y: -16, width: 52, height: 32, class: 'xmtr', rx: 4 }));
        const v = s('text', { x: 0, y: 5, class: 'xmtr-val' }, '');
        g.appendChild(v);
        if (p.tag) tag(p.tag as string, 0, -22);
        lbl(p.label, 0, 30, 'part-label center');
        this.ups.push((sim) => {
          const mA = sim.sig.n(p.signal as string);
          v.textContent = `${mA.toFixed(2)} mA`;
          g.classList.toggle('fault', mA < 3.8);
        });
        break;
      }
      case 'analog':
      case 'filter': {
        g.appendChild(s('rect', { x: -40, y: -18, width: 80, height: 36, class: 'xmtr', rx: 4 }));
        const v = s('text', { x: 0, y: 5, class: 'xmtr-val' }, '');
        g.appendChild(v);
        if (p.tag) tag(p.tag as string, 0, -24);
        lbl(p.label, 0, 32, 'part-label center');
        const unit = (p.unit as string) ?? 'psi';
        const decimals = (p.decimals as number) ?? 2;
        this.ups.push((sim) => (v.textContent = `${sim.sig.n(p.signal as string).toFixed(decimals)} ${unit}`));
        if (p.type === 'analog') {
          // tap to cycle through test values, or drag horizontally
          const min = p.min as number;
          const max = p.max as number;
          g.style.cursor = 'ew-resize';
          g.setAttribute('tabindex', '0');
          const set = (val: number) => {
            this.getSim().sig.set(p.signal as string, Math.min(max, Math.max(min, val)));
          };
          g.addEventListener('pointerdown', (ev) => {
            const x0 = ev.clientX;
            const v0 = this.getSim().sig.n(p.signal as string);
            (ev.target as Element).setPointerCapture?.(ev.pointerId);
            const move = (e: PointerEvent) => set(v0 + ((e.clientX - x0) / 200) * (max - min));
            const up = () => {
              g.removeEventListener('pointermove', move);
              g.removeEventListener('pointerup', up);
              this.act(`set ${p.label ?? p.id}`);
            };
            g.addEventListener('pointermove', move);
            g.addEventListener('pointerup', up);
          });
          g.addEventListener('keydown', (ev) => {
            const cur = this.getSim().sig.n(p.signal as string);
            const step = (max - min) / 50;
            if (ev.key === 'ArrowUp' || ev.key === 'ArrowRight') set(cur + step);
            else if (ev.key === 'ArrowDown' || ev.key === 'ArrowLeft') set(cur - step);
            else return;
            ev.preventDefault();
          });
        }
        break;
      }
      case 'display': {
        g.appendChild(s('rect', { x: -44, y: -16, width: 88, height: 32, class: 'display-box', rx: 3 }));
        const v = s('text', { x: 0, y: 6, class: 'display-val' }, '');
        g.appendChild(v);
        lbl(p.label, 0, 30, 'part-label center');
        if (p.tag) tag(p.tag as string, 0, -22);
        const unit = (p.unit as string) ?? '';
        const dec = (p.decimals as number) ?? 0;
        this.ups.push((sim) => (v.textContent = `${sim.sig.n(p.signal as string).toFixed(dec)}${unit ? ' ' + unit : ''}`));
        break;
      }
      case 'overload': {
        g.appendChild(s('rect', { x: -26, y: -20, width: 52, height: 40, class: 'ol-body', rx: 3 }));
        tag(p.label ? (p.id as string) : p.id, 0, -26);
        const flag = s('rect', { x: -20, y: -14, width: 16, height: 10, class: 'ol-flag' });
        g.appendChild(flag);
        const btn = s('circle', { cx: 12, cy: 6, r: 8, class: 'ol-reset' });
        g.appendChild(btn);
        g.appendChild(s('text', { x: 0, y: 34, class: 'part-label center' }, 'RESET'));
        btn.style.cursor = 'pointer';
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', `Reset overload ${p.id}`);
        btn.addEventListener('click', () => {
          const sim = this.getSim();
          const msg = sim.world.action(p.id, 'reset');
          if (msg) toast(msg, 'warn');
          this.act(`reset ${p.id}`);
        });
        this.ups.push((sim) => g.classList.toggle('tripped', sim.sig.b(p.signal as string)));
        break;
      }
      case 'vfd': {
        g.appendChild(s('rect', { x: -28, y: -34, width: 56, height: 68, class: 'vfd-body', rx: 3 }));
        const disp = s('text', { x: 0, y: -12, class: 'vfd-disp' }, 'rdY');
        g.appendChild(disp);
        tag(p.tag as string ?? p.id, 0, -40);
        const btn = s('rect', { x: -14, y: 6, width: 28, height: 14, class: 'vfd-btn', rx: 2 });
        g.appendChild(btn);
        g.appendChild(s('text', { x: 0, y: 17, class: 'vfd-btn-text' }, 'RESET'));
        lbl(p.label, 0, 50, 'part-label center');
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
          this.getSim().world.action(p.id, 'reset');
          this.act(`reset drive ${p.id}`);
        });
        const runSig = p.run as string | undefined;
        this.ups.push((sim) => {
          const f = sim.sig.b(`${p.id}.fault`);
          disp.textContent = f ? 'OHF' : runSig && sim.sig.b(runSig) ? 'rUn' : 'rdY';
          g.classList.toggle('fault', f);
        });
        break;
      }
      case 'button': {
        const color = (p.color as string) ?? 'green';
        g.appendChild(s('circle', { cx: 0, cy: 0, r: 20, class: 'pb-ring' }));
        const cap = s('circle', { cx: 0, cy: 0, r: 15, class: `pb-cap pb-${color}` });
        g.appendChild(cap);
        tag((p.tag as string) ?? p.signal as string, 0, -28);
        lbl(p.label, 0, 36, 'part-label center');
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', `${p.tag ?? p.signal} ${p.label ?? ''}: hold to press. Shift+click or long-press to keep it held.`);
        g.style.cursor = 'pointer';
        const sig = p.signal as string;
        const name = (p.tag as string) ?? sig;
        // A held button stays pressed after you let go, so you can press a second
        // one with a mouse. Shift+click (or a long press on touch) holds it; a
        // plain click releases it.
        const heldMark = s('text', { x: 0, y: 49, class: 'held-mark' }, 'HELD');
        g.appendChild(heldMark);
        let longTimer = 0;
        let keepDown = false;
        const hold = () => {
          this.held.add(sig);
          this.getSim().press(sig);
          toast(`${name} is held in. Click it again to let go.`);
        };
        const down = (e: Event) => {
          e.preventDefault();
          if (this.held.has(sig)) {
            this.held.delete(sig);
            this.getSim().release(sig);
            keepDown = true;
            return;
          }
          this.getSim().press(sig);
          this.act(`press ${name}`);
          if ((e as PointerEvent).shiftKey || (e as KeyboardEvent).shiftKey) {
            hold();
            keepDown = true;
            return;
          }
          keepDown = false;
          clearTimeout(longTimer);
          longTimer = window.setTimeout(() => {
            hold();
            keepDown = true;
          }, 700);
        };
        const up = () => {
          clearTimeout(longTimer);
          if (keepDown || this.held.has(sig)) return;
          this.getSim().release(sig);
        };
        g.addEventListener('pointerdown', down);
        g.addEventListener('pointerup', up);
        g.addEventListener('pointerleave', up);
        g.addEventListener('pointercancel', up);
        g.addEventListener('contextmenu', (e) => e.preventDefault());
        g.addEventListener('keydown', (e) => !e.repeat && (e.key === ' ' || e.key === 'Enter') && down(e));
        g.addEventListener('keyup', (e) => (e.key === ' ' || e.key === 'Enter') && up());
        const lit = p.lamp as string | undefined;
        this.ups.push((sim) => {
          const on = sim.sig.b(sig);
          if (this.held.has(sig) && !on) this.held.delete(sig); // e.g. after Start over
          g.classList.toggle('pressed', on);
          g.classList.toggle('held', this.held.has(sig));
          if (lit) g.classList.toggle('lit', sim.sig.b(lit));
        });
        break;
      }
      case 'estop': {
        g.appendChild(s('circle', { cx: 0, cy: 0, r: 26, class: 'es-ring' }));
        g.appendChild(s('circle', { cx: 0, cy: 0, r: 18, class: 'es-cap' }));
        tag((p.tag as string) ?? (p.signal as string), 0, -34);
        lbl(p.label ?? 'E-STOP', 0, 42, 'part-label center');
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', 'Emergency stop. Press to latch in, press again to twist and release.');
        g.style.cursor = 'pointer';
        const go = () => {
          const sim = this.getSim();
          const sig = p.signal as string;
          if (sim.sig.b(sig)) {
            sim.release(sig);
            this.act(`release ${p.tag ?? sig}`);
          } else {
            sim.press(sig);
            this.act(`press ${p.tag ?? sig}`);
          }
        };
        g.addEventListener('click', go);
        g.addEventListener('keydown', (e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), go()));
        this.ups.push((sim) => g.classList.toggle('pressed', sim.sig.b(p.signal as string)));
        break;
      }
      case 'selector':
      case 'switch': {
        const positions = (p.positions as string[]) ?? ['off', 'on'];
        const n = positions.length;
        const angles = positions.map((_, i) => (n === 1 ? 0 : -45 + (90 * i) / (n - 1)));
        g.appendChild(s('circle', { cx: 0, cy: 0, r: 20, class: 'sel-ring' }));
        positions.forEach((pos, i) => {
          const a = ((angles[i] - 90) * Math.PI) / 180;
          g.appendChild(s('text', { x: Math.cos(a) * 32, y: Math.sin(a) * 30 + 4, class: 'sel-pos' }, pos.toUpperCase()));
        });
        const knob = s('g', {}, s('rect', { x: -5, y: -17, width: 10, height: 34, rx: 3, class: 'sel-knob' }), s('circle', { cx: 0, cy: -12, r: 2, class: 'sel-dot' }));
        g.appendChild(knob);
        tag((p.tag as string) ?? (p.signal as string), 0, -48);
        lbl(p.label, 0, 38, 'part-label center');
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.style.cursor = 'pointer';
        const turn = (dir: number) => {
          const sim = this.getSim();
          const cur = positions.indexOf(sim.sig.s(p.signal as string));
          let nx = cur + dir;
          if (nx >= n) nx = 0;
          if (nx < 0) nx = n - 1;
          sim.set(p.signal as string, positions[nx]);
          this.act(`turn ${p.tag ?? p.signal} to ${positions[nx]}`);
        };
        g.addEventListener('click', (e) => {
          const r = g.getBoundingClientRect();
          turn(e.clientX < r.left + r.width / 2 && n > 2 ? -1 : 1);
        });
        g.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') turn(-1);
          else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') turn(1);
          else return;
          e.preventDefault();
        });
        this.ups.push((sim) => {
          const i = Math.max(0, positions.indexOf(sim.sig.s(p.signal as string)));
          knob.setAttribute('transform', `rotate(${angles[i]})`);
          g.setAttribute('aria-label', `${p.tag ?? p.signal} ${p.label ?? ''}: at ${positions[i]}. Tap to turn.`);
        });
        break;
      }
      case 'lamp': {
        const color = (p.color as string) ?? 'amber';
        g.appendChild(s('circle', { cx: 0, cy: 0, r: 15, class: 'lamp-ring' }));
        g.appendChild(s('circle', { cx: 0, cy: 0, r: 11, class: `lamp-lens lamp-${color}` }));
        tag((p.tag as string) ?? (p.signal as string), 0, -23);
        lbl(p.label, 0, 30, 'part-label center');
        this.ups.push((sim) => g.classList.toggle('lit', sim.sig.b(p.signal as string)));
        break;
      }
      case 'horn': {
        g.appendChild(s('path', { d: 'M-12 -8h8l12 -10v36l-12 -10h-8z', class: 'horn-body' }));
        tag((p.tag as string) ?? (p.signal as string), 0, -26);
        lbl(p.label, 0, 30, 'part-label center');
        this.ups.push((sim, t) => g.classList.toggle('sounding', sim.sig.b(p.signal as string) && Math.floor(t / 250) % 2 === 0));
        break;
      }
      default:
        return;
    }
    this.svg.appendChild(g);
  }

  private tech(part: string, what: 'clearJam' | 'clean', text: string) {
    const msg = this.guard?.(part, what) ?? null;
    if (msg) {
      toast(msg, 'warn');
      return;
    }
    this.getSim().world.action(part, what);
    toast(`${text}: done.`);
    this.act(`${what} ${part}`);
  }
}
