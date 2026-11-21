// Chapter 2 machines: the same equipment, now with a PLC. E-stops and
// overloads stay hardwired; PLC outputs appear in the hardwired circuit as
// contacts (Q devices) that close when the output is on.
import type { MachineDef } from '../../engine/machine';
import type { DeviceDef } from '../../engine/relay/devices';
import { PRESS_PANEL, PRESS_P_TERMINALS, pressDevices, pressDoor, pressPlant } from './press';

const q = (tag: string, label: string): DeviceDef => ({ tag, type: 'signal', label, signal: tag });

const truckPlc: MachineDef = {
  id: 'truck7-plc',
  title: 'Truck 7 with a Micro800-class PLC',
  site: 'Truck 7',
  size: [760, 440],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Stop' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Start' },
    SB5: { tag: 'SB5', type: 'pushbutton', label: 'Start/Stop' },
    SB6: { tag: 'SB6', type: 'pushbutton', label: 'Count reset' },
    ES1: { tag: 'ES1', type: 'estop', label: 'E-stop' },
    Q0: q('Q0', 'PLC out O-00'),
    KM1: { tag: 'KM1', type: 'contactor', label: 'Pump' },
  },
  hardwired: '// The E-stop opens the pump contactor no matter what the PLC says.\nNC(ES1)NO(Q0)COIL(KM1);',
  plc: {
    inputs: [
      { tag: 'Stop_PB', device: 'SB1', contact: 'NC', address: 'I-00', desc: 'Stop, wired NC: 1 when healthy' },
      { tag: 'Start_PB', device: 'SB2', contact: 'NO', address: 'I-01', desc: 'Start, NO' },
      { tag: 'Toggle_PB', device: 'SB5', contact: 'NO', address: 'I-02', desc: 'One-button start/stop' },
      { tag: 'Reset_PB', device: 'SB6', contact: 'NO', address: 'I-03', desc: 'Load count reset' },
      { tag: 'EStop_OK', device: 'ES1', contact: 'NC', address: 'I-04', desc: 'E-stop status: 1 when released' },
    ],
    outputs: [
      { tag: 'Pump_Cmd', signal: 'Q0', address: 'O-00', desc: 'To KM1 through the E-stop' },
      { tag: 'Run_Lamp', signal: 'H1', address: 'O-01', desc: 'Running lamp' },
      { tag: 'Loads_Display', type: 'DINT', signal: 'LoadsOut', desc: 'Panel display: loads today' },
    ],
  },
  parts: [
    { id: 'TK_TRUCK', type: 'tank', at: [40, 60], size: [230, 130], capacity: 3000, level: 0.8, fluid: 'sludge', label: 'Truck tank' },
    { id: 'TK_RX', type: 'tank', at: [560, 60], size: [140, 150], capacity: 6000, level: 0.1, fluid: 'sludge', label: 'Receiving tank' },
    { id: 'pipe1', type: 'pipe', points: [[270, 175], [380, 175]], fluid: 'sludge', flow: 'P1.flow' },
    { id: 'pipe2', type: 'pipe', points: [[420, 175], [480, 175], [480, 80], [560, 80]], fluid: 'sludge', flow: 'P1.flow' },
    { id: 'P1', type: 'pump', at: [400, 175], from: 'TK_TRUCK', to: 'TK_RX', gpm: 120, drive: 'KM1', label: 'Transfer pump', tag: 'KM1' },
    { id: 'door', type: 'panel', at: [20, 235], size: [720, 190], label: 'Pump panel' },
    { id: 'es1', type: 'estop', at: [80, 325], signal: 'ES1', tag: 'ES1' },
    { id: 'sb1', type: 'button', at: [180, 325], signal: 'SB1', tag: 'SB1', label: 'Stop', color: 'red' },
    { id: 'sb2', type: 'button', at: [270, 325], signal: 'SB2', tag: 'SB2', label: 'Start', color: 'green' },
    { id: 'sb5', type: 'button', at: [360, 325], signal: 'SB5', tag: 'SB5', label: 'Start/Stop', color: 'black' },
    { id: 'sb6', type: 'button', at: [450, 325], signal: 'SB6', tag: 'SB6', label: 'Count reset', color: 'white' },
    { id: 'h1', type: 'lamp', at: [540, 325], signal: 'H1', tag: 'H1', label: 'Running', color: 'green' },
    { id: 'disp', type: 'display', at: [650, 325], signal: 'LoadsOut', label: 'Loads today' },
  ],
};

