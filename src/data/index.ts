// Content registry. Drop a mission file in missions/ch1 or missions/ch2, or a
// machine file in machines/, and it's picked up here: no engine edits needed.

import type { MachineDef } from '../engine/machine';
import type { Mission } from '../engine/mission/types';

const missionFiles = import.meta.glob('./missions/**/*.ts', { eager: true }) as Record<string, { default?: Mission | Mission[] }>;
const machineFiles = import.meta.glob('./machines/*.ts', { eager: true }) as Record<string, { default?: MachineDef | MachineDef[] }>;

export const missions: Mission[] = Object.values(missionFiles)
  .flatMap((m) => (Array.isArray(m.default) ? m.default : m.default ? [m.default] : []))
  .sort((a, b) => a.chapter - b.chapter || a.order - b.order);

export const machines: Record<string, MachineDef> = {};
for (const m of Object.values(machineFiles)) {
  const list = Array.isArray(m.default) ? m.default : m.default ? [m.default] : [];
  for (const d of list) machines[d.id] = d;
}

export const chapters = [
  { n: 1 as const, title: 'Relay Room', blurb: 'Wire pushbuttons, relays, contactors, timers and floats. Then read the real screw press panel.' },
  { n: 2 as const, title: 'PLC Room', blurb: 'Rebuild it in Allen-Bradley-style ladder, close the press safety gap, and run a water treatment skid.' },
];

export function missionById(id: string) {
  return missions.find((m) => m.id === id);
}
