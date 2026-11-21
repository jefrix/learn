// Every mission must be solvable: its reference solution passes every test,
// its walkthrough meets every objective, and its starter does not already pass.
import { describe, it, expect } from 'vitest';
import { missions, machines } from '../src/data';
import { commission, runScenario, ObjectiveWatcher, type Logic } from '../src/engine/mission/runner';
import { parseRungs } from '../src/engine/rung';
import { RUN_ON_ON_DELAY } from '../src/data/missions/ch1/basics';
import type { Mission } from '../src/engine/mission/types';
import { buildPlc } from '../src/engine/ladder/program';

const helpFiles = import.meta.glob('../src/data/help/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const helpIds = new Set(Object.keys(helpFiles).map((p) => p.split('/').pop()!.replace(/\.md$/, '')));

function logicFor(m: Mission, text: string): Logic {
  if (m.engine === 'relay') return { relay: text };
  const machine = machines[m.machine];
  return { plc: () => buildPlc(text, machine) };
}

describe('mission content', () => {
  it('has missions in both chapters with unique ids', () => {
    const ids = missions.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(missions.some((m) => m.chapter === 1)).toBe(true);
  });

  for (const m of missions) {
    describe(`${m.id} ${m.title}`, () => {
      const machine = machines[m.machine];

      it('names a machine that exists, and help cards that exist', () => {
        expect(machine, `machine ${m.machine}`).toBeDefined();
        for (const id of m.help) expect(helpIds.has(id), `help card ${id}`).toBe(true);
      });

      it('has a starter and reference that parse', () => {
        if (m.engine === 'relay') {
          expect(() => parseRungs(m.starter)).not.toThrow();
          expect(() => parseRungs(m.reference)).not.toThrow();
        } else {
          expect(() => buildPlc(m.starter, machine)).not.toThrow();
          expect(() => buildPlc(m.reference, machine)).not.toThrow();
        }
      });

      it('is solved by its reference solution', () => {
        const report = commission(m, machine, logicFor(m, m.reference));
        const failed = report.results.filter((r) => !r.pass).map((r) => `${r.name}: ${r.say} ${JSON.stringify(r.actual)}`);
        expect(failed).toEqual([]);
        if (m.engine === 'relay') expect(parseRungs(m.reference).length).toBeGreaterThan(0);
      });

      if (m.observe?.length) {
        it('has a walkthrough that meets every objective', () => {
          expect(m.walkthrough, 'walkthrough').toBeDefined();
          const w = new ObjectiveWatcher(m.observe!);
          runScenario(machine, logicFor(m, m.reference), m.walkthrough!, { init: m.init, onTick: (sim) => w.check(sim) });
          const missing = m.observe!.filter((o) => !w.met.has(o.id)).map((o) => o.text);
          expect(missing).toEqual([]);
        });
      }

      if (m.quiz) {
        it('has a quiz answer in range', () => {
          expect(m.quiz!.answer).toBeGreaterThanOrEqual(0);
          expect(m.quiz!.answer).toBeLessThan(m.quiz!.options.length);
        });
      }

      if (m.tests.length && m.kind === 'build' && m.starter !== m.reference) {
        it('is not already solved by the starter', () => {
          expect(commission(m, machine, logicFor(m, m.starter)).pass).toBe(false);
        });
      }

      if (m.hiddenFaults?.length && m.tests.length) {
        it('fails while the hidden fault is still in the machine', () => {
          const faults = m.hiddenFaults!.map((f) => f.fault);
          expect(commission(m, machine, logicFor(m, m.reference), faults).pass).toBe(false);
        });
      }

      if (m.editable === 'presets' && m.tests.length) {
        it('needs the preset fixed: the starter fails', () => {
          expect(commission(m, machine, logicFor(m, m.starter)).pass).toBe(false);
        });
      }
    });
  }

  it('1.9 also passes with the press-style on-delay solution', () => {
    const m = missions.find((x) => x.id === '1.9')!;
    expect(commission(m, machines[m.machine], { relay: RUN_ON_ON_DELAY }).pass).toBe(true);
  });

  it('1.3 fails a stop wired normally open', () => {
    const m = missions.find((x) => x.id === '1.3')!;
    // A "stop" that has to close to stop: a NO stop pulling in a stop relay that opens the rung.
    const noStop = 'NO(SB1)COIL(KA1);\nNC(KA1)[NO(SB2),NO(KM1)]COIL(KM1);\nNO(KM1)LAMP(H1);';
    const r = commission(m, machines[m.machine], { relay: noStop });
    const brokenWire = r.results.find((x) => x.name.startsWith('The stop wire breaks'));
    expect(brokenWire?.pass).toBe(false);
  });
});