const benchPlc: MachineDef = {
  id: 'bench-plc',
  title: 'Shop bench with a PLC',
  site: 'AmeriPro shop',
  size: [620, 260],
  devices: { SB1: { tag: 'SB1', type: 'pushbutton', label: 'Button' } },
  plc: {
    inputs: [{ tag: 'Button', device: 'SB1', contact: 'NO', address: 'I-00' }],
    outputs: [{ tag: 'Lamp', signal: 'H1', address: 'O-00', desc: 'Green lamp' }],
  },
  parts: [
    { id: 'door', type: 'panel', at: [20, 20], size: [580, 220], label: 'Training board · PLC I/O' },
    { id: 'pb1', type: 'button', at: [180, 130], signal: 'SB1', tag: 'SB1', label: 'Button', color: 'black' },
    { id: 'h1', type: 'lamp', at: [420, 130], signal: 'H1', tag: 'H1', label: 'Lamp', color: 'green' },
  ],
};

const washPlc: MachineDef = {
  id: 'wash-plc',
  title: 'Hood-wash rig with a PLC',
  site: 'Truck 3',
  size: [760, 460],
  devices: {
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Pump stop' },
    SB2: { tag: 'SB2', type: 'pushbutton', label: 'Pump start' },
    SB3: { tag: 'SB3', type: 'pushbutton', label: 'Spray' },
    SB4: { tag: 'SB4', type: 'pushbutton', label: 'Service reset' },
    ES1: { tag: 'ES1', type: 'estop', label: 'E-stop' },
    Q0: q('Q0', 'PLC out O-00'),
    Q2: q('Q2', 'PLC out O-02'),
    KM2: { tag: 'KM2', type: 'contactor', label: 'Spray pump' },
    KM3: { tag: 'KM3', type: 'contactor', label: 'Cooling fan' },
  },
  hardwired: 'NC(ES1)@2;\n@2: NO(Q0)COIL(KM2);\n@2: NO(Q2)COIL(KM3);',
  plc: {
    inputs: [
      { tag: 'Stop_PB', device: 'SB1', contact: 'NC', address: 'I-00', desc: 'Wired NC' },
      { tag: 'Start_PB', device: 'SB2', contact: 'NO', address: 'I-01' },
      { tag: 'Spray_PB', device: 'SB3', contact: 'NO', address: 'I-02' },
      { tag: 'Service_Reset_PB', device: 'SB4', contact: 'NO', address: 'I-03' },
      { tag: 'EStop_OK', device: 'ES1', contact: 'NC', address: 'I-04' },
    ],
    outputs: [
      { tag: 'Pump_Cmd', signal: 'Q0', address: 'O-00', desc: 'Spray pump KM2' },
      { tag: 'Spray_Valve', signal: 'Y1', address: 'O-01', desc: 'Spray valve Y1' },
      { tag: 'Fan_Cmd', signal: 'Q2', address: 'O-02', desc: 'Pump cooling fan KM3' },
      { tag: 'Service_Lamp', signal: 'H4', address: 'O-03', desc: 'Service due' },
    ],
  },
  parts: [
    { id: 'TK1', type: 'tank', at: [60, 50], size: [150, 200], capacity: 300, level: 0.8, fluid: 'water', label: 'Water tank' },
    { id: 'pipeOut', type: 'pipe', points: [[210, 235], [300, 235]], fluid: 'water', flow: 'P2.running' },
    { id: 'pipeSpray', type: 'pipe', points: [[340, 235], [430, 235], [430, 120], [480, 120]], fluid: 'water', flow: 'Y1v.flow' },
    { id: 'P2', type: 'pump', at: [320, 235], from: 'TK1', to: 'TK1', gpm: 0, drive: 'KM2', label: 'Spray pump', tag: 'KM2' },
    { id: 'Y1v', type: 'valve', at: [510, 120], from: 'source', to: 'drain', gpm: 8, drive: 'Y1', label: 'Spray valve', tag: 'Y1' },
    { id: 'M3', type: 'motor', at: [640, 200], drive: 'KM3', label: 'Cooling fan', tag: 'KM3' },
    { id: 'door', type: 'panel', at: [20, 290], size: [720, 155], label: 'Rig panel' },
    { id: 'es1', type: 'estop', at: [80, 370], signal: 'ES1', tag: 'ES1' },
    { id: 'sb1', type: 'button', at: [180, 370], signal: 'SB1', tag: 'SB1', label: 'Pump stop', color: 'red' },
    { id: 'sb2', type: 'button', at: [270, 370], signal: 'SB2', tag: 'SB2', label: 'Pump start', color: 'green' },
    { id: 'sb3', type: 'button', at: [360, 370], signal: 'SB3', tag: 'SB3', label: 'Spray', color: 'black' },
    { id: 'sb4', type: 'button', at: [450, 370], signal: 'SB4', tag: 'SB4', label: 'Service reset', color: 'white' },
    { id: 'h4', type: 'lamp', at: [560, 370], signal: 'H4', tag: 'H4', label: 'Service due', color: 'amber' },
    { id: 'h5', type: 'lamp', at: [650, 370], signal: 'Y1', tag: 'Y1', label: 'Spraying', color: 'blue' },
  ],
};

