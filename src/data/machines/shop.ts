// Small training machines for the first relay missions.
import type { MachineDef } from '../../engine/machine';

const bench: MachineDef = {
  id: 'bench',
  title: 'Shop bench: lamp board',
  site: 'AmeriPro shop',
  size: [620, 280],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Black button' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Red button' },
    H1: { tag: 'H1', type: 'lamp', label: 'Amber lamp' },
    H2: { tag: 'H2', type: 'lamp', label: 'Green lamp' },
  },
  parts: [
    { id: 'door', type: 'panel', at: [20, 20], size: [580, 240], label: 'Training board · 120 VAC control' },
    { id: 'pb1', type: 'button', at: [120, 140], signal: 'SB1', tag: 'SB1', label: 'Black', color: 'black' },
    { id: 'pb2', type: 'button', at: [240, 140], signal: 'SB2', tag: 'SB2', label: 'Red', color: 'red' },
    { id: 'h1', type: 'lamp', at: [400, 140], signal: 'H1', tag: 'H1', label: 'Amber', color: 'amber' },
    { id: 'h2', type: 'lamp', at: [500, 140], signal: 'H2', tag: 'H2', label: 'Green', color: 'green' },
  ],
};

const truck: MachineDef = {
  id: 'truck7',
  title: 'Truck 7: transfer pump',
  site: 'Truck 7 at the disposal site',
  size: [760, 420],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Stop (panel)' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Start (panel)' },
    SB3: { tag: 'SB3', type: 'pushbutton', label: 'Stop (tailgate)' },
    SB4: { tag: 'SB4', type: 'pushbutton', label: 'Start (tailgate)' },
    KM1: { tag: 'KM1', type: 'contactor', label: 'Pump contactor' },
    H1: { tag: 'H1', type: 'lamp', label: 'Pump running' },
  },
  parts: [
    { id: 'TK_TRUCK', type: 'tank', at: [40, 60], size: [230, 130], capacity: 3000, level: 0.8, fluid: 'sludge', label: 'Truck tank' },
    { id: 'TK_RX', type: 'tank', at: [560, 60], size: [140, 150], capacity: 6000, level: 0.1, fluid: 'sludge', label: 'Receiving tank' },
    { id: 'pipe1', type: 'pipe', points: [[270, 175], [380, 175]], fluid: 'sludge', flow: 'P1.flow' },
    { id: 'pipe2', type: 'pipe', points: [[420, 175], [480, 175], [480, 80], [560, 80]], fluid: 'sludge', flow: 'P1.flow' },
    { id: 'P1', type: 'pump', at: [400, 175], from: 'TK_TRUCK', to: 'TK_RX', gpm: 120, drive: 'KM1', label: 'Transfer pump', tag: 'KM1' },
    { id: 'door', type: 'panel', at: [40, 240], size: [330, 160], label: 'Pump panel' },
    { id: 'sb1', type: 'button', at: [110, 320], signal: 'SB1', tag: 'SB1', label: 'Stop', color: 'red' },
    { id: 'sb2', type: 'button', at: [200, 320], signal: 'SB2', tag: 'SB2', label: 'Start', color: 'green' },
    { id: 'h1', type: 'lamp', at: [300, 320], signal: 'H1', tag: 'H1', label: 'Running', color: 'green' },
    { id: 'tail', type: 'panel', at: [430, 240], size: [270, 160], label: 'Tailgate station' },
    { id: 'sb3', type: 'button', at: [510, 320], signal: 'SB3', tag: 'SB3', label: 'Stop', color: 'red' },
    { id: 'sb4', type: 'button', at: [620, 320], signal: 'SB4', tag: 'SB4', label: 'Start', color: 'green' },
  ],
};

