// Chapter 2, missions 2.7 and 2.8: analog level and a duplex lift station.
import type { Mission } from '../../../engine/mission/types';
import { forcedEStop } from './basics';

const SCALE = `TAG Level_In REAL // wet well level, inches
TAG Span_Tmp REAL
// 4-20 mA = 0-120 in: inches = (mA - 4) x 120 / 16 = (mA - 4) x 7.5
SUB(LT101,4,Span_Tmp)MUL(Span_Tmp,7.5,Level_In);
MOV(Level_In,Level_Display);`;

const readLevel: Mission = {
  id: '2.7',
  chapter: 2,
  order: 7,
  kind: 'build',
  engine: 'ladder',
  machine: 'lift-plc',
  title: 'Read the Level',
  site: 'Route 9 lift station',
  brief:
    "The floats are getting replaced by a level transmitter, **LT101**. It sends **4 mA at empty and 20 mA at full** (120 inches) on one analog input.\n\nScale it to inches: `inches = (mA − 4) × 120 / 16`. Use **REAL** tags for the math, or you'll lose the decimals. Declare them in the Tags view, or with a `TAG Level_In REAL` line in Text mode.\n\n**Live zero** is the point of 4-20 mA: a broken wire reads **0 mA**, which is impossible in normal operation. Below 3.6 mA, flag a fault, light the alarm lamp, and don't run the pump in Auto.",
  goal: ['Show the level in inches on Level_Display (±0.5 in).', 'Auto: start pump 1 at 60 in or more, run down to 20 in.', 'Below 3.6 mA: Level_Fault, Alarm_Lamp on, pump 1 off in Auto.', 'HAND still runs pump 1.'],
  starter: `// Raw milliamps on the display. That's not inches.
MOV(LT101,Level_Display);`,
  editable: true,
  init: { signals: { 'WELL.inflow': 0, SA1: 'auto' } },
  tests: [
    {
      name: 'The display reads inches: empty, half, full.',
      init: { signals: { SA1: 'off', 'WELL.inflow': 0 }, levels: { WELL: 0 } },
      steps: [
        { t: 0.5, expect: { LevelOut: { min: -0.5, max: 0.5 } }, say: 'At 4 mA (empty), the display should read 0 in.' },
        { t: 1, level: { WELL: 0.5 } },
        { t: 1.5, expect: { LevelOut: { min: 59.5, max: 60.5 } }, say: 'At 12 mA (half full), the display should read 60 in.' },
        { t: 2, level: { WELL: 0.25 } },
        { t: 2.5, expect: { LevelOut: { min: 29.5, max: 30.5 } }, say: 'At 8 mA, the display should read 30 in. If it reads 28 or 32, check for DINT rounding: use REAL tags.' },
        { t: 3, level: { WELL: 1 } },
        { t: 3.5, expect: { LevelOut: { min: 119.5, max: 120.5 } }, say: 'At 20 mA (full), the display should read 120 in.' },
      ],
    },
    {
      name: 'Auto pumps down from 60 in to 20 in.',
      init: { signals: { SA1: 'auto', 'WELL.inflow': 0 }, levels: { WELL: 0.55 } },
      steps: [
        { t: 1, expect: { KM1: true }, say: 'At 66 in, Auto did not start pump 1.' },
        { t: 2, level: { WELL: 0.3 } },
        { t: 2.5, expect: { KM1: true }, say: 'At 36 in, pump 1 stopped. It should run down to 20 in.' },
        { t: 3, level: { WELL: 0.15 } },
        { t: 3.5, expect: { KM1: false }, say: 'At 18 in, pump 1 kept running.' },
        { t: 4, level: { WELL: 0.4 } },
        { t: 4.5, expect: { KM1: false }, say: 'At 48 in, pump 1 restarted. It should wait for 60 in.' },
      ],
    },
    {
      name: 'A broken transmitter wire faults the level and stops the pump.',
      init: { signals: { SA1: 'auto', 'WELL.inflow': 0 }, levels: { WELL: 0.55 } },
      steps: [
        { t: 1, expect: { KM1: true }, say: 'Auto did not start the pump at 66 in.' },
        { t: 2, fault: { type: 'wireBreak', part: 'LT101' } },
        { t: 2.5, expect: { H3: true, KM1: false }, say: 'At 0 mA the level is unknown: Alarm_Lamp should light and pump 1 should stop in Auto.' },
      ],
    },
    {
      name: 'HAND runs pump 1.',
      init: { signals: { SA1: 'hand', 'WELL.inflow': 0 }, levels: { WELL: 0.3 } },
      steps: [{ t: 1, expect: { KM1: true }, say: 'With SA1 at HAND, pump 1 did not run.' }],
    },
  ],
  reference: `${SCALE}
LES(LT101,3.6)OTE(Level_Fault);
[XIC(HOA_Hand),XIC(HOA_Auto)XIO(Level_Fault)[GEQ(Level_In,60),XIC(P1_Run)]GRT(Level_In,20)]OTE(P1_Run);
XIC(Level_Fault)OTE(Alarm_Lamp);`,
  help: ['analog-scaling', 'math', 'compare', 'tags-and-types'],
  realWorld:
    "Real analog cards can scale for you: in Studio 5000 you set the module's **high and low engineering values**, and in CCW the **Micro800 analog plug-in** has its own configuration. Doing it in ladder, like here, is still common. Where you scale, scale in REAL. **NAMUR NE 43** puts failure signals below 3.6 mA or above 21 mA. A tank's \"inches\" also depend on where the transmitter is mounted; check the zero.",
  hints: ['`SUB(LT101,4,Span_Tmp)` then `MUL(Span_Tmp,7.5,Level_In)`. 120/16 = 7.5.', 'Declare `Level_In` and `Span_Tmp` as REAL first.', 'Pump rung: `XIC(HOA_Auto)XIO(Level_Fault)[GEQ(Level_In,60),XIC(P1_Run)]GRT(Level_In,20)OTE(P1_Run)`, with HAND as another branch.'],
};

