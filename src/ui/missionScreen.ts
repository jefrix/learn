// One mission: the machine, the logic editor, sim controls and commissioning.

import { clear, clock, h, modal, toast } from './dom';
import { MachineView } from './machineView';
import { HelpPanel, renderMd } from './help';
import { RungEditor } from './editor';
import { relayKit } from './relayKit';
import * as save from './save';
import { missions, machines } from '../data';
import { Sim } from '../engine/sim';
import { parseRungs, printRungs, type Rung } from '../engine/rung';
import { applyInit, commission, ObjectiveWatcher, type CommissionReport, type Logic } from '../engine/mission/runner';
import type { Mission } from '../engine/mission/types';
import type { MachineDef } from '../engine/machine';
import { ladderPane } from './ladderPane';

export interface LogicPane {
  root: HTMLElement;
  refresh(): void;
  text(): string;
  logic(): Logic;
  problems(): string[];
  /** Rebuild the sim's controller after a reset. */
  attach(sim: Sim): void;
  /** One scan / one tick, for step mode. */
  step?(): void;
  /** Whether stepping is handled by the pane (ladder step-scan view). */
  stepsItself?: boolean;
}

const SPEEDS = [1, 10, 60, 600];
const DT = 0.05;

export function missionScreen(mission: Mission, host: HTMLElement, go: (hash: string) => void): () => void {
  const machine = machines[mission.machine] as MachineDef;
  const ms = save.mission(mission.id);
  const help = new HelpPanel();
  let speed = save.load().settings.speed ?? 1;
  let paused = false;
  let meter = false;
  let raf = 0;
  let sim!: Sim;
  const watcher = mission.observe ? new ObjectiveWatcher(mission.observe) : null;
  for (const id of ms.met ?? []) watcher?.met.add(id);
  const repaired = new Set(ms.repaired ?? []);
  let playerText = ms.text ?? mission.starter;

  // ---------- logic pane ----------
  let pane: LogicPane;
  const makeSim = () => {
    const sm = new Sim(machine);
    applyInit(sm, mission.init);
    for (const hf of mission.hiddenFaults ?? []) if (!repaired.has(hf.target)) sm.inject(hf.fault);
    return sm;
  };

  if (mission.engine === 'relay') {
    sim = makeSim();
    sim.setRelay(playerText);
    const kit = relayKit(machine, () => sim, () => collectInstr([...sim.hardRungs, ...sim.playerRungs]), mission.palette, (machine as MachineDef & { volts?: string }).volts ?? '120 VAC');
    const editor = new RungEditor({
      kit,
      rungs: [...sim.hardRungs, ...parseRungs(playerText)],
      locked: sim.hardRungs.length,
      editable: mission.editable,
      onChange: (rungs: Rung[]) => {
        const mine = rungs.slice(sim.hardRungs.length);
        playerText = printRungs(mine);
        sim.setRelay(mine);
        save.updateMission(mission.id, { text: playerText });
        showProblems();
      },
      onHelp: (id) => help.show(id),
      onRepair: mission.hiddenFaults?.length ? (t) => repair(t) : undefined,
      meterOn: () => meter,
    });
    const probBox = h('div', { class: 'problems', 'aria-live': 'polite' });
    const showProblems = () => {
      clear(probBox);
      for (const p of sim.relay?.net.problems ?? []) probBox.appendChild(h('div', { class: 'problem' }, `Rung ${p.rung}: ${p.message}`));
    };
    showProblems();
    pane = {
      root: h('div', {}, probBox, editor.root),
      refresh: () => editor.refresh(),
      text: () => playerText,
      logic: () => ({ relay: playerText }),
      problems: () => (sim.relay?.net.problems ?? []).map((p) => `Rung ${p.rung}: ${p.message}`),
      attach: (sm) => {
        sm.setRelay(playerText);
        editor.setRungs([...sm.hardRungs, ...parseRungs(playerText)]);
      },
    };
  } else {
    sim = makeSim();
    pane = ladderPane(mission, machine, () => sim, playerText, {
      onChange: (t) => {
        playerText = t;
        save.updateMission(mission.id, { text: t });
      },
      onHelp: (id) => help.show(id),
    });
    pane.attach(sim);
  }

  function repair(target: string) {
    const hf = (mission.hiddenFaults ?? []).find((f) => f.target === target && !repaired.has(target));
    if (!hf) {
      toast(`You check ${target}. It tests good.`);
      return;
    }
    repaired.add(target);
    sim.clearFault(hf.fault);
    save.updateMission(mission.id, { repaired: [...repaired] });
    modal('Found it', h('p', {}, hf.found));
  }

  // ---------- machine and controls ----------
  const view = new MachineView(machine, () => sim);
  view.guard = (_part, what) => {
    if (what === 'clearJam') {
      const sel = machine.parts.find((p) => p.type === 'selector' || p.type === 'switch') as { signal: string; positions?: string[] } | undefined;
      const running = machine.parts.some((p) => (p.type === 'pump' || p.type === 'motor') && sim.sig.b(`${p.id}.running`));
      const mode = sel ? sim.sig.s(sel.signal) : '';
      if (running || (sel && mode !== 'off' && mode !== 'stop')) {
        return 'Turn the selector to Off (or Stop) before you put hands near the pump. On real equipment you lock out and tag out the disconnect first: a selector switch is not an isolation point.';
      }
    }
    return null;
  };
  view.onAction = () => checkObjectives();

  const clockEl = h('span', { class: 'clock mono', 'aria-label': 'Sim time' }, '0:00');
  const speedBtns = SPEEDS.map((sp) =>
    h('button', { class: 'btn small seg' + (sp === speed ? ' active' : ''), onclick: () => setSpeed(sp), 'aria-pressed': String(sp === speed) }, `×${sp}`),
  );
  const pauseBtn = h('button', { class: 'btn small', onclick: () => togglePause() }, 'Pause');
  const stepBtn = h('button', { class: 'btn small', onclick: () => stepOnce(), title: pane.stepsItself ? 'Run one PLC scan' : 'Advance one tick' }, pane.stepsItself ? 'Step scan' : 'Step');
  const powerBtn = h('button', { class: 'btn small', onclick: () => togglePower() }, 'Power off');
  const meterBtn = h('button', { class: 'btn small', onclick: () => toggleMeter(), 'aria-pressed': 'false', title: 'Tap a wire in the drawing to read its voltage' }, 'Meter');
  const fuseBtn = h('button', { class: 'btn small danger', hidden: true, onclick: () => { if (sim.relay) sim.relay.fuseBlown = false; } }, 'Replace fuse');
  const status = h('div', { class: 'sim-status', 'aria-live': 'polite' });

  function setSpeed(sp: number) {
    speed = sp;
    speedBtns.forEach((b, i) => {
      b.classList.toggle('active', SPEEDS[i] === sp);
      b.setAttribute('aria-pressed', String(SPEEDS[i] === sp));
    });
    save.load().settings.speed = sp;
    save.persist();
  }
  function togglePause() {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Run' : 'Pause';
  }
  function stepOnce() {
    if (!paused) togglePause();
    if (pane.step) pane.step();
    else sim.tick(DT);
  }
  function togglePower() {
    sim.setPower(!sim.powered);
    powerBtn.textContent = sim.powered ? 'Power off' : 'Power on';
  }
  function toggleMeter() {
    meter = !meter;
    meterBtn.classList.toggle('active', meter);
    meterBtn.setAttribute('aria-pressed', String(meter));
    root.classList.toggle('meter-on', meter);
    if (meter) toast('Meter on: tap any wire in the drawing to read it.');
  }

  // ---------- objectives / goal ----------
  const goalBox = h('div', { class: 'goal' });
  function renderGoal() {
    clear(goalBox);
    goalBox.appendChild(h('ul', { class: 'goal-list' }, mission.goal.map((g) => h('li', {}, g))));
    if (watcher) {
      goalBox.appendChild(
        h(
          'ul',
          { class: 'objectives' },
          watcher.objectives.map((o) => h('li', { class: watcher.met.has(o.id) ? 'met' : '' }, h('span', { class: 'check', 'aria-hidden': 'true' }, watcher.met.has(o.id) ? '✓' : '○'), o.text)),
        ),
      );
    }
    if (mission.hiddenFaults?.length) {
      const left = mission.hiddenFaults.filter((f) => !repaired.has(f.target)).length;
      goalBox.appendChild(h('p', { class: 'small muted' }, left ? `Fault not found yet. Select a device in the drawing and use "Inspect and repair".` : 'Fault repaired.'));
    }
  }
  function checkObjectives() {
    if (!watcher) return;
    const before = watcher.met.size;
    watcher.check(sim);
    if (watcher.met.size !== before) {
      save.updateMission(mission.id, { met: [...watcher.met] });
      renderGoal();
      toast('Objective met.');
    }
  }

  // ---------- commissioning ----------
  function runCommission() {
    const busy = modal('Commissioning', h('p', {}, 'Running the test scenarios…'), []);
    setTimeout(() => {
      let report: CommissionReport;
      try {
        const faults = (mission.hiddenFaults ?? []).filter((f) => !repaired.has(f.target)).map((f) => f.fault);
        report = commission(mission, machine, pane.logic(), faults, pane.problems());
      } catch (e) {
        busy();
        modal('Could not commission', h('p', {}, (e as Error).message));
        return;
      }
      busy();
      showReport(report);
    }, 30);
  }

  function showReport(report: CommissionReport) {
    const objectivesOk = !watcher || watcher.done;
    const quizOk = !mission.quiz || ms.quizOk;
    const faultsOk = (mission.hiddenFaults ?? []).every((f) => repaired.has(f.target));
    const pass = report.pass && objectivesOk && !!quizOk && faultsOk;
    const body = h('div', { class: 'report' });
    if (report.problems.length) body.appendChild(h('div', { class: 'problems' }, report.problems.map((p) => h('div', { class: 'problem' }, p))));
    body.appendChild(
      h(
        'ul',
        { class: 'results' },
        report.results.map((r) =>
          h(
            'li',
            { class: r.pass ? 'pass' : 'fail' },
            h('span', { class: 'mark', 'aria-hidden': 'true' }, r.pass ? '✓' : '✗'),
            h('div', {}, h('strong', {}, r.name), r.pass ? null : h('p', {}, r.say ?? ''), r.pass || !r.actual ? null : h('p', { class: 'small muted mono' }, Object.entries(r.actual).map(([k, v]) => `${k} = ${fmtVal(v)}`).join('   '))),
          ),
        ),
      ),
    );
    if (!objectivesOk) body.appendChild(h('p', { class: 'fail-note' }, 'Some objectives in the goal list are not met yet. Make them happen in the live sim.'));
    if (!faultsOk) body.appendChild(h('p', { class: 'fail-note' }, 'The fault is still in the machine. Find it with the meter and repair it.'));
    if (mission.quiz && !ms.quizOk) body.appendChild(h('p', { class: 'fail-note' }, 'Answer the question in the goal panel to finish.'));
    if (pass) {
      save.updateMission(mission.id, { status: 'done' });
      body.appendChild(h('div', { class: 'real-world-note' }, h('h4', {}, 'Real world'), renderMd(mission.realWorld)));
    }
    const idx = missions.findIndex((m) => m.id === mission.id);
    const next = missions[idx + 1];
    modal(pass ? 'Commissioned' : 'Not yet', body, pass && next ? [{ label: 'Stay here' }, { label: `Next: ${next.id} ${next.title}`, primary: true, onClick: () => go(`#/m/${next.id}`) }] : [{ label: 'Back to work', primary: true }]);
  }

  // ---------- quiz ----------
  function quizBox() {
    const q = mission.quiz;
    if (!q) return null;
    const box = h('div', { class: 'quiz' }, h('p', {}, h('strong', {}, q.question)));
    q.options.forEach((opt, i) => {
      box.appendChild(
        h('button', {
          class: 'btn quiz-opt' + (ms.quizOk && i === q.answer ? ' right' : ''),
          onclick: () => {
            if (i === q.answer) {
              save.updateMission(mission.id, { quizOk: true });
              ms.quizOk = true;
              toast('Right.');
              modal('Right', renderMd(q.explain));
              box.querySelectorAll('.quiz-opt').forEach((b, j) => b.classList.toggle('right', j === q.answer));
            } else toast('Not that one. Watch the machine and the drawing again.', 'warn');
          },
        }, opt),
      );
    });
    return box;
  }

  // ---------- layout ----------
  const head = h(
    'div',
    { class: 'mission-head' },
    h('a', { href: '#/', class: 'btn small' }, '← Missions'),
    h('div', { class: 'mission-title' }, h('span', { class: 'mission-id' }, mission.id), h('h1', {}, mission.title), h('span', { class: 'site' }, mission.site)),
    h(
      'div',
      { class: 'head-actions' },
      h('button', { class: 'btn small', onclick: () => showBrief() }, 'Brief'),
      h('button', { class: 'btn small', onclick: () => showHints() }, 'Hint'),
      h('button', { class: 'btn small', onclick: () => help.showContent('Real world', mission.realWorld) }, 'Real world'),
      h('button', { class: 'btn small', onclick: () => resetLogic() }, 'Start over'),
      h('button', { class: 'btn primary', onclick: () => runCommission() }, 'Commission'),
    ),
  );

  const controls = h('div', { class: 'sim-controls' }, clockEl, pauseBtn, stepBtn, h('span', { class: 'seg-group', role: 'group', 'aria-label': 'Sim speed' }, speedBtns), powerBtn, mission.engine === 'relay' ? meterBtn : null, fuseBtn);
  const machineCard = h('section', { class: 'card machine-card', 'aria-label': 'Machine' }, controls, h('div', { class: 'machine-wrap' }, view.svg), status);
  const logicCard = h('section', { class: 'card logic-card', 'aria-label': 'Logic' }, h('div', { class: 'card-head' }, h('h2', {}, mission.engine === 'relay' ? 'Schematic' : 'Ladder'), mission.tip ? h('span', { class: 'small muted' }, mission.tip) : null), pane.root);
  const breakBox = mission.breakables?.length
    ? h(
        'div',
        { class: 'breakables' },
        h('h4', {}, 'Break something'),
        h(
          'div',
          { class: 'insp-row' },
          mission.breakables.map((b) =>
            h('button', {
              class: 'btn small',
              onclick: () => {
                sim.inject(b.fault);
                toast(`${b.label}.`);
                checkObjectives();
              },
            }, b.label),
          ),
        ),
      )
    : null;
  const side = h('div', { class: 'goal-card card' }, h('h2', {}, 'Work order'), goalBox, breakBox, quizBox());
  const root = h('div', { class: 'mission' }, head, h('div', { class: 'work' }, h('div', { class: 'col-left' }, machineCard, side), logicCard), help.root);
  host.appendChild(root);
  renderGoal();

  function showBrief() {
    modal(`${mission.id} ${mission.title}`, h('div', {}, renderMd(mission.brief), h('h4', {}, 'Your job'), h('ul', {}, mission.goal.map((g) => h('li', {}, g)))), [{ label: 'Start', primary: true }]);
  }
  let hintN = ms.hintsUsed ?? 0;
  function showHints() {
    if (!mission.hints.length) {
      toast('No hints for this one.');
      return;
    }
    hintN = Math.min(mission.hints.length, hintN + 1);
    save.updateMission(mission.id, { hintsUsed: hintN });
    modal('Hints', h('ol', {}, mission.hints.slice(0, hintN).map((t) => h('li', {}, renderMd(t)))), hintN < mission.hints.length ? [{ label: 'Close' }, { label: 'Another hint', onClick: () => showHints() }] : [{ label: 'Close' }]);
  }
  function resetLogic() {
    modal('Start over?', h('p', {}, 'This puts the logic back to how the mission started and restarts the machine.'), [
      { label: 'Cancel' },
      {
        label: 'Start over',
        primary: true,
        onClick: () => {
          playerText = mission.starter;
          save.updateMission(mission.id, { text: undefined });
          sim = makeSim();
          pane.attach(sim);
          if (mission.engine === 'relay') sim.setRelay(playerText);
        },
      },
    ]);
  }
  if (!ms.text && ms.status !== 'done') showBrief();
  if (import.meta.env.DEV) (window as unknown as { __cr: unknown }).__cr = { sim: () => sim, pane, view };

  // ---------- loop ----------
  let last = performance.now();
  let acc = 0;
  let frame = 0;
  const loop = (now: number) => {
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) {
      acc += real * speed;
      // Run as many ticks as fit in ~12 ms; if the machine can't keep up with
      // the chosen speed, the sim simply runs slower rather than freezing the page.
      let n = 0;
      const budget = performance.now() + 12;
      while (acc >= DT) {
        sim.tick(DT);
        acc -= DT;
        n++;
        if (watcher && n % 4 === 0) checkObjectives();
        if ((n & 7) === 0 && performance.now() > budget) {
          acc = 0;
          break;
        }
      }
    }
    if (watcher) checkObjectives();
    view.update(now);
    pane.refresh();
    if (frame++ % 6 === 0) {
      clockEl.textContent = clock(sim.t);
      fuseBtn.hidden = !sim.relay?.fuseBlown;
      const notes: string[] = [];
      if (!sim.powered) notes.push('Power is off.');
      if (sim.relay?.fuseBlown) notes.push('The control fuse blew: there is a dead short from L1 to N. Fix the wiring, then replace the fuse.');
      if (sim.relay?.chatter) notes.push('A relay is chattering: it switches its own coil off and on.');
      const recent = sim.world.events.filter((e) => sim.world.t - e.t < 6).slice(-2);
      for (const e of recent) notes.push(e.text);
      const txt = notes.join(' ');
      if (status.textContent !== txt) status.textContent = txt;
      status.classList.toggle('warn', notes.length > 0);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(raf);
}

function fmtVal(v: unknown) {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (v === undefined) return '—';
  return String(v);
}

function collectInstr(rungs: Rung[]): { op: string; args: string[] }[] {
  const out: { op: string; args: string[] }[] = [];
  const walk = (s: Rung['els']) =>
    s.forEach((e) => {
      if ('branch' in e) e.branch.forEach(walk);
      else out.push(e);
    });
  rungs.forEach((r) => walk(r.els));
  return out;
}
