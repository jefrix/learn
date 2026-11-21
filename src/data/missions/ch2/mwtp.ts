// Chapter 2, mission 2.12: final. A simplified MWTP ultrafiltration skid.
import type { Mission } from '../../../engine/mission/types';
import { forcedEStop } from './basics';

const MWTP_REF = `TAG State DINT // 0 idle, 10 filtering, 21-24 backwash steps
// Run request. Stop_PB is wired NC.
XIC(EStop_OK)XIC(Stop_PB)[XIC(Start_PB),XIC(Run_Req)]OTE(Run_Req);
XIC(Run_Req)EQU(State,0)MOV(10,State);
// Filter run time adds up only while filtering. Backwash at 45 min, or early if TMP passes 22 psi.
EQU(State,10)RTO(Filter_Time,2700000,0);
EQU(State,10)[XIC(Filter_Time.DN),GRT(TMP_psi,22)]MOV(21,State);
// Backwash steps: isolate and vent 5 s, air scour 15 s, reverse flush 15 s, lower sweep 10 s.
EQU(State,21)TON(Step21,5000,0);
XIC(Step21.DN)MOV(22,State);
EQU(State,22)TON(Step22,15000,0);
XIC(Step22.DN)MOV(23,State);
EQU(State,23)TON(Step23,15000,0);
XIC(Step23.DN)MOV(24,State);
EQU(State,24)TON(Step24,10000,0);
XIC(Step24.DN)RES(Filter_Time)MOV(10,State);
XIO(Run_Req)MOV(0,State);
// Outputs by step
EQU(State,10)OTE(P101_Run);
EQU(State,10)OTE(XV201_Open);
EQU(State,10)OTE(XV202_Open);
[EQU(State,21),EQU(State,22),EQU(State,23),EQU(State,24)]OTE(XV204_Open);
EQU(State,22)OTE(XV206_Open);
EQU(State,22)OTE(BL201_Run);
[EQU(State,23),EQU(State,24)]OTE(XV203_Open);
[EQU(State,23),EQU(State,24)]OTE(P202_Run);
EQU(State,24)OTE(XV205_Open);
// Turbidity over 0.15 NTU for 5 s: off-spec. Divert to waste and close the building valve.
GRT(Turb_NTU,0.15)TON(Turb_Tmr,5000,0);
XIC(Turb_Tmr.DN)OTL(Off_Spec);
XIC(Turb_Tmr.DN)ONS(Turb_OS)OTL(Alarm_Unack);
XIC(Ack_PB)OTU(Alarm_Unack);
XIC(Ack_PB)LEQ(Turb_NTU,0.15)OTU(Off_Spec);
XIC(Alarm_Unack)OTE(Alarm_Horn);
[XIC(Off_Spec),XIC(Alarm_Unack)]OTE(OffSpec_Lamp);
// Hold the divert closed and the building valve open only while making good water.
GEQ(State,10)XIO(Off_Spec)OTE(XV300_Sol);
GEQ(State,10)XIO(Off_Spec)OTE(XV602_Sol);
MOV(State,State_Display);`;

