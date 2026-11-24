// A small live circuit for the Tutorial and Rules of thumb pages: a machine you
// can press, the drawing with power flow, and buttons that break things.

import { h, toast } from './dom';
import { MachineView } from './machineView';
import { RungEditor } from './editor';
import { relayKit } from './relayKit';
import { machines } from '../data';
import { Sim, type Fault } from '../engine/sim';
import { parseRungs, printRungs, type Rung } from '../engine/rung';

export interface DemoDef {
  machine: string;
  /** Relay rungs in the game's text form, e.g. `NO(SB1)LAMP(H1);` */
  text: string;
  /** Let the reader edit the drawing (a sandbox). Default: read-only. */
  editable?: boolean;
  /** Buttons that inject a fault, to show what fails safe and what doesn't. */
  faults?: { label: string; fault: Fault }[];
  /** One line under the demo: what to try. */
  tryThis?: string;
}

export interface Demo {
  root: HTMLElement;
  stop(): void;
}

const DT = 0.05;

export function liveDemo(def: DemoDef, onHelp: (id: string) => void): Demo {
  const machine = machines[def.machine];
  if (!machine) throw new Error(`No machine ${def.machine}`);
  let text = def.text;
  const makeSim = () => {
    const sm = new Sim(machine);
    sm.setRelay(text);
    return sm;
  };
  let sim = makeSim();
  const instr = () => {
    const out: { op: string; args: string[] }[] = [];
    const walk = (s: Rung['els']) => s.forEach((e) => ('branch' in e ? e.branch.forEach(walk) : out.push(e)));
    parseRungs(text).forEach((r) => walk(r.els));
    return out;
  };
  const kit = relayKit(machine, () => sim, instr, undefined, '120 VAC');
  const editor = new RungEditor({
    kit,
    rungs: parseRungs(text),
    locked: 0,
    editable: def.editable === true,
    onChange: (rungs: Rung[]) => {
      text = printRungs(rungs);
      sim.setRelay(rungs);
    },
    onHelp,
  });
  const view = new MachineView(machine, () => sim);

  const active = new Set<string>();
  const faultBtns = (def.faults ?? []).map((f) => {
    const b = h('button', {
      class: 'btn small',
      onclick: () => {
        if (active.has(f.label)) return;
        sim.inject(f.fault);
        active.add(f.label);
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
        toast(`${f.label}.`);
      },
      'aria-pressed': 'false',
    }, f.label);
    return b;
  });
  const powerBtn = h('button', {
    class: 'btn small',
    onclick: () => {
      sim.setPower(!sim.powered);
      powerBtn.textContent = sim.powered ? 'Power off' : 'Power on';
    },
  }, 'Power off');
  const reset = h('button', {
    class: 'btn small',
    onclick: () => {
      if (!def.editable) text = def.text;
      sim = makeSim();
      editor.setRungs(parseRungs(text));
      active.clear();
      faultBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      powerBtn.textContent = 'Power off';
    },
  }, def.editable ? 'Restart machine' : 'Reset');
  const status = h('div', { class: 'sim-status', 'aria-live': 'polite' });

  const root = h(
    'figure',
    { class: 'demo card' + (def.editable ? ' editable' : '') },
    h('div', { class: 'demo-grid' }, h('div', { class: 'machine-wrap' }, view.svg), h('div', { class: 'demo-logic' }, editor.root)),
    h('div', { class: 'insp-row demo-controls' }, reset, powerBtn, faultBtns.length ? h('span', { class: 'small muted' }, 'Break:') : null, faultBtns),
    status,
    def.tryThis ? h('figcaption', { class: 'small' }, h('strong', {}, 'Try it: '), def.tryThis) : null,
  );

  // Only run while on screen, so a long page of demos stays light.
  let visible = false;
  const io = new IntersectionObserver((es) => (visible = es.some((e) => e.isIntersecting)));
  io.observe(root);
  let raf = 0;
  let last = performance.now();
  let frame = 0;
  const loop = (now: number) => {
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (visible) {
      for (let t = 0; t < real; t += DT) sim.tick(DT);
      view.update(now);
      editor.refresh();
      if (frame++ % 6 === 0) {
        const notes: string[] = [];
        if (!sim.powered) notes.push('Power is off.');
        if (sim.relay?.fuseBlown) notes.push('The control fuse blew: a dead short from L1 to N. Press Reset.');
        const recent = sim.world.events.filter((e) => sim.world.t - e.t < 6).slice(-2);
        for (const e of recent) notes.push(e.text);
        const txt = notes.join(' ');
        if (status.textContent !== txt) status.textContent = txt;
        status.classList.toggle('warn', notes.length > 0);
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    root,
    stop: () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    },
  };
}
