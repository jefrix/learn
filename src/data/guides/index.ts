// Guide pages: the Tutorial and Rules of thumb. The words live in the .md files
// next to this one. A line `{{demo:key}}` places a live example from `demos`,
// and `{{img:key}}` places a picture from `images`.

import type { DemoDef } from '../../ui/demo';
import tutorialMd from './tutorial.md?raw';
import basicsMd from './basics.md?raw';
import missionShot from '../../../assets/tutorial/mission-screen.webp';
import ladderShot from '../../../assets/tutorial/ladder-screen.webp';

export interface Guide {
  id: 'tutorial' | 'basics';
  md: string;
}

export const guides: Record<Guide['id'], Guide> = {
  tutorial: { id: 'tutorial', md: tutorialMd },
  basics: { id: 'basics', md: basicsMd },
};

export const demos: Record<string, DemoDef> = {
  'series-parallel': {
    machine: 'brief-lamps',
    text: 'NO(SB1)NO(SB2)LAMP(H1);\n[NO(SB1),NO(SB2)]LAMP(H2);',
    tryThis: 'Press A, then B. Only the parallel lamp lights. Shift+click A to hold it, then press B: now both light. Series needs both; parallel needs either.',
  },
  'two-stations': {
    machine: 'brief-motor',
    text: 'NC(SB1)NC(SB3)[NO(SB2),NO(SB4),NO(KM1)]COIL(KM1);\nNO(KM1)LAMP(H1);',
    faults: [
      { label: 'Break: wire to Stop A', fault: { type: 'open', device: 'SB1' } },
      { label: 'Break: wire to Start B', fault: { type: 'open', device: 'SB4' } },
    ],
    tryThis: 'Start the fan from either station and stop it from either. Then break a wire and see which way it fails. Press Reset to repair everything.',
  },
  interlock: {
    machine: 'brief-reverse',
    text: 'NC(SB1)[NO(SB2),NO(KM1)]NC(KM2)COIL(KM1);\nNC(SB1)[NO(SB3),NO(KM2)]NC(KM1)COIL(KM2);',
    faults: [{ label: 'Weld KM1 contacts', fault: { type: 'welded', device: 'KM1' } }],
    tryThis: 'Run Forward, then press Reverse: nothing happens until you press Stop, because KM1\'s NC contact holds KM2 out. Welding KM1 shows why real starters add a mechanical interlock as well.',
  },
  sandbox: {
    machine: 'brief-lamps',
    text: 'NO(SB1)LAMP(H1);',
    editable: true,
    tryThis: 'Follow the four steps above. Nothing here is graded, and Restart machine keeps your drawing.',
  },
};

export const images: Record<string, { src: string; alt: string; caption: string }> = {
  mission: {
    src: missionShot,
    alt: 'The mission screen for mission 1.4, with numbered markers on the header, the sim controls, the machine, the work order and the schematic.',
    caption: 'Mission 1.4, Second Station. The numbers match the list below.',
  },
  ladder: {
    src: ladderShot,
    alt: 'The PLC mission screen for mission 2.4: three ladder rungs using XIC, XIO, OTL, OTU and OTE, the Step scan button, and the Scan tab showing the input image, solve rungs and output image stages.',
    caption: 'Mission 2.4, Lights Out, paused mid-scan. The ladder replaces the schematic, Step scan replaces Step, and the Scan tab shows each stage.',
  },
};
