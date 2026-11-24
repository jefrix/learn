// The Tutorial and Rules of thumb pages: every link, live example and picture
// they mention must exist, and each live example must behave as its text says.
import { describe, it, expect } from 'vitest';
import { guides, demos, images } from '../src/data/guides';
import { machines } from '../src/data';
import { Sim } from '../src/engine/sim';
import { parseRungs } from '../src/engine/rung';

const helpFiles = import.meta.glob('../src/data/help/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const helpIds = new Set(Object.keys(helpFiles).map((p) => p.split('/').pop()!.replace(/\.md$/, '')));

const DT = 0.05;
function run(sim: Sim, seconds: number) {
  for (let t = 0; t < seconds; t += DT) sim.tick(DT);
}
function demoSim(key: string) {
  const d = demos[key];
  const sim = new Sim(machines[d.machine]);
  sim.setRelay(d.text);
  run(sim, 0.5);
  return sim;
}
function tap(sim: Sim, tag: string) {
  sim.press(tag);
  run(sim, 0.3);
  sim.release(tag);
  run(sim, 0.3);
}

describe('guide pages', () => {
  for (const g of Object.values(guides)) {
    it(`${g.id}: every help-card link, demo and picture exists`, () => {
      for (const [, id] of g.md.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) expect(helpIds.has(id), `help card ${id}`).toBe(true);
      for (const [, kind, key] of g.md.matchAll(/\{\{(demo|img):([a-z0-9-]+)\}\}/g)) {
        if (kind === 'demo') expect(demos[key], `demo ${key}`).toBeDefined();
        else expect(images[key], `image ${key}`).toBeDefined();
      }
    });
    it(`${g.id}: section anchors are unique`, () => {
      const ids = [...g.md.matchAll(/\{#([a-z0-9-]+)\}/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }

  it('links between guides point at real anchors', () => {
    const anchors: Record<string, Set<string>> = {};
    for (const g of Object.values(guides)) anchors[g.id] = new Set([...g.md.matchAll(/\{#([a-z0-9-]+)\}/g)].map((m) => m[1]));
    for (const g of Object.values(guides)) {
      for (const [, page, anchor] of g.md.matchAll(/\]\(#\/(tutorial|basics)\/([a-z0-9-]+)\)/g)) expect(anchors[page].has(anchor), `${page}/${anchor}`).toBe(true);
    }
  });

  it('every demo uses a real machine and parses', () => {
    for (const [key, d] of Object.entries(demos)) {
      expect(machines[d.machine], key).toBeDefined();
      expect(() => parseRungs(d.text), key).not.toThrow();
      const sim = demoSim(key);
      expect(sim.relay?.net.problems ?? [], key).toEqual([]);
    }
  });
});

describe('live examples behave as the rules say', () => {
  it('series lamp needs both buttons; parallel lamp needs either', () => {
    const sim = demoSim('series-parallel');
    sim.press('SB1');
    run(sim, 0.3);
    expect(sim.sig.b('H1')).toBe(false);
    expect(sim.sig.b('H2')).toBe(true);
    sim.press('SB2');
    run(sim, 0.3);
    expect(sim.sig.b('H1')).toBe(true);
  });

  it('two stations: either start starts, either stop stops, and it seals in', () => {
    const sim = demoSim('two-stations');
    tap(sim, 'SB4');
    expect(sim.sig.b('KM1')).toBe(true);
    tap(sim, 'SB1');
    expect(sim.sig.b('KM1')).toBe(false);
    tap(sim, 'SB2');
    expect(sim.sig.b('KM1')).toBe(true);
    tap(sim, 'SB3');
    expect(sim.sig.b('KM1')).toBe(false);
  });

  it('a broken wire to a stop stops the fan and keeps it off', () => {
    const sim = demoSim('two-stations');
    tap(sim, 'SB2');
    sim.inject(demos['two-stations'].faults![0].fault);
    run(sim, 0.3);
    expect(sim.sig.b('KM1')).toBe(false);
    tap(sim, 'SB4');
    expect(sim.sig.b('KM1')).toBe(false);
  });

  it('a broken wire to Start B leaves station A working', () => {
    const sim = demoSim('two-stations');
    sim.inject(demos['two-stations'].faults![1].fault);
    tap(sim, 'SB4');
    expect(sim.sig.b('KM1')).toBe(false);
    tap(sim, 'SB2');
    expect(sim.sig.b('KM1')).toBe(true);
  });

  it('the fan stays off after a power loss', () => {
    const sim = demoSim('two-stations');
    tap(sim, 'SB2');
    sim.setPower(false);
    run(sim, 0.3);
    sim.setPower(true);
    run(sim, 0.5);
    expect(sim.sig.b('KM1')).toBe(false);
  });

  it('the interlock keeps reverse out while forward runs', () => {
    const sim = demoSim('interlock');
    tap(sim, 'SB2');
    expect(sim.sig.b('KM1')).toBe(true);
    tap(sim, 'SB3');
    expect(sim.sig.b('KM2')).toBe(false);
    tap(sim, 'SB1');
    tap(sim, 'SB3');
    expect(sim.sig.b('KM2')).toBe(true);
    expect(sim.sig.b('KM1')).toBe(false);
  });
});