const duplex: Mission = {
  id: '2.8',
  chapter: 2,
  order: 8,
  kind: 'build',
  engine: 'ladder',
  machine: 'lift-plc',
  title: 'Duplex Lift Station',
  site: 'Route 9 lift station',
  brief:
    "Two pumps share the wet well. The rules most duplex stations use:\n\n- A **pump-down cycle** starts at 60 in and ends at 20 in.\n- The **lead** pump runs every cycle. At 84 in, the **lag** pump joins in until the cycle ends.\n- At the end of each cycle, lead and lag **swap** so both pumps wear evenly.\n- If a pump's overload trips, the other one takes over.\n- At 102 in, a **high-level alarm**: horn and lamp. **Ack** silences the horn; the lamp stays on until the level drops back below 102 in.\n\nThe scaling rungs from 2.7 are already in place.",
  goal: ['Alternate the lead pump every cycle.', 'Lag joins at 84 in.', 'A tripped pump is replaced by the other.', 'High-level alarm with acknowledge.'],
  starter: SCALE,
  editable: true,
  init: { signals: { 'WELL.inflow': 0, SA1: 'auto' } },
  tests: [
    {
      name: 'The lead pump alternates each cycle.',
      init: { signals: { SA1: 'auto', 'WELL.inflow': 0 }, levels: { WELL: 0.55 } },
      steps: [
        { t: 1, expect: { KM1: true, KM2: false }, say: 'First cycle: only one pump (pump 1) should run.' },
        { t: 2, level: { WELL: 0.1 } },
        { t: 2.5, expect: { KM1: false, KM2: false }, say: 'Below 20 in, both pumps should stop.' },
        { t: 3, level: { WELL: 0.55 } },
        { t: 3.5, expect: { KM1: false, KM2: true }, say: 'Second cycle: pump 2 should lead, so the pumps wear evenly.' },
        { t: 4, level: { WELL: 0.1 } },
        { t: 5, level: { WELL: 0.55 } },
        { t: 5.5, expect: { KM1: true, KM2: false }, say: 'Third cycle: pump 1 should lead again.' },
      ],
    },
    {
      name: 'The lag pump joins at 84 in.',
      init: { signals: { SA1: 'auto', 'WELL.inflow': 0 }, levels: { WELL: 0.55 } },
      steps: [
        { t: 1, expect: { KM1: true, KM2: false }, say: 'At 66 in only the lead pump should run.' },
        { t: 2, level: { WELL: 0.75 } },
        { t: 2.5, expect: { KM1: true, KM2: true }, say: 'At 90 in both pumps should run.' },
        { t: 3, level: { WELL: 0.1 } },
        { t: 3.5, expect: { KM1: false, KM2: false }, say: 'Below 20 in both pumps should stop.' },
      ],
    },
    {
      name: 'A tripped lead pump is replaced by the other.',
      init: { signals: { SA1: 'auto', 'WELL.inflow': 0 }, levels: { WELL: 0.55 } },
      steps: [
        { t: 1, expect: { KM1: true }, say: 'Pump 1 should lead the first cycle.' },
        { t: 2, fault: { type: 'trip', part: 'FR1' } },
        { t: 2.5, expect: { KM1: false, KM2: true }, say: "Pump 1's overload tripped and pump 2 did not take over." },
      ],
    },
    {
      name: 'High-level alarm: horn until ack, lamp until the level drops.',
      init: { signals: { SA1: 'off', 'WELL.inflow': 0 }, levels: { WELL: 0.5 } },
      steps: [
        { t: 0.5, expect: { HA1: false, H3: false }, say: 'The alarm was on at 60 in.' },
        { t: 1, level: { WELL: 0.9 } },
        { t: 1.5, expect: { HA1: true, H3: true }, say: 'At 108 in the horn and alarm lamp should be on.' },
        { t: 2, tap: 'SB1' },
        { t: 3, expect: { HA1: false, H3: true }, say: 'After Ack the horn should stop, but the lamp stays on while the level is still high.' },
        { t: 4, level: { WELL: 0.5 } },
        { t: 4.5, expect: { H3: false, HA1: false }, say: 'With the level back down and the alarm acknowledged, the lamp should go out.' },
      ],
    },
    {
      name: 'An alarm that clears by itself still needs an ack.',
      init: { signals: { SA1: 'off', 'WELL.inflow': 0 }, levels: { WELL: 0.5 } },
      steps: [
        { t: 1, level: { WELL: 0.9 } },
        { t: 2, level: { WELL: 0.5 } },
        { t: 2.5, expect: { HA1: true, H3: true }, say: 'The level went high and came back down with nobody acknowledging: the horn and lamp should stay on until Ack.' },
        { t: 3, tap: 'SB1' },
        { t: 4, expect: { HA1: false, H3: false }, say: 'After Ack, with the level normal, the alarm should clear.' },
      ],
    },
    forcedEStop('ES1', 'KM1'),
  ],
  reference: `${SCALE}
// Pump-down cycle: 60 in to 20 in
XIC(HOA_Auto)[GEQ(Level_In,60),XIC(Cycle)]GRT(Level_In,20)OTE(Cycle);
XIC(Cycle)[GEQ(Level_In,84),XIC(Lag_Call)]OTE(Lag_Call);
// Swap lead at the end of every cycle
XIO(Cycle)ONS(Cycle_End_OS)OTE(Swap);
[XIC(Swap)XIO(Lead_Is_P2),XIO(Swap)XIC(Lead_Is_P2)]OTE(Lead_Is_P2);
// Run the lead, the lag, or stand in for a tripped pump
XIC(Cycle)XIO(P1_OL)[XIO(Lead_Is_P2),XIC(Lag_Call),XIC(P2_OL)]OTE(P1_Run);
XIC(Cycle)XIO(P2_OL)[XIC(Lead_Is_P2),XIC(Lag_Call),XIC(P1_OL)]OTE(P2_Run);
// High-level alarm with acknowledge
GEQ(Level_In,102)OTE(High_Level);
XIC(High_Level)ONS(High_OS)OTL(Alarm_Unack);
XIC(Ack_PB)OTU(Alarm_Unack);
XIC(Alarm_Unack)OTE(Alarm_Horn);
[XIC(High_Level),XIC(Alarm_Unack)]OTE(Alarm_Lamp);`,
  help: ['lead-lag', 'alarms-and-ack', 'ons', 'compare'],
  realWorld:
    "Real lift stations add a hardwired **high-level float** that starts a pump and sounds the alarm even with the PLC dead, plus run-time logging and a call-out dialer. Alarm handling in bigger systems follows **ISA-18.2** (states like unacknowledged, acknowledged, returned to normal). FactoryTalk and other HMIs handle much of that for you.",
  hints: ['`XIO(Cycle)ONS(Cycle_End_OS)OTE(Swap)` gives one pulse when a cycle ends.', 'Toggle `Lead_Is_P2` the same way you toggled the pump in 2.5.', 'Alarm: `OTL(Alarm_Unack)` on the rising edge of High_Level, `OTU` it on Ack.'],
};

export default [readLevel, duplex];
