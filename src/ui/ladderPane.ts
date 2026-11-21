// The PLC side of a mission: ladder editor, verify messages, step-scan view,
// live tag table, and the hardwired circuit the PLC can't touch.

import { clear, h, toast } from './dom';
import { RungEditor } from './editor';
import { ladderKit } from './ladderKit';
import { relayKit } from './relayKit';
import type { LogicPane } from './missionScreen';
import type { Mission } from '../engine/mission/types';
import type { MachineDef } from '../engine/machine';
import type { Sim } from '../engine/sim';
import { analyze, buildPlc, joinProgram, splitProgram, LadderPlc, type Analysis } from '../engine/ladder/program';
import type { TimerVal, CounterVal } from '../engine/ladder/engine';
import type { Rung } from '../engine/rung';

const DT = 0.05;

export function ladderPane(
  mission: Mission,
  machine: MachineDef,
  getSim: () => Sim,
  initialText: string,
  opts: { onChange: (t: string) => void; onHelp: (id: string) => void },
): LogicPane {
  let text = initialText;
  let analysis: Analysis = analyze(text, machine);
  let plc: LadderPlc | null = null;
  /** Step-scan phase: null = between scans; 'in' = inputs read; n = rung n solved; 'out' = outputs written. */
  let phase: null | 'in' | number | 'out' = null;

  const verifyBox = h('div', { class: 'verify', 'aria-live': 'polite' });
  const kit = ladderKit(() => plc, () => analysis.tags, mission.palette);
  const editor = new RungEditor({
    kit,
    rungs: analysis.rungs,
    locked: 0,
    editable: mission.editable,
    onChange: (rungs: Rung[]) => {
      const { decls } = splitProgram(text);
      text = joinProgram(decls, rungs);
      apply();
      opts.onChange(text);
    },
    onHelp: opts.onHelp,
  });

  function apply() {
    const a = analyze(text, machine);
    analysis = a;
    if (!a.errors.length) {
      if (plc) plc.reload(a);
      else {
        plc = new LadderPlc(a);
        getSim().setPlc(plc);
      }
    }
    showVerify();
    renderTags(true);
  }

  function showVerify() {
    clear(verifyBox);
    if (analysis.errors.length) {
      verifyBox.appendChild(h('div', { class: 'problem' }, 'Verify found errors. The PLC keeps running the last good program until they are fixed:'));
      for (const e of analysis.errors) verifyBox.appendChild(h('div', { class: 'problem' }, `• ${e}`));
    }
    for (const w of analysis.warnings) verifyBox.appendChild(h('div', { class: 'warning' }, `⚠ ${w}`));
    if (plc?.fault) verifyBox.appendChild(h('div', { class: 'problem' }, `PLC major fault: ${plc.fault} Outputs are off. Fix the program, then cycle power.`));
  }

  // ---------- scan view ----------
  const scanBox = h('div', { class: 'scan-view' });
  function renderScan() {
    clear(scanBox);
    const e = plc?.engine;
    if (!e) return;
    const ins = analysis.tags.filter((t) => t.usage === 'input');
    const outs = analysis.tags.filter((t) => t.usage === 'output');
    const cell = (v: unknown) => (typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : '—');
    const col = (title: string, list: typeof ins, src: Map<string, unknown>, active: boolean) =>
      h(
        'div',
        { class: 'scan-col' + (active ? ' active' : '') },
        h('h4', {}, title),
        h('table', {}, list.map((t) => h('tr', {}, h('td', { class: 'mono' }, t.name), h('td', { class: 'mono' + (src.get(t.name) === true ? ' on' : '') }, cell(src.get(t.name)))))),
      );
    const n = analysis.rungs.length;
    const status =
      phase === null
        ? 'Between scans. Pause, then press Step scan to read the inputs.'
        : phase === 'in'
          ? 'Input image read. Next: solve rung 0.'
          : phase === 'out'
            ? 'Output image written. Next: the outputs act on the machine.'
            : `Solved rung ${phase}. Next: ${phase + 1 < n ? `rung ${phase + 1}` : 'write the output image'}.`;
    scanBox.append(
      h('p', { class: 'scan-status' }, h('strong', {}, 'Scan: '), status),
      h(
        'div',
        { class: 'scan-cols' },
        col('1. Input image', ins, e.inputImage, phase === 'in'),
        h('div', { class: 'scan-col' + (typeof phase === 'number' ? ' active' : '') }, h('h4', {}, '2. Solve rungs'), h('p', { class: 'small' }, typeof phase === 'number' ? `Rung ${phase} of ${n - 1}` : `${n} rungs, top to bottom`), h('p', { class: 'small muted' }, `Scans so far: ${e.scans}`)),
        col('3. Output image', outs, e.outputImage, phase === 'out'),
      ),
    );
  }

  // ---------- tag table ----------
  const tagBox = h('div', { class: 'tag-table' });
  let tagRows = new Map<string, HTMLElement>();
  function renderTags(rebuild = false) {
    const e = plc?.engine;
    if (rebuild || tagRows.size === 0) {
      clear(tagBox);
      tagRows = new Map();
      const table = h('table', {}, h('tr', {}, h('th', {}, 'Tag'), h('th', {}, 'Type'), h('th', {}, 'Use'), h('th', {}, 'Value')));
      for (const t of analysis.tags) {
        const v = h('td', { class: 'mono' });
        tagRows.set(t.name, v);
        table.appendChild(h('tr', {}, h('td', { class: 'mono' }, t.name, t.desc ? h('div', { class: 'small muted' }, t.desc) : null), h('td', { class: 'mono small' }, t.type), h('td', { class: 'small' }, t.usage === 'internal' ? '' : `${t.usage}${t.address ? ' ' + t.address : ''}`), v));
      }
      tagBox.appendChild(table);
      if (mission.editable === true) tagBox.appendChild(addTagForm());
    }
    if (!e) return;
    for (const [name, cellEl] of tagRows) {
      const t = e.tags.get(name);
      if (!t) continue;
      let str: string;
      if (t.def.type === 'TIMER') {
        const v = t.v as TimerVal;
        str = `PRE ${v.PRE}  ACC ${v.ACC}  ${v.EN ? 'EN ' : ''}${v.TT ? 'TT ' : ''}${v.DN ? 'DN' : ''}`;
      } else if (t.def.type === 'COUNTER') {
        const v = t.v as CounterVal;
        str = `PRE ${v.PRE}  ACC ${v.ACC}  ${v.DN ? 'DN ' : ''}${v.OV ? 'OV ' : ''}${v.UN ? 'UN' : ''}`;
      } else if (t.def.type === 'BOOL') str = t.v ? '1' : '0';
      else str = Number.isInteger(t.v as number) ? String(t.v) : (t.v as number).toFixed(3);
      if (cellEl.textContent !== str) cellEl.textContent = str;
      cellEl.classList.toggle('on', t.v === true);
    }
  }
  function addTagForm() {
    const name = h('input', { class: 'mono', placeholder: 'New_Tag', 'aria-label': 'New tag name', autocomplete: 'off', spellcheck: 'false' });
    const type = h('select', { 'aria-label': 'Data type' }, ['BOOL', 'DINT', 'REAL', 'TIMER', 'COUNTER'].map((t) => h('option', { value: t }, t)));
    const btn = h('button', {
      class: 'btn small',
      onclick: () => {
        const n = name.value.trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) {
          toast('Tag names start with a letter and use letters, digits and _.', 'warn');
          return;
        }
        if (analysis.tags.some((t) => t.name === n)) {
          toast(`${n} already exists.`, 'warn');
          return;
        }
        text = `TAG ${n} ${type.value}\n${text}`;
        apply();
        opts.onChange(text);
      },
    }, 'Create tag');
    return h('div', { class: 'insp-row' }, h('span', { class: 'small muted' }, 'Tags used in rungs are created for you. Declare REALs here:'), name, type, btn);
  }

  // ---------- hardwired circuit ----------
  let hardEditor: RungEditor | null = null;
  const hardBox = h('details', { class: 'hardwired' });
  if (machine.hardwired) {
    const hk = relayKit(machine, getSim, () => [], undefined, (machine as MachineDef & { volts?: string }).volts ?? '24 VDC');
    hardEditor = new RungEditor({ kit: hk, rungs: getSim().hardRungs, locked: getSim().hardRungs.length, editable: false, onHelp: opts.onHelp });
    hardBox.append(h('summary', {}, 'Hardwired circuit (not in the PLC; you can’t edit it)'), h('p', { class: 'small muted' }, 'E-stops, overloads and safety relays stay hardwired. PLC outputs appear here as contacts that close when the output is on.'), hardEditor.root);
  }

  let showing = 'Scan';
  const views: Record<string, HTMLElement> = { Scan: scanBox, Tags: tagBox };
  const tabBtns = Object.keys(views).map((k) =>
    h('button', {
      class: 'btn small seg' + (k === showing ? ' active' : ''),
      onclick: () => {
        showing = k;
        tabBtns.forEach((b) => b.classList.toggle('active', b.textContent === k));
        for (const [nm, el] of Object.entries(views)) el.hidden = nm !== k;
        if (k === 'Tags') renderTags(true);
      },
    }, k === 'Scan' ? 'Scan' : 'Tags'),
  );
  tagBox.hidden = true;

  const root = h('div', { class: 'ladder-pane' }, verifyBox, editor.root, h('div', { class: 'seg-group', role: 'group', 'aria-label': 'PLC views' }, tabBtns), scanBox, tagBox, machine.hardwired ? hardBox : null);

  // Finish a half-done step scan before running freely again.
  function finishScan() {
    if (phase === null || !plc) return;
    const sim = getSim();
    const e = plc.engine;
    if (phase === 'in') phase = -1;
    if (typeof phase === 'number') {
      for (let i = phase + 1; i < analysis.rungs.length; i++) e.execRung(i);
      e.endScan();
      sim.writeOutputs();
      phase = 'out';
    }
    sim.finishTick(DT);
    phase = null;
  }

  let frame = 0;
  const pane: LogicPane = {
    root,
    stepsItself: true,
    refresh() {
      editor.refresh();
      hardEditor?.refresh();
      if (frame++ % 5 === 0) {
        if (showing === 'Scan') renderScan();
        else renderTags();
        if (plc?.fault && !verifyBox.textContent?.includes('major fault')) showVerify();
      }
    },
    text: () => text,
    logic: () => ({ plc: () => buildPlc(text, machine) }),
    problems: () => [...analysis.errors, ...analysis.warnings],
    attach(sim: Sim) {
      phase = null;
      analysis = analyze(text, machine);
      plc = analysis.errors.length ? null : new LadderPlc(analysis);
      if (plc) sim.setPlc(plc);
      editor.setRungs(analysis.rungs);
      hardEditor?.setRungs(sim.hardRungs);
      showVerify();
      renderTags(true);
    },
    reset(t: string) {
      text = t;
    },
    step() {
      const sim = getSim();
      if (!plc) {
        toast('Fix the Verify errors first.', 'warn');
        return;
      }
      const e = plc.engine;
      if (!e.running || !sim.powered) {
        toast('The PLC is not running (power off or faulted).', 'warn');
        return;
      }
      if (phase === null) {
        sim.readInputs();
        e.beginScan(DT);
        phase = 'in';
      } else if (phase === 'in' || typeof phase === 'number') {
        const next = phase === 'in' ? 0 : phase + 1;
        if (next < analysis.rungs.length) {
          try {
            e.execRung(next);
          } catch (ex) {
            plc.fault = (ex as Error).message;
            e.powerDown();
          }
          phase = next;
          editor.select({ ri: next, rung: true });
        } else {
          e.endScan();
          sim.writeOutputs();
          phase = 'out';
        }
      } else {
        sim.finishTick(DT);
        phase = null;
      }
      renderScan();
    },
    resume: finishScan,
  };
  return pane;
}