const liftPlc: MachineDef = {
  id: 'lift-plc',
  title: 'Duplex lift station with a PLC',
  site: 'Customer lift station, Route 9 strip mall',
  size: [800, 470],
  devices: {
    SA1: { tag: 'SA1', type: 'selector', label: 'Hand/Off/Auto', positions: ['hand', 'off', 'auto'] },
    LSL: { tag: 'LSL', type: 'float', label: 'Low float' },
    LSH: { tag: 'LSH', type: 'float', label: 'High float' },
    FR1: { tag: 'FR1', type: 'overload', label: 'Pump 1 OL' },
    FR2: { tag: 'FR2', type: 'overload', label: 'Pump 2 OL' },
    SB1: { tag: 'SB1', type: 'pushbutton', label: 'Alarm ack' },
    ES1: { tag: 'ES1', type: 'estop', label: 'E-stop' },
    Q1: q('Q1', 'PLC out O-00'),
    Q2: q('Q2', 'PLC out O-01'),
    KM1: { tag: 'KM1', type: 'contactor', label: 'Pump 1' },
    KM2: { tag: 'KM2', type: 'contactor', label: 'Pump 2' },
    H1: { tag: 'H1', type: 'lamp', label: 'Pump 1 run' },
    H2: { tag: 'H2', type: 'lamp', label: 'Pump 2 run' },
  },
  hardwired: '// E-stop and overloads stay hardwired in each contactor circuit.\nNC(ES1)@2;\n@2: NO(Q1)NC(FR1)[COIL(KM1),LAMP(H1)];\n@2: NO(Q2)NC(FR2)[COIL(KM2),LAMP(H2)];',
  plc: {
    inputs: [
      { tag: 'HOA_Hand', device: 'SA1', pos: 'hand', address: 'I-00', desc: 'SA1 at HAND' },
      { tag: 'HOA_Auto', device: 'SA1', pos: 'auto', address: 'I-01', desc: 'SA1 at AUTO' },
      { tag: 'LSL', device: 'LSL', contact: 'NO', address: 'I-02', desc: 'Low float: 1 when water reaches it' },
      { tag: 'LSH', device: 'LSH', contact: 'NO', address: 'I-03', desc: 'High float: 1 when water reaches it' },
      { tag: 'P1_OL', device: 'FR1', contact: 'NO', address: 'I-04', desc: 'FR1 97-98: 1 when tripped' },
      { tag: 'P2_OL', device: 'FR2', contact: 'NO', address: 'I-05', desc: 'FR2 97-98: 1 when tripped' },
      { tag: 'Ack_PB', device: 'SB1', contact: 'NO', address: 'I-06', desc: 'Alarm acknowledge' },
      { tag: 'EStop_OK', device: 'ES1', contact: 'NC', address: 'I-07' },
      { tag: 'LT101', type: 'REAL', signal: 'LT101.mA', address: 'AI-0', desc: 'Level transmitter, mA (4-20 = 0-120 in)' },
    ],
    outputs: [
      { tag: 'P1_Run', signal: 'Q1', address: 'O-00', desc: 'Pump 1 contactor KM1' },
      { tag: 'P2_Run', signal: 'Q2', address: 'O-01', desc: 'Pump 2 contactor KM2' },
      { tag: 'Alarm_Horn', signal: 'HA1', address: 'O-02' },
      { tag: 'Alarm_Lamp', signal: 'H3', address: 'O-03' },
      { tag: 'Level_Display', type: 'REAL', signal: 'LevelOut', desc: 'Panel level display, inches' },
    ],
  },
  parts: [
    { id: 'WELL', type: 'tank', at: [70, 50], size: [180, 230], capacity: 1000, level: 0.35, inflow: 60, fluid: 'sludge', label: 'Wet well (120 in)' },
    { id: 'LSH_f', type: 'float', tank: 'WELL', at_level: 0.6, signal: 'LSH', label: 'LSH', side: 'left' },
    { id: 'LSL_f', type: 'float', tank: 'WELL', at_level: 0.2, signal: 'LSL', label: 'LSL', side: 'left' },
    { id: 'LT101', type: 'transmitter', at: [310, 70], tank: 'WELL', signal: 'LT101.mA', tag: 'LT101', label: 'Level' },
    { id: 'pipe1', type: 'pipe', points: [[250, 260], [360, 260]], fluid: 'sludge', flow: 'P1.flow' },
    { id: 'pipe1b', type: 'pipe', points: [[400, 260], [470, 260], [470, 130], [700, 130]], fluid: 'sludge', flow: 'P1.flow' },
    { id: 'pipe2', type: 'pipe', points: [[250, 200], [360, 200]], fluid: 'sludge', flow: 'P2.flow' },
    { id: 'pipe2b', type: 'pipe', points: [[400, 200], [440, 200], [440, 130]], fluid: 'sludge', flow: 'P2.flow' },
    { id: 'lbl', type: 'label', at: [580, 120], label: 'To force main' },
    { id: 'P1', type: 'pump', at: [380, 260], from: 'WELL', to: 'drain', gpm: 150, drive: 'KM1', overload: 'FR1', label: 'Pump 1', tag: 'KM1' },
    { id: 'P2', type: 'pump', at: [380, 200], from: 'WELL', to: 'drain', gpm: 150, drive: 'KM2', overload: 'FR2', label: 'Pump 2', tag: 'KM2' },
    { id: 'FR1', type: 'overload', at: [620, 220], signal: 'FR1', tripAfter: 4, coolFor: 3 },
    { id: 'FR2', type: 'overload', at: [700, 220], signal: 'FR2', tripAfter: 4, coolFor: 3 },
    { id: 'door', type: 'panel', at: [20, 300], size: [760, 155], label: 'Lift station panel' },
    { id: 'es1', type: 'estop', at: [80, 380], signal: 'ES1', tag: 'ES1' },
    { id: 'sa1', type: 'selector', at: [190, 385], signal: 'SA1', tag: 'SA1', label: 'Pumps', positions: ['hand', 'off', 'auto'], initial: 'off' },
    { id: 'h1', type: 'lamp', at: [290, 380], signal: 'H1', tag: 'H1', label: 'Pump 1', color: 'green' },
    { id: 'h2', type: 'lamp', at: [360, 380], signal: 'H2', tag: 'H2', label: 'Pump 2', color: 'green' },
    { id: 'h3', type: 'lamp', at: [430, 380], signal: 'H3', tag: 'H3', label: 'Alarm', color: 'red' },
    { id: 'ha1', type: 'horn', at: [500, 380], signal: 'HA1', tag: 'HA1', label: 'Horn' },
    { id: 'sb1', type: 'button', at: [580, 380], signal: 'SB1', tag: 'SB1', label: 'Ack', color: 'black' },
    { id: 'disp', type: 'display', at: [690, 380], signal: 'LevelOut', label: 'Level, in', decimals: 1 },
  ],
};

