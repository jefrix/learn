// The PJDL-302 screw press: plant, panel door, and a simplified redraw of its
// relay logic from sheets 3, 4 and 6 (see reference/screwpress/CONTROL_LOGIC.md).
import type { MachineDef } from '../../engine/machine';
import type { PartDef } from '../../engine/process/world';
import type { DeviceDef } from '../../engine/relay/devices';

/**
 * The press control circuit, redrawn as horizontal rungs. Wire numbers follow
 * the drawings where they could be read. Best readings, not confirmed:
 * KA1 is treated as closed; KA4 is modeled as an Auto relay whose changeover
 * contacts keep the Manual and Auto legs from feeding each other; each pump
 * gets its own KA4 contact below wire 33.
 */
export const PRESS_PANEL = `// H1 power lamp is wired after QF1, so it stays lit with the E-stop pressed.
LAMP(H1);
// SB1 E-stop breaks the control circuit only: wire 1 to wire 2.
NC(SB1)@2;
// Sheet 3: drive faults and overload trips light a lamp and pull in a fault relay.
@2: NO(U1)@3[COIL(KA20),LAMP(H30)];
@2: NO(U2)@4[COIL(KA21),LAMP(H31)];
@2: NO(FR2)@5[COIL(KA22),LAMP(H32)];
@2: NO(FR3)@6[COIL(KA23),LAMP(H33)];
@2: NO(FR4)@7[COIL(KA24),LAMP(H34)];
// Wash valve Y1: SB2 by hand, or KT1's pulse.
@2: [NO(SB2),NO(KT1)]@15[SOL(Y1),LAMP(H3)];
// KT1 cycles while either screw runs: 10 min off, 30 s on.
@2: [NO(KM11),NO(KM12)]@13 TMR(KT1,cycle,600,30);
// SA2 Manual feeds wire 17; Auto feeds wire 18.
@2: POS(SA2,manual)@17;
@2: POS(SA2,auto)@18;
// KA4 pulls in whenever SA2 is at Auto (best reading of sheet 4).
@18: COIL(KA4);
// KA3: remote enabled when SA1 is at Remote.
@18: POS(SA1,remote)@42 COIL(KA3);
// KA5 Auto run latch: SB3 starts and SB4 stops in Local; the plant PLC contact on 18/41 runs it in Remote.
@18: [[NO(SB3),NO(KA5)]@38 NC(SB4)@39 NC(KA3),NO(PLC)@41 NO(KA3)]@40 COIL(KA5);
// KT2 starts timing the run-on when KA5 drops.
@18: NC(KA5)@43 TMR(KT2,on,300);
// Screws in Auto: held by KA5, or by their own contacts until KT2 times out.
@18: [NO(KA5),NO(KM11),NO(KM12)]@20 NC(KT2)@21 NO(KA4)@19;
// Screws in Manual.
@17: NC(KA4)@19;
// SA11 and SA12 sit after the Manual and Auto paths join at wire 19, so they count in both modes.
@19: POS(SA11,on)@22 NC(KA20)[COIL(KM11),LAMP(H5)];
@19: POS(SA12,on)@23 NC(KA21)[COIL(KM12),LAMP(H16)];
// Mixer: SA4 in Manual, KA5 in Auto.
@17: POS(SA4,on)@27 NC(KA4)@28;
@18: NO(KA5)@29 NO(KA4)@28;
@28: NC(FR2)[COIL(KM2),LAMP(H6)];
// Sludge feed: SA5 in Manual; KA5 and the LVS1 level relay in Auto. Float 31/32 is in series.
@17: POS(SA5,on)@30 NC(KA4)@31;
@18: NO(KA5)@34 NO(LVS1)@33;
@33: NO(KA4)@31;
@31: NO(LS1)@32 NC(FR3)[COIL(KM3),LAMP(H7)];
// Dosing pump: SA6 in Manual; the same LVS1 gate in Auto. Float 36/37 is in series with this pump only.
@17: POS(SA6,on)@35 NC(KA4)@36;
@33: NO(KA4)@36;
@36: NO(LS2)@37 NC(FR4)[COIL(KM4),LAMP(H8)];`;