const mwtpMission: Mission = {
  id: '2.12',
  chapter: 2,
  order: 12,
  kind: 'build',
  engine: 'ladder',
  machine: 'mwtp',
  title: 'Final: Water Trailer',
  site: 'MWTP trailer at a restaurant during a boil-water advisory',
  brief:
    "The Mobile Water Treatment Plant makes drinking water for a restaurant. This skid is a simplified, single-train version of the MWTP-250 design in our reference folder.\n\n**Filtering (step 10):** P-101 runs, feed XV-201 and permeate XV-202 open.\n\n**Backwash** after **45 minutes** of filtering time, or early if TMP (PDIT-201) goes over **22 psi**:\n- 21: isolate and vent, 5 s. XV-201/202 close, top drain XV-204 opens.\n- 22: air scour, 15 s. Blower BL-201 and XV-206.\n- 23: reverse flush, 15 s. P-202 and XV-203, draining through XV-204.\n- 24: lower sweep, 10 s. Add XV-205.\n- Back to 10, and the filter time resets.\n\n**Off-spec water:** turbidity (AIT-201) over **0.15 NTU for 5 s** opens divert XV-300 to waste, closes XV-602 to the building, and sounds the horn. It stays diverted until turbidity is good **and** someone acks.\n\nA hardwired safety relay, **K-SAFE**, already opens XV-300 and closes XV-602 if the E-stop is pressed or the PLC faults. Use a **state number** (a DINT) with MOV and EQU to run the sequence.",
  goal: ['Start/Stop, filtering in step 10.', 'Backwash sequence with the right valves and times, on a 45-minute timer or high TMP.', 'Turbidity divert with alarm and acknowledge.', 'XV-300 closed and XV-602 open only while making good water.'],
  starter: 'TAG State DINT // 0 idle, 10 filtering, 21-24 backwash steps\n// Your sequence here.',
  editable: true,
  tests: [
    {
      name: 'Start: filtering, with good water to the building.',
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 3, expect: { 'P101.running': true, 'XV201.open': true, 'XV202.open': true }, say: 'After Start, P-101 should run with XV-201 and XV-202 open.' },
        { t: 3, expect: { 'XV300.open': false, 'XV602.open': true }, say: 'While filtering good water, XV-300 should be closed and XV-602 open.' },
        { t: 4, tap: 'PB2' },
        { t: 5, expect: { 'P101.running': false, 'XV602.open': false, 'XV300.open': true }, say: 'After Stop, the pump should stop, XV-602 close and XV-300 open to waste.' },
      ],
    },
    {
      name: 'Backwash after 45 minutes of filtering, step by step.',
      dt: 0.1,
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 2690, expect: { 'XV201.open': true, 'XV204.open': false }, say: 'Backwash started before 45 minutes.' },
        { t: 2704, expect: { 'XV201.open': false, 'XV202.open': false, 'XV204.open': true, 'P101.running': false }, say: 'Step 21 (isolate and vent): feed and permeate closed, top drain XV-204 open, P-101 off.' },
        { t: 2712, expect: { 'BL201.running': true, 'XV206.open': true, 'XV204.open': true }, say: 'Step 22 (air scour): blower BL-201 and XV-206 on, XV-204 open.' },
        { t: 2727, expect: { 'P202.running': true, 'XV203.open': true, 'XV206.open': false, 'BL201.running': false }, say: 'Step 23 (reverse flush): P-202 and XV-203 on, air off.' },
        { t: 2741, expect: { 'XV205.open': true, 'P202.running': true }, say: 'Step 24 (lower sweep): XV-205 open with P-202 still running.' },
        { t: 2750, expect: { 'XV201.open': true, 'P202.running': false, 'XV205.open': false, 'XV204.open': false }, say: 'After 45 s of backwash, the skid should be back to filtering.' },
        { t: 2800, expect: { 'XV201.open': true }, say: 'A second backwash started right away: reset the filter time at the end.' },
      ],
    },
    {
      name: 'High TMP starts a backwash early.',
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 30, set: { PDIT201: 23 } },
        { t: 31, expect: { 'XV204.open': true, 'XV201.open': false }, say: 'TMP went over 22 psi and no backwash started.' },
      ],
    },
    {
      name: 'Off-spec water: divert after 5 s, horn, and hold until acknowledged.',
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 10, set: { AIT201: 0.3 } },
        { t: 13, expect: { 'XV300.open': false, 'XV602.open': true }, say: 'The skid diverted before turbidity had been high for 5 s.' },
        { t: 15.6, expect: { 'XV300.open': true, 'XV602.open': false, HA1: true }, say: 'After 5 s over 0.15 NTU, XV-300 should open, XV-602 close and the horn sound.' },
        { t: 20, set: { AIT201: 0.03 } },
        { t: 22, expect: { 'XV300.open': true, 'XV602.open': false }, say: 'The skid went back to the building on its own. It should wait for an Ack.' },
        { t: 23, tap: 'PB3' },
        { t: 24, expect: { 'XV300.open': false, 'XV602.open': true, HA1: false }, say: 'After good water and an Ack, the skid did not return to service.' },
      ],
    },
    {
      name: 'A short turbidity spike does not divert.',
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 10, set: { AIT201: 0.3 } },
        { t: 13, set: { AIT201: 0.03 } },
        { t: 13.5, until: 20, expect: { 'XV300.open': false, HA1: false }, say: 'A 3-second spike diverted the water. The trip needs 5 s.' },
      ],
    },
    {
      name: 'PLC fault: K-SAFE fails the valves safe.',
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 3, fault: { type: 'plcHalt' } },
        { t: 3.5, expect: { 'XV300.open': true, 'XV602.open': false, 'P101.running': false }, say: 'With the PLC faulted, XV-300 should open to waste and XV-602 close.' },
      ],
    },
    forcedEStop('ES1', 'KM101'),
  ],
  reference: MWTP_REF,
  help: ['state-machines', 'mov', 'compare', 'rto', 'alarms-and-ack', 'hardwired-safety'],
  realWorld:
    "This is a **teaching simplification**. The MWTP-250 design runs two UF trains so one keeps producing while the other backwashes, adds a daily pressure-decay integrity test, UV, chlorination with CT tracking, and a Fill & Prove step before any water goes to a building. Its documents also differ in places: the backwash is 45 s in the P&ID but 40 s in one electrical note. Potable water systems need state approval and certified operators; nothing here is a design for one. The real panel uses a CompactLogix 5380 in the design notes, so Studio 5000 instruction names apply.",
  hints: ['Start: `XIC(Run_Req)EQU(State,0)MOV(10,State)`.', 'Each step: `EQU(State,21)TON(Step21,5000,0)` then `XIC(Step21.DN)MOV(22,State)`.', 'Outputs by step: `[EQU(State,23),EQU(State,24)]OTE(P202_Run)`.', 'Off-spec: `GRT(Turb_NTU,0.15)TON(Turb_Tmr,5000,0)` then latch Off_Spec.'],
};

export default [mwtpMission];