// ---------- the press, rebuilt with a PLC ----------

const PRESS_PLC_HARDWIRED = `// Power lamp, E-stop, and the overloads stay hardwired. Run and fault lamps follow the contactors and overloads.
LAMP(H1);
NC(SB1)@2;
@2: NO(Q_KM11)COIL(KM11);
@2: NO(Q_KM12)COIL(KM12);
@2: NO(Q_KM2)NC(FR2)[COIL(KM2),LAMP(H6)];
@2: NO(Q_KM3)NC(FR3)[COIL(KM3),LAMP(H7)];
@2: NO(Q_KM4)NC(FR4)[COIL(KM4),LAMP(H8)];
@2: NO(KM11)LAMP(H5);
@2: NO(KM12)LAMP(H16);
@2: NO(Q_Y1)[SOL(Y1),LAMP(H3)];
@2: NO(U1)LAMP(H30);
@2: NO(U2)LAMP(H31);
@2: NO(FR2)LAMP(H32);
@2: NO(FR3)LAMP(H33);
@2: NO(FR4)LAMP(H34);`;

const pressPlcDevices: Record<string, DeviceDef> = {
  ...pressDevices,
  SB5: { tag: 'SB5', type: 'pushbutton', label: 'Alarm ack' },
  Q_KM11: q('Q_KM11', 'PLC out'),
  Q_KM12: q('Q_KM12', 'PLC out'),
  Q_KM2: q('Q_KM2', 'PLC out'),
  Q_KM3: q('Q_KM3', 'PLC out'),
  Q_KM4: q('Q_KM4', 'PLC out'),
  Q_Y1: q('Q_Y1', 'PLC out'),
};

