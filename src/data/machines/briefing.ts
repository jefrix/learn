// Practice boards for the live examples on the Tutorial and Rules of thumb
// pages. No mission uses them, so the examples teach the pattern without
// being the answer to a work order.
import type { MachineDef } from '../../engine/machine';

const lamps: MachineDef = {
  id: 'brief-lamps',
  title: 'Practice board: two buttons, two lamps',
  site: 'AmeriPro shop, practice board',
  size: [620, 260],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Button A' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Button B' },
    H1: { tag: 'H1', type: 'lamp', label: 'Series lamp' },
    H2: { tag: 'H2', type: 'lamp', label: 'Parallel lamp' },
  },
  parts: [
    { id: 'door', type: 'panel', at: [20, 20], size: [580, 220], label: 'Practice board · 120 VAC control' },
    { id: 'pb1', type: 'button', at: [120, 130], signal: 'SB1', tag: 'SB1', label: 'A', color: 'black' },
    { id: 'pb2', type: 'button', at: [230, 130], signal: 'SB2', tag: 'SB2', label: 'B', color: 'black' },
    { id: 'h1', type: 'lamp', at: [400, 130], signal: 'H1', tag: 'H1', label: 'Series', color: 'amber' },
    { id: 'h2', type: 'lamp', at: [500, 130], signal: 'H2', tag: 'H2', label: 'Parallel', color: 'green' },
  ],
};

const motor: MachineDef = {
  id: 'brief-motor',
  title: 'Practice board: exhaust fan with two stations',
  site: 'AmeriPro shop, practice board',
  size: [700, 380],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Stop (station A)' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Start (station A)' },
    SB3: { tag: 'SB3', type: 'pushbutton', label: 'Stop (station B)' },
    SB4: { tag: 'SB4', type: 'pushbutton', label: 'Start (station B)' },
    KM1: { tag: 'KM1', type: 'contactor', label: 'Fan contactor' },
    H1: { tag: 'H1', type: 'lamp', label: 'Fan running' },
  },
  parts: [
    { id: 'M1', type: 'motor', at: [350, 90], drive: 'KM1', label: 'Exhaust fan', tag: 'KM1' },
    { id: 'a', type: 'panel', at: [30, 180], size: [300, 180], label: 'Station A' },
    { id: 'sb1', type: 'button', at: [100, 270], signal: 'SB1', tag: 'SB1', label: 'Stop', color: 'red' },
    { id: 'sb2', type: 'button', at: [180, 270], signal: 'SB2', tag: 'SB2', label: 'Start', color: 'green' },
    { id: 'h1', type: 'lamp', at: [265, 270], signal: 'H1', tag: 'H1', label: 'Running', color: 'green' },
    { id: 'b', type: 'panel', at: [370, 180], size: [300, 180], label: 'Station B' },
    { id: 'sb3', type: 'button', at: [460, 270], signal: 'SB3', tag: 'SB3', label: 'Stop', color: 'red' },
    { id: 'sb4', type: 'button', at: [580, 270], signal: 'SB4', tag: 'SB4', label: 'Start', color: 'green' },
  ],
};

const reverse: MachineDef = {
  id: 'brief-reverse',
  title: 'Practice board: reversing conveyor',
  site: 'AmeriPro shop, practice board',
  size: [700, 380],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Stop' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Forward' },
    SB3: { tag: 'SB3', type: 'pushbutton', label: 'Reverse' },
    KM1: { tag: 'KM1', type: 'contactor', label: 'Forward contactor' },
    KM2: { tag: 'KM2', type: 'contactor', label: 'Reverse contactor' },
  },
  parts: [
    { id: 'M1', type: 'motor', at: [110, 100], fwd: 'KM1', rev: 'KM2', label: 'Conveyor motor', tag: 'M1' },
    { id: 'door', type: 'panel', at: [40, 190], size: [620, 170], label: 'Conveyor panel' },
    { id: 'sb1', type: 'button', at: [140, 280], signal: 'SB1', tag: 'SB1', label: 'Stop', color: 'red' },
    { id: 'sb2', type: 'button', at: [250, 280], signal: 'SB2', tag: 'SB2', label: 'Forward', color: 'green' },
    { id: 'sb3', type: 'button', at: [360, 280], signal: 'SB3', tag: 'SB3', label: 'Reverse', color: 'black' },
    { id: 'h1', type: 'lamp', at: [490, 280], signal: 'KM1', tag: 'KM1', label: 'Forward', color: 'green' },
    { id: 'h2', type: 'lamp', at: [580, 280], signal: 'KM2', tag: 'KM2', label: 'Reverse', color: 'amber' },
  ],
};

export default [lamps, motor, reverse];