/** Sheet 6: the dry contacts a plant PLC reads on P1 to P4. P1 is the PLC's own 24 V common. */
export const PRESS_P_TERMINALS = `// P1-P2: press remote enabled.
@P1: NO(KA3)IN(P2);
// P1-P3: press running.
@P1: [NO(KM11),NO(KM12),NO(KM2),NO(KM3),NO(KM4)]IN(P3);
// P1-P4: press fault ("Mouse Fault" on the drawing).
@P1: [NO(KA20),NO(KA21),NO(KA22),NO(KA23),NO(KA24)]IN(P4);`;

const sel = (tag: string, label: string, positions = ['off', 'on']): DeviceDef => ({ tag, type: 'selector', label, positions });

export const pressDevices: Record<string, DeviceDef> = {
  SB1: { tag: 'SB1', type: 'estop', label: 'E-stop' },
  SB2: { tag: 'SB2', type: 'pushbutton', label: 'Wash valve' },
  SB3: { tag: 'SB3', type: 'pushbutton', label: 'Auto start' },
  SB4: { tag: 'SB4', type: 'pushbutton', label: 'Auto stop' },
  SA1: sel('SA1', 'Local/Remote', ['local', 'remote']),
  SA2: sel('SA2', 'Manual/Stop/Auto', ['manual', 'stop', 'auto']),
  SA4: sel('SA4', 'Mixer'),
  SA5: sel('SA5', 'Sludge pump'),
  SA6: sel('SA6', 'Dosing pump'),
  SA11: sel('SA11', 'Drive 1'),
  SA12: sel('SA12', 'Drive 2'),
  PLC: { tag: 'PLC', type: 'signal', label: 'Plant PLC 18/41', signal: 'PLC', terminals: '18/41' },
  U1: { tag: 'U1', type: 'signal', label: 'Drive 1 fault', signal: 'U1.fault' },
  U2: { tag: 'U2', type: 'signal', label: 'Drive 2 fault', signal: 'U2.fault' },
  FR2: { tag: 'FR2', type: 'overload', label: 'Mixer overload' },
  FR3: { tag: 'FR3', type: 'overload', label: 'Sludge pump OL' },
  FR4: { tag: 'FR4', type: 'overload', label: 'Dosing pump OL' },
  LS1: { tag: 'LS1', type: 'float', label: 'Sludge low 31/32', terminals: '31/32' },
  LS2: { tag: 'LS2', type: 'float', label: 'Polymer low 36/37', terminals: '36/37' },
  LVS1: { tag: 'LVS1', type: 'levelRelay', label: 'Mix tank level', low: 'LVS1.E2', high: 'LVS1.E3' },
  KA3: { tag: 'KA3', type: 'relay', label: 'Remote enabled' },
  KA4: { tag: 'KA4', type: 'relay', label: 'Auto relay' },
  KA5: { tag: 'KA5', type: 'relay', label: 'Auto run latch' },
  KA20: { tag: 'KA20', type: 'relay', label: 'Drive 1 fault' },
  KA21: { tag: 'KA21', type: 'relay', label: 'Drive 2 fault' },
  KA22: { tag: 'KA22', type: 'relay', label: 'Mixer fault' },
  KA23: { tag: 'KA23', type: 'relay', label: 'Feed fault' },
  KA24: { tag: 'KA24', type: 'relay', label: 'Dosing fault' },
  KM11: { tag: 'KM11', type: 'contactor', label: 'Screw 1' },
  KM12: { tag: 'KM12', type: 'contactor', label: 'Screw 2' },
  KM2: { tag: 'KM2', type: 'contactor', label: 'Mixer' },
  KM3: { tag: 'KM3', type: 'contactor', label: 'Sludge pump' },
  KM4: { tag: 'KM4', type: 'contactor', label: 'Dosing pump' },
  KT1: { tag: 'KT1', type: 'timer', label: 'Wash cycle' },
  KT2: { tag: 'KT2', type: 'timer', label: 'Run-on' },
  Y1: { tag: 'Y1', type: 'solenoid', label: 'Wash water' },
  H1: { tag: 'H1', type: 'lamp', label: 'Power' },
  H3: { tag: 'H3', type: 'lamp', label: 'Washing' },
  H5: { tag: 'H5', type: 'lamp', label: 'Screw 1 run' },
  H16: { tag: 'H16', type: 'lamp', label: 'Screw 2 run' },
  H6: { tag: 'H6', type: 'lamp', label: 'Mixer run' },
  H7: { tag: 'H7', type: 'lamp', label: 'Feed run' },
  H8: { tag: 'H8', type: 'lamp', label: 'Dosing run' },
  H30: { tag: 'H30', type: 'lamp', label: 'Drive 1 fault' },
  H31: { tag: 'H31', type: 'lamp', label: 'Drive 2 fault' },
  H32: { tag: 'H32', type: 'lamp', label: 'Mixer fault' },
  H33: { tag: 'H33', type: 'lamp', label: 'Feed fault' },
  H34: { tag: 'H34', type: 'lamp', label: 'Dosing fault' },
};