const jog: MachineDef = {
  id: 'jog',
  title: 'Screw jog station',
  site: 'Press room test stand',
  size: [700, 400],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Stop' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Forward' },
    SB3: { tag: 'SB3', type: 'pushbutton', label: 'Reverse' },
    KM1: { tag: 'KM1', type: 'contactor', label: 'Forward' },
    KM2: { tag: 'KM2', type: 'contactor', label: 'Reverse' },
    H1: { tag: 'H1', type: 'lamp', label: 'Forward' },
    H2: { tag: 'H2', type: 'lamp', label: 'Reverse' },
  },
  parts: [
    { id: 'M1', type: 'motor', at: [110, 110], fwd: 'KM1', rev: 'KM2', label: 'Screw motor', tag: 'M1' },
    { id: 'S1', type: 'screw', at: [170, 110], from: 'none', gpm: 0, drive: 'M1.running', length: 420, label: 'Test screw' },
    { id: 'door', type: 'panel', at: [40, 200], size: [620, 180], label: 'Jog panel' },
    { id: 'sb1', type: 'button', at: [130, 290], signal: 'SB1', tag: 'SB1', label: 'Stop', color: 'red' },
    { id: 'sb2', type: 'button', at: [240, 290], signal: 'SB2', tag: 'SB2', label: 'Forward', color: 'green' },
    { id: 'sb3', type: 'button', at: [350, 290], signal: 'SB3', tag: 'SB3', label: 'Reverse', color: 'black' },
    { id: 'h1', type: 'lamp', at: [480, 290], signal: 'H1', tag: 'H1', label: 'Forward', color: 'green' },
    { id: 'h2', type: 'lamp', at: [570, 290], signal: 'H2', tag: 'H2', label: 'Reverse', color: 'amber' },
  ],
};

const lift: MachineDef = {
  id: 'lift',
  title: 'Lift station: single pump',
  site: 'Customer lift station, Route 9 strip mall',
  size: [720, 440],
  devices: {
    SA1: { tag: 'SA1', type: 'selector', label: 'Pump OFF/ON', positions: ['off', 'on'] },
    FR1: { tag: 'FR1', type: 'overload', label: 'Pump overload' },
    KM1: { tag: 'KM1', type: 'contactor', label: 'Pump contactor' },
    H1: { tag: 'H1', type: 'lamp', label: 'Running' },
    H2: { tag: 'H2', type: 'lamp', label: 'Overload tripped' },
  },
  parts: [
    { id: 'WELL', type: 'tank', at: [60, 60], size: [170, 200], capacity: 800, level: 0.5, inflow: 40, fluid: 'sludge', label: 'Wet well' },
    { id: 'pipe1', type: 'pipe', points: [[230, 245], [330, 245]], fluid: 'sludge', flow: 'P1.flow' },
    { id: 'pipe2', type: 'pipe', points: [[370, 245], [450, 245], [450, 90], [640, 90]], fluid: 'sludge', flow: 'P1.flow' },
    { id: 'lbl', type: 'label', at: [520, 80], label: 'To force main', cls: 'part-label' },
    { id: 'P1', type: 'pump', at: [350, 245], from: 'WELL', to: 'drain', gpm: 120, drive: 'KM1', overload: 'FR1', label: 'Pump', tag: 'KM1' },
    { id: 'door', type: 'panel', at: [60, 300], size: [600, 125], label: 'Pump panel' },
    { id: 'sa1', type: 'selector', at: [160, 375], signal: 'SA1', tag: 'SA1', label: 'Pump', positions: ['off', 'on'] },
    { id: 'h1', type: 'lamp', at: [290, 375], signal: 'H1', tag: 'H1', label: 'Running', color: 'green' },
    { id: 'h2', type: 'lamp', at: [390, 375], signal: 'H2', tag: 'H2', label: 'Tripped', color: 'amber' },
    { id: 'FR1', type: 'overload', at: [550, 370], signal: 'FR1', tripAfter: 4, coolFor: 3, label: 'FR1' },
  ],
};

