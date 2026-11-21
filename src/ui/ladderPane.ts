// Placeholder until the ladder engine lands (Chapter 2).
import { h } from './dom';
import type { LogicPane } from './missionScreen';
import type { Mission } from '../engine/mission/types';
import type { MachineDef } from '../engine/machine';
import type { Sim } from '../engine/sim';

export function ladderPane(
  _mission: Mission,
  _machine: MachineDef,
  _getSim: () => Sim,
  text: string,
  _opts: { onChange: (t: string) => void; onHelp: (id: string) => void },
): LogicPane {
  return {
    root: h('p', {}, 'The ladder editor arrives with Chapter 2.'),
    refresh: () => {},
    text: () => text,
    logic: () => ({}),
    problems: () => [],
    attach: () => {},
  };
}