/** The process side: tanks, pumps, mixer, screws, drives. */
export const pressPlant: PartDef[] = [
  { id: 'TK_SL', type: 'tank', at: [20, 70], size: [120, 170], capacity: 3000, level: 0.7, fluid: 'sludge', label: 'Sludge tank' },
  { id: 'LS1_f', type: 'float', tank: 'TK_SL', at_level: 0.1, signal: 'LS1', label: 'LS1' },
  { id: 'TK_PO', type: 'tank', at: [200, 70], size: [80, 110], capacity: 60, level: 0.6, fluid: 'poly', label: 'Polymer tank' },
  { id: 'LS2_f', type: 'float', tank: 'TK_PO', at_level: 0.15, signal: 'LS2', label: 'LS2' },
  { id: 'TK_MIX', type: 'tank', at: [360, 90], size: [140, 160], capacity: 100, level: 0.5, fluid: 'floc', label: 'Mixing tank', feedBy: ['P_SL'], doseBy: ['P_PO'] },
  { id: 'rods', type: 'electrodes', tank: 'TK_MIX', low: 0.42, high: 0.86, lowSignal: 'LVS1.E2', highSignal: 'LVS1.E3', label: 'LVS1' },
  { id: 'pSl1', type: 'pipe', points: [[80, 240], [80, 290], [200, 290]], fluid: 'sludge', flow: 'P_SL.flow' },
  { id: 'pSl2', type: 'pipe', points: [[240, 290], [330, 290], [330, 110], [360, 110]], fluid: 'sludge', flow: 'P_SL.flow' },
  { id: 'P_SL', type: 'pump', at: [220, 290], from: 'TK_SL', to: 'TK_MIX', gpm: 10, drive: 'KM3', overload: 'FR3', label: 'Sludge pump', tag: 'KM3' },
  { id: 'pPo1', type: 'pipe', points: [[240, 180], [240, 215], [262, 215]], fluid: 'poly', flow: 'P_PO.flow' },
  { id: 'pPo2', type: 'pipe', points: [[298, 215], [312, 215], [312, 130], [360, 130]], fluid: 'poly', flow: 'P_PO.flow' },
  { id: 'P_PO', type: 'pump', at: [280, 215], from: 'TK_PO', to: 'TK_MIX', gpm: 0.6, drive: 'KM4', overload: 'FR4', label: 'Dosing', tag: 'KM4' },
  { id: 'M_MIX', type: 'motor', at: [420, 52], drive: 'KM2', overload: 'FR2', label: 'Mixer', tag: 'KM2' },
  { id: 'pScr', type: 'pipe', points: [[500, 230], [530, 230], [530, 120], [560, 120]], fluid: 'floc', flow: 'S1.flow' },
  { id: 'pScr2', type: 'pipe', points: [[530, 200], [560, 200]], fluid: 'floc', flow: 'S2.flow' },
  { id: 'S1', type: 'screw', at: [575, 120], from: 'TK_MIX', gpm: 2.8, drive: 'KM11', vfd: 'U1', length: 230, label: 'Screw 1', tag: 'KM11' },
  { id: 'S2', type: 'screw', at: [575, 200], from: 'TK_MIX', gpm: 2.8, drive: 'KM12', vfd: 'U2', length: 230, label: 'Screw 2', tag: 'KM12' },
  { id: 'pWash', type: 'pipe', points: [[560, 66], [800, 66], [800, 90]], fluid: 'water', flow: 'Y1v.flow' },
  { id: 'Y1v', type: 'valve', at: [640, 66], from: 'source', to: 'drain', gpm: 5, drive: 'Y1', label: 'Wash', tag: 'Y1' },
  { id: 'cake', type: 'label', at: [812, 130], label: 'Cake →', cls: 'part-label' },
  { id: 'U1', type: 'vfd', at: [870, 120], tag: 'U1', label: 'Drive 1', run: 'KM11' },
  { id: 'U2', type: 'vfd', at: [945, 120], tag: 'U2', label: 'Drive 2', run: 'KM12' },
];