const wash: MachineDef = {
  id: 'wash',
  title: 'Hood-wash rig',
  site: 'Wash rig on Truck 3',
  size: [760, 460],
  devices: {
    SA1: { tag: 'SA1', type: 'selector', label: 'Tank fill OFF/AUTO', positions: ['off', 'auto'] },
    LSL: { tag: 'LSL', type: 'float', label: 'Low float' },
    LSH: { tag: 'LSH', type: 'float', label: 'High float' },
    LSHH: { tag: 'LSHH', type: 'float', label: 'High-high float' },
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Pump stop' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Pump start' },
    SB3: { tag: 'SB3', type: 'pushbutton', label: 'Manual spray' },
    KA1: { tag: 'KA1', type: 'relay', label: 'Fill relay' },
    KM2: { tag: 'KM2', type: 'contactor', label: 'Spray pump' },
    Y1: { tag: 'Y1', type: 'solenoid', label: 'Spray valve' },
    Y2: { tag: 'Y2', type: 'solenoid', label: 'Fill valve' },
    H3: { tag: 'H3', type: 'lamp', label: 'Tank high-high' },
  },
  parts: [
    { id: 'TK1', type: 'tank', at: [210, 50], size: [150, 200], capacity: 300, level: 0.5, fluid: 'water', label: 'Water tank' },
    { id: 'LSHH_f', type: 'float', tank: 'TK1', at_level: 0.95, signal: 'LSHH', label: 'LSHH', side: 'left' },
    { id: 'LSH_f', type: 'float', tank: 'TK1', at_level: 0.85, signal: 'LSH', label: 'LSH', side: 'left' },
    { id: 'LSL_f', type: 'float', tank: 'TK1', at_level: 0.2, signal: 'LSL', label: 'LSL', side: 'left' },
    { id: 'pipeIn', type: 'pipe', points: [[30, 30], [120, 30], [285, 30], [285, 50]], fluid: 'water', flow: 'Y2.flow' },
    { id: 'lblIn', type: 'label', at: [30, 22], label: 'City water' },
    { id: 'Y2', type: 'valve', at: [150, 30], from: 'source', to: 'TK1', gpm: 30, drive: 'Y2', label: 'Fill valve', tag: 'Y2' },
    { id: 'pipeOut', type: 'pipe', points: [[360, 235], [440, 235]], fluid: 'water', flow: 'P2.flow' },
    { id: 'pipeSpray', type: 'pipe', points: [[480, 235], [560, 235], [560, 120], [600, 120]], fluid: 'water', flow: 'Y1.flow' },
    { id: 'P2', type: 'pump', at: [460, 235], from: 'TK1', to: 'TK1', gpm: 0, drive: 'KM2', label: 'Spray pump', tag: 'KM2' },
    { id: 'Y1', type: 'valve', at: [630, 120], from: 'TK1', to: 'drain', gpm: 8, drive: 'Y1', label: 'Spray valve', tag: 'Y1' },
    { id: 'lblSpray', type: 'label', at: [600, 170], label: 'To spray wand' },
    { id: 'door', type: 'panel', at: [30, 290], size: [700, 155], label: 'Rig panel' },
    { id: 'sa1', type: 'selector', at: [110, 370], signal: 'SA1', tag: 'SA1', label: 'Tank fill', positions: ['off', 'auto'] },
    { id: 'sb1', type: 'button', at: [240, 370], signal: 'SB1', tag: 'SB1', label: 'Pump stop', color: 'red' },
    { id: 'sb2', type: 'button', at: [330, 370], signal: 'SB2', tag: 'SB2', label: 'Pump start', color: 'green' },
    { id: 'sb3', type: 'button', at: [440, 370], signal: 'SB3', tag: 'SB3', label: 'Spray', color: 'black' },
    { id: 'h3', type: 'lamp', at: [560, 370], signal: 'H3', tag: 'H3', label: 'Tank high-high', color: 'red' },
    { id: 'h4', type: 'lamp', at: [650, 370], signal: 'Y1', tag: 'Y1', label: 'Spraying', color: 'blue' },
  ],
};

const fan: MachineDef = {
  id: 'fan',
  title: 'Press room: drive and cooling fan',
  site: 'Press room',
  size: [700, 400],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Stop' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Start' },
    KM1: { tag: 'KM1', type: 'contactor', label: 'Drive motor' },
    KM2: { tag: 'KM2', type: 'contactor', label: 'Cooling fan' },
  },
  parts: [
    { id: 'M1', type: 'motor', at: [170, 120], drive: 'KM1', label: 'Drive motor', tag: 'KM1' },
    { id: 'M2', type: 'motor', at: [450, 120], drive: 'KM2', label: 'Cooling fan', tag: 'KM2' },
    { id: 'door', type: 'panel', at: [40, 210], size: [620, 170], label: 'Motor panel' },
    { id: 'sb1', type: 'button', at: [150, 300], signal: 'SB1', tag: 'SB1', label: 'Stop', color: 'red' },
    { id: 'sb2', type: 'button', at: [260, 300], signal: 'SB2', tag: 'SB2', label: 'Start', color: 'green' },
    { id: 'h1', type: 'lamp', at: [420, 300], signal: 'KM1', tag: 'KM1', label: 'Motor', color: 'green' },
    { id: 'h2', type: 'lamp', at: [520, 300], signal: 'KM2', tag: 'KM2', label: 'Fan', color: 'blue' },
  ],
};

export default [bench, truck, jog, lift, wash, fan];