const pressPlc: MachineDef & { volts: string } = {
  id: 'press-plc',
  title: 'PJDL-302 rebuilt on a PLC',
  site: 'AmeriPro dewatering building',
  size: [1000, 640],
  volts: '230 VAC',
  devices: pressPlcDevices,
  hardwired: PRESS_PLC_HARDWIRED,
  plc: {
    inputs: [
      { tag: 'Mode_Manual', device: 'SA2', pos: 'manual', address: 'I-00', desc: 'SA2 at Manual' },
      { tag: 'Mode_Auto', device: 'SA2', pos: 'auto', address: 'I-01', desc: 'SA2 at Auto' },
      { tag: 'Auto_Start_PB', device: 'SB3', contact: 'NO', address: 'I-02', desc: 'SB3' },
      { tag: 'Auto_Stop_PB', device: 'SB4', contact: 'NC', address: 'I-03', desc: 'SB4, wired NC' },
      { tag: 'Wash_PB', device: 'SB2', contact: 'NO', address: 'I-04', desc: 'SB2' },
      { tag: 'Mixer_Sw', device: 'SA4', pos: 'on', address: 'I-05', desc: 'SA4' },
      { tag: 'Feed_Sw', device: 'SA5', pos: 'on', address: 'I-06', desc: 'SA5' },
      { tag: 'Dose_Sw', device: 'SA6', pos: 'on', address: 'I-07', desc: 'SA6' },
      { tag: 'Drive1_Sw', device: 'SA11', pos: 'on', address: 'I-08', desc: 'SA11' },
      { tag: 'Drive2_Sw', device: 'SA12', pos: 'on', address: 'I-09', desc: 'SA12' },
      { tag: 'EStop_OK', device: 'SB1', contact: 'NC', address: 'I-10', desc: 'SB1 status: 1 when released' },
      { tag: 'Mix_Low_Rod', signal: 'LVS1.E2', address: 'I-11', desc: 'E2 wet: level at or above low rod' },
      { tag: 'Mix_High_Rod', signal: 'LVS1.E3', address: 'I-12', desc: 'E3 wet: level at or above high rod' },
      { tag: 'Sludge_OK', device: 'LS1', contact: 'NO', address: 'I-13', desc: 'Sludge tank float 31/32: 1 when not low' },
      { tag: 'Poly_OK', device: 'LS2', contact: 'NO', address: 'I-14', desc: 'Polymer tank float 36/37: 1 when not low' },
      { tag: 'Mixer_OL', device: 'FR2', contact: 'NO', address: 'I-15', desc: 'FR2 tripped' },
      { tag: 'Feed_OL', device: 'FR3', contact: 'NO', address: 'I-16', desc: 'FR3 tripped' },
      { tag: 'Dose_OL', device: 'FR4', contact: 'NO', address: 'I-17', desc: 'FR4 tripped' },
      { tag: 'Drive1_Fault', signal: 'U1.fault', address: 'I-18', desc: 'U1 fault relay' },
      { tag: 'Drive2_Fault', signal: 'U2.fault', address: 'I-19', desc: 'U2 fault relay' },
      { tag: 'Alarm_Ack_PB', device: 'SB5', contact: 'NO', address: 'I-20', desc: 'New alarm acknowledge button' },
    ],
    outputs: [
      { tag: 'Screw1_Run', signal: 'Q_KM11', address: 'O-00', desc: 'KM11 + run to U1' },
      { tag: 'Screw2_Run', signal: 'Q_KM12', address: 'O-01', desc: 'KM12 + run to U2' },
      { tag: 'Mixer_Run', signal: 'Q_KM2', address: 'O-02', desc: 'KM2' },
      { tag: 'Feed_Run', signal: 'Q_KM3', address: 'O-03', desc: 'KM3 sludge pump' },
      { tag: 'Dose_Run', signal: 'Q_KM4', address: 'O-04', desc: 'KM4 dosing pump' },
      { tag: 'Wash_Valve', signal: 'Q_Y1', address: 'O-05', desc: 'Y1' },
      { tag: 'Auto_Lamp', signal: 'KA5', address: 'O-06', desc: 'Lamp in SB3' },
      { tag: 'Alarm_Horn', signal: 'HA1', address: 'O-07', desc: 'New horn' },
      { tag: 'Alarm_Lamp', signal: 'H40', address: 'O-08', desc: 'New alarm lamp' },
    ],
  },
  parts: [
    ...pressPlant,
    ...pressDoor.filter((p) => p.id !== 'k_PLC'),
    { id: 'SB5', type: 'button', at: [930, 296], signal: 'SB5', tag: 'SB5', label: 'Alarm ack', color: 'black' },
    { id: 'H40', type: 'lamp', at: [800, 395], signal: 'H40', tag: 'H40', label: 'Alarm', color: 'amber' },
    { id: 'HA1', type: 'horn', at: [880, 395], signal: 'HA1', tag: 'HA1', label: 'Horn' },
  ],
};

// ---------- the real relay panel, driven by a plant PLC ----------