const lamp = (id: string, x: number, label: string, color: string) => ({ id: `l_${id}`, type: 'lamp' as const, at: [x, 395] as [number, number], signal: id, tag: id, label, color });
const knob = (id: string, x: number, label: string, positions = ['off', 'on'], initial?: string) => ({ id: `k_${id}`, type: 'selector' as const, at: [x, 525] as [number, number], signal: id, tag: id, label, positions, initial });

/** Door and cabinet devices. */
export const pressDoor: PartDef[] = [
  { id: 'door', type: 'panel', at: [10, 340], size: [980, 285], label: 'PJDL-302 panel door (simplified)' },
  lamp('H1', 50, 'Power', 'white'),
  lamp('H5', 110, 'Screw 1', 'green'),
  lamp('H16', 165, 'Screw 2', 'green'),
  lamp('H6', 220, 'Mixer', 'green'),
  lamp('H7', 275, 'Feed', 'green'),
  lamp('H8', 330, 'Dosing', 'green'),
  lamp('H3', 385, 'Wash', 'blue'),
  lamp('H30', 470, 'Drive 1', 'red'),
  lamp('H31', 525, 'Drive 2', 'red'),
  lamp('H32', 580, 'Mixer', 'red'),
  lamp('H33', 635, 'Feed', 'red'),
  lamp('H34', 690, 'Dosing', 'red'),
  { id: 'lblRun', type: 'label', at: [30, 450], label: 'Running', cls: 'part-label big' },
  { id: 'lblFault', type: 'label', at: [450, 450], label: 'Faults', cls: 'part-label big' },
  { id: 'SB1', type: 'estop', at: [60, 530], signal: 'SB1', tag: 'SB1', label: 'E-STOP' },
  knob('SA2', 165, 'Mode', ['manual', 'stop', 'auto'], 'stop'),
  knob('SA1', 265, 'Local/Remote', ['local', 'remote']),
  { id: 'SB3', type: 'button', at: [350, 530], signal: 'SB3', tag: 'SB3', label: 'Auto start', color: 'green', lamp: 'KA5' },
  { id: 'SB4', type: 'button', at: [425, 530], signal: 'SB4', tag: 'SB4', label: 'Auto stop', color: 'red' },
  { id: 'SB2', type: 'button', at: [500, 530], signal: 'SB2', tag: 'SB2', label: 'Wash', color: 'black' },
  knob('SA4', 590, 'Mixer'),
  knob('SA5', 665, 'Feed'),
  knob('SA6', 740, 'Dosing'),
  knob('SA11', 830, 'Drive 1'),
  knob('SA12', 920, 'Drive 2'),
  { id: 'cab', type: 'panel', at: [600, 245], size: [390, 88], label: 'Inside the cabinet' },
  { id: 'FR2', type: 'overload', at: [650, 290], signal: 'FR2', tripAfter: 4, coolFor: 3 },
  { id: 'FR3', type: 'overload', at: [720, 290], signal: 'FR3', tripAfter: 4, coolFor: 3 },
  { id: 'FR4', type: 'overload', at: [790, 290], signal: 'FR4', tripAfter: 4, coolFor: 3 },
  { id: 'k_PLC', type: 'switch', at: [920, 296], signal: 'PLC', tag: 'PLC 18/41', label: '', positions: ['off', 'on'] },
];

const press: MachineDef & { volts: string } = {
  id: 'press',
  title: 'PJDL-302 screw press',
  site: 'AmeriPro dewatering building',
  size: [1000, 640],
  volts: '230 VAC',
  devices: pressDevices,
  parts: [...pressPlant, ...pressDoor],
};

/** Starting positions for press missions: running in Auto, like the operator guide's sim. */
export const PRESS_AUTO_INIT = {
  signals: { SA2: 'auto', SA1: 'local', SA11: 'on', SA12: 'on', SA4: 'off', SA5: 'off', SA6: 'off', PLC: 'off' },
  levels: { TK_MIX: 0.5 },
};

export default [press];