const pressRemote: MachineDef & { volts: string } = {
  id: 'press-remote',
  title: 'PJDL-302 relay panel + plant PLC',
  site: 'AmeriPro dewatering building',
  size: [1000, 760],
  volts: '230 VAC',
  sources: ['P1'],
  devices: {
    ...pressDevices,
    P2: { tag: 'P2', type: 'plcInput', label: 'Remote enabled' },
    P3: { tag: 'P3', type: 'plcInput', label: 'Running' },
    P4: { tag: 'P4', type: 'plcInput', label: 'Fault' },
    PB1: { tag: 'PB1', type: 'pushbutton', label: 'Plant start' },
    PB2: { tag: 'PB2', type: 'pushbutton', label: 'Plant stop' },
    PB3: { tag: 'PB3', type: 'pushbutton', label: 'Plant reset' },
  },
  hardwired: `${PRESS_PANEL}\n${PRESS_P_TERMINALS}`,
  plc: {
    inputs: [
      { tag: 'Plant_Start', device: 'PB1', contact: 'NO', address: 'I-00', desc: 'Plant HMI start' },
      { tag: 'Plant_Stop', device: 'PB2', contact: 'NC', address: 'I-01', desc: 'Plant HMI stop, wired NC' },
      { tag: 'Plant_Reset', device: 'PB3', contact: 'NO', address: 'I-02', desc: 'Plant HMI alarm reset' },
      { tag: 'P2_Remote_En', signal: 'P2', address: 'I-03', desc: 'Press P1-P2: remote enabled (KA3)' },
      { tag: 'P3_Running', signal: 'P3', address: 'I-04', desc: 'Press P1-P3: running' },
      { tag: 'P4_Fault', signal: 'P4', address: 'I-05', desc: 'Press P1-P4: fault' },
    ],
    outputs: [
      { tag: 'Remote_Run', signal: 'PLC', address: 'O-00', desc: 'Interposing relay contact to press terminals 18/41' },
      { tag: 'Warn_Horn', signal: 'HA2', address: 'O-01', desc: 'Pre-start warning horn at the press' },
      { tag: 'FTS_Alarm', signal: 'H41', address: 'O-02', desc: 'Plant HMI: press failed to start' },
    ],
  },
  parts: [
    ...pressPlant,
    ...pressDoor.filter((p) => p.id !== 'k_PLC'),
    { id: 'hmi', type: 'panel', at: [10, 640], size: [980, 110], label: 'Plant PLC and HMI (outside the press panel)' },
    { id: 'PB1', type: 'button', at: [120, 705], signal: 'PB1', tag: 'PB1', label: 'Start', color: 'green' },
    { id: 'PB2', type: 'button', at: [220, 705], signal: 'PB2', tag: 'PB2', label: 'Stop', color: 'red' },
    { id: 'PB3', type: 'button', at: [320, 705], signal: 'PB3', tag: 'PB3', label: 'Reset', color: 'black' },
    { id: 'H41', type: 'lamp', at: [430, 705], signal: 'H41', tag: 'H41', label: 'Failed to start', color: 'red' },
    { id: 'HA2', type: 'horn', at: [540, 705], signal: 'HA2', tag: 'HA2', label: 'Warning horn' },
    { id: 'lP2', type: 'lamp', at: [660, 705], signal: 'P2', tag: 'P2', label: 'Remote en.', color: 'white' },
    { id: 'lP3', type: 'lamp', at: [750, 705], signal: 'P3', tag: 'P3', label: 'Running', color: 'green' },
    { id: 'lP4', type: 'lamp', at: [840, 705], signal: 'P4', tag: 'P4', label: 'Fault', color: 'red' },
  ],
};

// ---------- MWTP filter skid ----------

const mwtp: MachineDef & { volts: string } = {
  id: 'mwtp',
  title: 'MWTP filter skid (simplified)',
  site: 'Mobile Water Treatment Plant trailer',
  size: [1000, 560],
  volts: '24 VDC',
  devices: {
    ES1: { tag: 'ES1', type: 'estop', label: 'E-stop' },
    PB1: { tag: 'PB1', type: 'pushbutton', label: 'Start' },
    PB2: { tag: 'PB2', type: 'pushbutton', label: 'Stop' },
    PB3: { tag: 'PB3', type: 'pushbutton', label: 'Alarm ack' },
    PLCOK: { tag: 'PLCOK', type: 'signal', label: 'PLC healthy', signal: 'PLC.ok' },
    KSAFE: { tag: 'KSAFE', type: 'relay', label: 'Safety relay' },
    Q_P101: q('Q_P101', 'PLC out'),
    Q_P202: q('Q_P202', 'PLC out'),
    Q_BL201: q('Q_BL201', 'PLC out'),
    Q_XV300: q('Q_XV300', 'PLC out'),
    Q_XV602: q('Q_XV602', 'PLC out'),
    KM101: { tag: 'KM101', type: 'contactor', label: 'P-101 intake' },
    KM202: { tag: 'KM202', type: 'contactor', label: 'P-202 backwash' },
    KM201: { tag: 'KM201', type: 'contactor', label: 'BL-201 blower' },
    SOL300: { tag: 'SOL300', type: 'solenoid', label: 'XV-300 pilot' },
    SOL602: { tag: 'SOL602', type: 'solenoid', label: 'XV-602 pilot' },
  },
  hardwired: `// K-SAFE: a hardwired safety relay. It holds in only while the E-stop is released and the PLC is healthy.
NC(ES1)NO(PLCOK)COIL(KSAFE);
// Pumps and blower run only through K-SAFE.
NO(KSAFE)NO(Q_P101)COIL(KM101);
NO(KSAFE)NO(Q_P202)COIL(KM202);
NO(KSAFE)NO(Q_BL201)COIL(KM201);
// XV-300 divert: its spring opens it to waste. The PLC holds it closed, only through K-SAFE.
NO(KSAFE)NO(Q_XV300)SOL(SOL300);
// XV-602 to the building: its spring closes it. It opens only through K-SAFE.
NO(KSAFE)NO(Q_XV602)SOL(SOL602);`,
  plc: {
    inputs: [
      { tag: 'Start_PB', device: 'PB1', contact: 'NO', address: 'I-00' },
      { tag: 'Stop_PB', device: 'PB2', contact: 'NC', address: 'I-01', desc: 'Wired NC' },
      { tag: 'Ack_PB', device: 'PB3', contact: 'NO', address: 'I-02' },
      { tag: 'EStop_OK', device: 'ES1', contact: 'NC', address: 'I-03' },
      { tag: 'TMP_psi', type: 'REAL', signal: 'PDIT201', address: 'AI-0', desc: 'PDIT-201 transmembrane pressure, psi (scaled by the analog card)' },
      { tag: 'Turb_NTU', type: 'REAL', signal: 'AIT201', address: 'AI-1', desc: 'AIT-201 permeate turbidity, NTU (scaled by the analog card)' },
    ],
    outputs: [
      { tag: 'P101_Run', signal: 'Q_P101', address: 'O-00', desc: 'Intake pump' },
      { tag: 'XV201_Open', signal: 'XV201', address: 'O-01', desc: 'UF feed valve' },
      { tag: 'XV202_Open', signal: 'XV202', address: 'O-02', desc: 'UF permeate valve' },
      { tag: 'XV203_Open', signal: 'XV203', address: 'O-03', desc: 'Backwash supply valve' },
      { tag: 'XV204_Open', signal: 'XV204', address: 'O-04', desc: 'Upper drain / vent' },
      { tag: 'XV205_Open', signal: 'XV205', address: 'O-05', desc: 'Lower drain' },
      { tag: 'XV206_Open', signal: 'XV206', address: 'O-06', desc: 'Scour air valve' },
      { tag: 'BL201_Run', signal: 'Q_BL201', address: 'O-07', desc: 'Air scour blower' },
      { tag: 'P202_Run', signal: 'Q_P202', address: 'O-08', desc: 'Backwash pump' },
      { tag: 'XV300_Sol', signal: 'Q_XV300', address: 'O-09', desc: 'Energize to CLOSE the divert valve' },
      { tag: 'XV602_Sol', signal: 'Q_XV602', address: 'O-10', desc: 'Energize to OPEN the building valve' },
      { tag: 'Alarm_Horn', signal: 'HA1', address: 'O-11' },
      { tag: 'OffSpec_Lamp', signal: 'H2', address: 'O-12' },
      { tag: 'State_Display', type: 'DINT', signal: 'StateOut', desc: 'HMI: sequence step' },
    ],
  },
  parts: [
    { id: 'TK100', type: 'tank', at: [20, 60], size: [100, 140], capacity: 3000, level: 0.7, fluid: 'water', label: 'TK-100 break tank' },
    { id: 'p1', type: 'pipe', points: [[120, 180], [175, 180]], fluid: 'water', flow: 'P101.flow' },
    { id: 'P101', type: 'pump', at: [195, 180], from: 'source', to: 'drain', gpm: 250, drive: 'KM101', label: 'P-101 intake', tag: 'KM101' },
    { id: 'p2', type: 'pipe', points: [[215, 180], [270, 180]], fluid: 'water', flow: 'P101.flow' },
    { id: 'XV201', type: 'valve', at: [295, 180], from: 'source', to: 'drain', gpm: 250, drive: 'XV201', label: 'Feed', tag: 'XV-201' },
    { id: 'p3', type: 'pipe', points: [[320, 180], [380, 180]], fluid: 'water', flow: 'XV201.flow' },
    { id: 'UFshell', type: 'tank', at: [380, 80], size: [70, 200], capacity: 1e9, level: 1, fluid: 'water', label: 'UF-201' },
    { id: 'PDIT201', type: 'filter', at: [415, 330], signal: 'PDIT201', clean: 6, foulPerMin: 0.2, filterWhen: ['P101.running', 'XV201.open', 'XV202.open'], cleanWhen: ['P202.running', 'XV203.open'], tag: 'PDIT-201', label: 'TMP', unit: 'psi', decimals: 1 },
    { id: 'p4', type: 'pipe', points: [[450, 120], [520, 120]], fluid: 'water', flow: 'XV202.flow' },
    { id: 'XV202', type: 'valve', at: [545, 120], from: 'source', to: 'drain', gpm: 250, drive: 'XV202', label: 'Permeate', tag: 'XV-202' },
    { id: 'AIT201', type: 'analog', at: [545, 60], signal: 'AIT201', value: 0.03, unit: 'NTU', min: 0, max: 1, decimals: 3, tag: 'AIT-201', label: 'Turbidity (drag)' },
    { id: 'p5', type: 'pipe', points: [[570, 120], [640, 120], [640, 200]], fluid: 'water', flow: 'XV202.flow' },
    { id: 'XV300', type: 'valve', at: [700, 230], from: 'source', to: 'drain', gpm: 250, drive: 'SOL300', failOpen: true, label: 'Divert to waste', tag: 'XV-300' },
    { id: 'XV602', type: 'valve', at: [820, 120], from: 'source', to: 'drain', gpm: 250, drive: 'SOL602', label: 'To building', tag: 'XV-602' },
    { id: 'p6', type: 'pipe', points: [[640, 120], [795, 120]], fluid: 'water', flow: 'XV602.flow' },
    { id: 'p7', type: 'pipe', points: [[640, 200], [640, 230], [675, 230]], fluid: 'water', flow: 'XV300.flow' },
    { id: 'p8', type: 'pipe', points: [[845, 120], [980, 120]], fluid: 'water', flow: 'XV602.flow' },
    { id: 'XV204', type: 'valve', at: [415, 40], from: 'source', to: 'drain', gpm: 100, drive: 'XV204', label: 'Top drain', tag: 'XV-204' },
    { id: 'XV205', type: 'valve', at: [330, 270], from: 'source', to: 'drain', gpm: 100, drive: 'XV205', label: 'Lower drain', tag: 'XV-205' },
    { id: 'XV203', type: 'valve', at: [500, 230], from: 'source', to: 'drain', gpm: 180, drive: 'XV203', label: 'BW supply', tag: 'XV-203' },
    { id: 'P202', type: 'pump', at: [500, 290], from: 'source', to: 'drain', gpm: 180, drive: 'KM202', label: 'P-202 backwash', tag: 'KM202' },
    { id: 'XV206', type: 'valve', at: [300, 100], from: 'source', to: 'drain', gpm: 50, drive: 'XV206', label: 'Scour air', tag: 'XV-206' },
    { id: 'BL201', type: 'motor', at: [230, 100], drive: 'KM201', label: 'BL-201 blower', tag: 'KM201' },
    { id: 'door', type: 'panel', at: [20, 390], size: [960, 155], label: 'Skid control panel' },
    { id: 'es1', type: 'estop', at: [90, 470], signal: 'ES1', tag: 'ES1' },
    { id: 'pb1', type: 'button', at: [200, 470], signal: 'PB1', tag: 'PB1', label: 'Start', color: 'green' },
    { id: 'pb2', type: 'button', at: [290, 470], signal: 'PB2', tag: 'PB2', label: 'Stop', color: 'red' },
    { id: 'pb3', type: 'button', at: [380, 470], signal: 'PB3', tag: 'PB3', label: 'Alarm ack', color: 'black' },
    { id: 'h2', type: 'lamp', at: [480, 470], signal: 'H2', tag: 'H2', label: 'Off-spec', color: 'red' },
    { id: 'ha1', type: 'horn', at: [560, 470], signal: 'HA1', tag: 'HA1', label: 'Horn' },
    { id: 'ks', type: 'lamp', at: [650, 470], signal: 'KSAFE', tag: 'K-SAFE', label: 'Safety relay', color: 'green' },
    { id: 'disp', type: 'display', at: [780, 470], signal: 'StateOut', label: 'Sequence step' },
  ],
};

export default [truckPlc, benchPlc, washPlc, liftPlc, pressPlc, pressRemote, mwtp];
