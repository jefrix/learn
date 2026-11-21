// Chapter 2, missions 2.9 to 2.11: the press in ladder, the safety gap, and a plant PLC.
import type { Mission } from '../../../engine/mission/types';
import { forcedEStop } from './basics';

const PRESS_INIT = { signals: { SA2: 'auto', SA1: 'local', SA11: 'on', SA12: 'on', SA4: 'off', SA5: 'off', SA6: 'off' }, levels: { TK_MIX: 0.3 } };

export const PRESS_LADDER = `// Auto run latch, like KA5. Auto_Stop_PB is wired NC.
XIC(Mode_Auto)XIC(EStop_OK)[XIC(Auto_Start_PB),XIC(Auto_Run)]XIC(Auto_Stop_PB)OTE(Auto_Run);
XIC(Auto_Run)OTE(Auto_Lamp);
// Run-on timer, like KT2: times while in Auto with Auto_Run off.
XIC(Mode_Auto)XIO(Auto_Run)TON(RunOn_Tmr,300000,0);
// Screws in Auto: run with Auto_Run, then hold until the run-on is done.
XIC(Mode_Auto)XIC(EStop_OK)[XIC(Auto_Run),XIC(Screw_Hold)]XIO(RunOn_Tmr.DN)OTE(Screw_Hold);
// Screw outputs: Manual or the Auto hold, then the drive switch, and no drive fault.
[XIC(Mode_Manual),XIC(Screw_Hold)]XIC(Drive1_Sw)XIO(Drive1_Fault)OTE(Screw1_Run);
[XIC(Mode_Manual),XIC(Screw_Hold)]XIC(Drive2_Sw)XIO(Drive2_Fault)OTE(Screw2_Run);
// Mixer
[XIC(Mode_Manual)XIC(Mixer_Sw),XIC(Mode_Auto)XIC(Auto_Run)]OTE(Mixer_Run);
// Mixing tank level, like LVS1: fill from below the low rod until the high rod is wet.
XIO(Mix_High_Rod)[XIO(Mix_Low_Rod),XIC(Fill_Call)]OTE(Fill_Call);
// Feed and dosing: switches in Manual, the level call in Auto. Floats 31/32 and 36/37 in series.
[XIC(Mode_Manual)XIC(Feed_Sw),XIC(Mode_Auto)XIC(Auto_Run)XIC(Fill_Call)]XIC(Sludge_OK)OTE(Feed_Run);
[XIC(Mode_Manual)XIC(Dose_Sw),XIC(Mode_Auto)XIC(Auto_Run)XIC(Fill_Call)]XIC(Poly_OK)OTE(Dose_Run);
// Wash, like KT1: 10 min off, 30 s on while a screw runs; or SB2 by hand.
[XIC(Screw1_Run),XIC(Screw2_Run)]XIO(Wash_On_Tmr.DN)TON(Wash_Off_Tmr,600000,0);
XIC(Wash_Off_Tmr.DN)TON(Wash_On_Tmr,30000,0);
[XIC(Wash_PB),XIC(Wash_Off_Tmr.DN)XIO(Wash_On_Tmr.DN)]OTE(Wash_Valve);`;

const pressReal =
  "Rebuilding a working relay panel on a PLC is a real project: a new panel or a retrofit, drawings, an electrician, and a risk review. The E-stop, overloads and drive safe-torque-off stay hardwired. If you do it on a **Micro850 or Micro870**, CCW names are different (direct contact, TON block); on **CompactLogix** with Studio 5000, the logic looks just like this. Our relay panel, like this program, restarts Manual-mode motors when the E-stop is released with their switches still on; that's why the procedure says SA2 to Stop first.";

const pressInLadder: Mission = {
  id: '2.9',
  chapter: 2,
  order: 9,
  kind: 'build',
  engine: 'ladder',
  machine: 'press-plc',
  title: 'The Press in Ladder',
  site: 'PJDL-302 screw press',
  brief:
    "Time to rebuild the press's relay logic in ladder. The E-stop, the overloads and the run and fault lamps stay hardwired (open the hardwired circuit under the editor to see them). The PLC gets every switch, button, rod and fault as an input, and drives the contactors through outputs.\n\nMake it behave like the real panel you studied in Chapter 1:\n\n- **Auto:** SB3 latches a run bit (KA5's job); SB4 (wired NC) drops it. Mixer, feed and dosing run with it. Feed and dosing follow the mixing tank level: start below the low rod, stop at the high rod.\n- **Run-on:** after Auto stop, the screws keep turning for 5 minutes (KT2's job). Leaving Auto stops them at once.\n- **Manual:** SA4, SA5, SA6 run the mixer, feed and dosing directly.\n- SA11/SA12 and the drive faults count in both modes.\n- The floats are in series with their pumps.\n\nUse state bits, timers and seal-ins. Any program that passes is fine.",
  goal: ['Auto start, level control, Auto stop with a 5-minute run-on.', 'Manual switches.', 'Drive switches and drive faults.', 'After an E-stop in Auto, nothing restarts until SB3.'],
  starter: '// Your press program. The hardwired circuit is below the Scan and Tags views.',
  editable: true,
  init: PRESS_INIT,
  tests: [
    {
      name: 'Auto start runs the screws, mixer, feed and dosing.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, expect: { KM11: true, KM12: true, KM2: true, KM3: true, KM4: true, KA5: true }, say: 'After SB3 in Auto with the tank low, something did not run (or the SB3 lamp stayed dark).' },
      ],
    },
    {
      name: 'Auto stop: feed quits at once, screws run on for 5 minutes.',
      dt: 0.1,
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 60, tap: 'SB4' },
        { t: 61, expect: { KM2: false, KM3: false, KM4: false }, say: 'After SB4, the mixer, feed or dosing kept running.' },
        { t: 61, until: 357, expect: { KM11: true, KM12: true }, say: 'The screws stopped before 5 minutes of run-on.' },
        { t: 364, expect: { KM11: false, KM12: false }, say: 'The screws were still turning more than 5 minutes after Auto stop.' },
      ],
    },
    {
      name: 'Leaving Auto during the run-on stops the screws at once.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 20, tap: 'SB4' },
        { t: 30, set: { SA2: 'stop' } },
        { t: 30.5, expect: { KM11: false, KM12: false }, say: 'With SA2 out of Auto, the screws kept running.' },
      ],
    },
    {
      name: 'Level control: fill from the low rod to the high rod.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, expect: { KM3: true, KM4: true }, say: 'With the tank below the low rod, feed and dosing did not run.' },
        { t: 4, level: { TK_MIX: 0.9 } },
        { t: 4.5, expect: { KM3: false, KM4: false }, say: 'With the high rod wet, feed and dosing kept going.' },
        { t: 5, level: { TK_MIX: 0.6 } },
        { t: 5.5, expect: { KM3: false }, say: 'Between the rods after a fill, the feed restarted. Wait until the level drops below the low rod.' },
        { t: 6, level: { TK_MIX: 0.3 } },
        { t: 6.5, expect: { KM3: true }, say: 'Below the low rod, the feed did not restart.' },
      ],
    },
    {
      name: 'SA11 at OFF keeps screw 1 off in Auto.',
      init: { signals: { SA11: 'off' } },
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, expect: { KM11: false, KM12: true }, say: 'With SA11 at OFF, screw 1 ran in Auto (or screw 2 did not).' },
      ],
    },
    {
      name: 'Manual: the switches run the motors.',
      init: { signals: { SA2: 'manual', SA4: 'on', SA5: 'on', SA6: 'on' } },
      steps: [{ t: 1, expect: { KM2: true, KM3: true, KM4: true, KM11: true, KM12: true }, say: 'In Manual with SA4, SA5, SA6, SA11 and SA12 on, a motor did not run.' }],
    },
    {
      name: 'A drive 1 fault stops screw 1 only.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, fault: { type: 'vfdFault', part: 'U1' } },
        { t: 3.5, expect: { KM11: false, KM12: true, KM3: true }, say: 'A drive 1 fault should drop KM11 only.' },
      ],
    },
    {
      name: 'E-stop in Auto: nothing restarts when it is released.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 5, press: 'SB1' },
        { t: 5.5, expect: { KM11: false, KM3: false }, say: 'The E-stop did not stop the press.' },
        { t: 7, release: 'SB1' },
        { t: 7.5, until: 10, expect: { KM11: false, KM12: false, KM2: false, KM3: false, KA5: false }, say: 'After the E-stop was released, the press restarted on its own. Drop the Auto run bit and the screw hold when EStop_OK goes to 0.' },
      ],
    },
    forcedEStop('SB1', 'KM3'),
  ],
  reference: PRESS_LADDER,
  help: ['state-machines', 'seal-in', 'ton', 'hardwired-safety', 'level-relay'],
  realWorld: pressReal,
  hints: [
    'Auto run: `XIC(Mode_Auto)XIC(EStop_OK)[XIC(Auto_Start_PB),XIC(Auto_Run)]XIC(Auto_Stop_PB)OTE(Auto_Run)`.',
    'Run-on: `XIC(Mode_Auto)XIO(Auto_Run)TON(RunOn_Tmr,300000,0)`, and a sealed `Screw_Hold` bit that drops on `RunOn_Tmr.DN`.',
    'Level: `XIO(Mix_High_Rod)[XIO(Mix_Low_Rod),XIC(Fill_Call)]OTE(Fill_Call)`.',
  ],
};

export const GAP_FIX = `// Polymer problem: dissolving tank low (36/37) or dosing pump overload tripped.
[XIO(Poly_OK),XIC(Dose_OL)]OTE(Poly_Problem);
XIC(Poly_Problem)ONS(Poly_OS)OTL(Poly_Unack);
XIC(Poly_Problem)OTL(Feed_Block);
XIC(Alarm_Ack_PB)OTU(Poly_Unack);
XIC(Alarm_Ack_PB)XIO(Poly_Problem)OTU(Feed_Block);
XIC(Poly_Unack)OTE(Alarm_Horn);
[XIC(Feed_Block),XIC(Poly_Unack)]OTE(Alarm_Lamp);`;

const GAP_REF = `${GAP_FIX}
${PRESS_LADDER.replace(
  '[XIC(Mode_Manual)XIC(Feed_Sw),XIC(Mode_Auto)XIC(Auto_Run)XIC(Fill_Call)]XIC(Sludge_OK)OTE(Feed_Run);',
  '// Manual now has a high-level cutoff, and nothing feeds while Feed_Block is set.\n[XIC(Mode_Manual)XIC(Feed_Sw)XIO(Mix_High_Rod),XIC(Mode_Auto)XIC(Auto_Run)XIC(Fill_Call)]XIC(Sludge_OK)XIO(Feed_Block)OTE(Feed_Run);',
).replace(
  '[XIC(Mode_Manual)XIC(Dose_Sw),XIC(Mode_Auto)XIC(Auto_Run)XIC(Fill_Call)]XIC(Poly_OK)OTE(Dose_Run);',
  '[XIC(Mode_Manual)XIC(Dose_Sw),XIC(Mode_Auto)XIC(Auto_Run)XIC(Fill_Call)]XIC(Poly_OK)XIO(Feed_Block)OTE(Dose_Run);',
)}`;

const closeGap: Mission = {
  id: '2.10',
  chapter: 2,
  order: 10,
  kind: 'build',
  engine: 'ladder',
  machine: 'press-plc',
  title: 'Close the Gap',
  site: 'PJDL-302 screw press',
  brief:
    "This is the one you came for. On the relay panel, an empty polymer tank or a tripped dosing pump stops **only** the dosing pump, and raw sludge keeps going into the press. In Manual, nothing stops the feed at the high rod.\n\nThe program from 2.9 is loaded. Improve it:\n\n- **Polymer low (Poly_OK = 0) or a dosing trip (Dose_OL = 1):** stop the feed and dosing **at once**, sound the horn and light the alarm lamp.\n- **Ack (SB5):** silences the horn. The feed stays blocked until the problem is gone **and** someone acks it.\n- **Manual:** stop the feed when the high rod is wet.\n\nThe new ack button, horn and alarm lamp are on the door.",
  goal: ['Polymer low or FR4 trip: feed off within 1 s, horn and lamp on.', 'Ack silences the horn; feed stays off until clear and acknowledged.', 'Manual feed stops at the high rod.', 'Everything from 2.9 still works.'],
  starter: PRESS_LADDER,
  editable: true,
  init: PRESS_INIT,
  breakables: [
    { label: 'Trip the dosing pump overload FR4', fault: { type: 'trip', part: 'FR4' } },
    { label: 'Sludge bridges the high rod', fault: { type: 'fouled', part: 'rods' } },
  ],
  tests: [
    {
      name: 'Normal Auto start still runs everything.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, expect: { KM11: true, KM2: true, KM3: true, KM4: true }, say: 'Auto start no longer runs everything.' },
        { t: 3, expect: { HA1: false, H40: false }, say: 'The alarm was on with nothing wrong.' },
      ],
    },
    {
      name: 'Dosing pump trips: feed stops within 1 s, horn and lamp on.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, fault: { type: 'trip', part: 'FR4' } },
        { t: 4, expect: { KM3: false }, say: 'When the dosing pump tripped, the sludge pump kept running: raw, undosed sludge into the press.' },
        { t: 4, expect: { HA1: true, H40: true }, say: 'When the dosing pump tripped, the horn or the alarm lamp did not come on.' },
      ],
    },
    {
      name: 'Polymer tank low: feed stops, horn and lamp on.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, level: { TK_PO: 0.05 } },
        { t: 4, expect: { KM3: false, HA1: true, H40: true }, say: 'When the polymer tank went low, the sludge pump kept running (or no alarm).' },
      ],
    },
    {
      name: 'Ack while still low: horn stops, lamp stays, feed stays off.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, level: { TK_PO: 0.05 } },
        { t: 5, tap: 'SB5' },
        { t: 6, expect: { HA1: false }, say: 'Ack did not silence the horn.' },
        { t: 6, expect: { H40: true, KM3: false }, say: 'After an Ack with the polymer still low, the lamp went out or the feed restarted.' },
      ],
    },
    {
      name: 'Refilled but not acknowledged: feed stays off until Ack.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, level: { TK_PO: 0.05 } },
        { t: 5, level: { TK_PO: 0.6 } },
        { t: 5.5, until: 8, expect: { KM3: false }, say: 'The feed restarted by itself when the polymer came back. It should wait for an Ack.' },
        { t: 8, tap: 'SB5' },
        { t: 9, expect: { KM3: true, HA1: false, H40: false }, say: 'After the refill and an Ack, the feed did not resume or the alarm stayed on.' },
      ],
    },
    {
      name: 'Manual: the feed stops at the high rod.',
      init: { signals: { SA2: 'manual', SA5: 'on' } },
      steps: [
        { t: 1, expect: { KM3: true }, say: 'In Manual with SA5 on and the tank low, the feed did not run.' },
        { t: 2, level: { TK_MIX: 0.9 } },
        { t: 2.5, expect: { KM3: false }, say: 'In Manual, the feed kept running with the high rod wet: the overfill risk.' },
        { t: 3, level: { TK_MIX: 0.3 } },
        { t: 3.5, expect: { KM3: true }, say: 'In Manual, the feed did not resume below the high rod.' },
      ],
    },
    {
      name: 'Auto stop still gives the run-on.',
      dt: 0.1,
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 20, tap: 'SB4' },
        { t: 21, until: 310, expect: { KM11: true, KM3: false }, say: 'The run-on no longer works after your changes.' },
      ],
    },
    forcedEStop('SB1', 'KM3'),
  ],
  reference: GAP_REF,
  help: ['alarms-and-ack', 'otl-otu', 'ons', 'fail-safe', 'hardwired-safety'],
  realWorld: `On the real press the polymer float (36/37) gives no signal at all today, and it may be jumpered out. A fix like this needs the float wired to a PLC input (or a relay) and the jumper removed. A hardwired version is also possible: put the float and FR4's NC contact in series with the sludge pump too, plus a lamp. Get the maker's and an electrician's review before changing the real panel. ${pressReal}`,
  hints: ['`[XIO(Poly_OK),XIC(Dose_OL)]OTE(Poly_Problem)` detects the problem.', 'Latch `Feed_Block` on Poly_Problem; unlatch it only with `XIC(Alarm_Ack_PB)XIO(Poly_Problem)`.', 'Add `XIO(Feed_Block)` to the feed and dosing rungs, and `XIO(Mix_High_Rod)` to the Manual feed leg.'],
};

const talkToPanel: Mission = {
  id: '2.11',
  chapter: 2,
  order: 11,
  kind: 'build',
  engine: 'ladder',
  machine: 'press-remote',
  title: 'Talk to the Panel',
  site: 'Dewatering building, plant PLC',
  brief:
    "The relay panel stays. Instead, a **plant PLC** runs it through the field terminals on sheet 6:\n\n- **18/41 in:** an interposing relay contact from the PLC (Remote_Run) starts the press, with SA1 at Remote.\n- **P1-P2 out:** remote enabled. **P1-P3:** running. **P1-P4:** fault. Dry contacts; the PLC supplies 24 V on P1.\n\nThe press now starts with **nobody at the panel**, so:\n\n- Only start when **P2** says Remote is enabled.\n- Sound **Warn_Horn for 5 s** before closing 18/41.\n- If **P3** doesn't come on within **10 s**, raise **FTS_Alarm** (failed to start) and drop the start. **Plant_Reset** clears it.\n- **P4** (fault) drops the start.\n- **Plant_Stop** (wired NC) opens 18/41; the panel's own run-on clears the screws.",
  goal: ['Start from the plant only in Remote, after a 5 s warning.', 'Fail-to-start alarm after 10 s with no P3.', 'P4 or Plant_Stop drops the start.'],
  starter: '',
  editable: true,
  init: { signals: { SA2: 'auto', SA1: 'remote', SA11: 'on', SA12: 'on' }, levels: { TK_MIX: 0.3 } },
  tests: [
    {
      name: 'Remote start: 5 s warning, then 18/41 closes and the press runs.',
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 1.5, until: 5.8, expect: { HA2: true, PLC: false }, say: 'Before 18/41 closes, the warning horn should sound for 5 s, with the press still stopped.' },
        { t: 6.5, expect: { PLC: true, HA2: false }, say: 'After the 5 s warning, Remote_Run did not close 18/41 (or the horn kept going).' },
        { t: 8, expect: { KA5: true, KM11: true, P3: true }, say: 'The press did not start from the remote contact.' },
      ],
    },
    {
      name: 'Not in Remote: the plant cannot start it.',
      init: { signals: { SA1: 'local' } },
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 1.5, until: 9, expect: { PLC: false, HA2: false }, say: 'With SA1 at Local (P2 off), the plant PLC still tried to start the press.' },
      ],
    },
    {
      name: 'Plant stop: 18/41 opens and the press runs on.',
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 10, tap: 'PB2' },
        { t: 11, expect: { PLC: false, KA5: false }, say: 'Plant_Stop did not open 18/41.' },
        { t: 11, expect: { KM11: true, KM3: false }, say: "After a plant stop, the panel's run-on should keep the screws turning with the feed off." },
      ],
    },
    {
      name: 'Fail to start: no Running signal within 10 s.',
      steps: [
        { t: 0.5, fault: { type: 'coilOpen', device: 'KA5' } },
        { t: 1, tap: 'PB1' },
        { t: 7, expect: { PLC: true }, say: 'Remote_Run should close after the warning.' },
        { t: 17.5, expect: { H41: true, PLC: false }, say: 'Commanded 10 s with no P3: FTS_Alarm should be on and Remote_Run off.' },
        { t: 19, tap: 'PB3' },
        { t: 20, expect: { H41: false }, say: 'Plant_Reset did not clear the fail-to-start alarm.' },
      ],
    },
    {
      name: 'A panel fault (P4) drops the start.',
      steps: [
        { t: 1, tap: 'PB1' },
        { t: 10, fault: { type: 'trip', part: 'FR3' } },
        { t: 11, expect: { P4: true, PLC: false }, say: 'With P4 (fault) on, Remote_Run stayed closed.' },
      ],
    },
    forcedEStop('SB1', 'KM11'),
  ],
  reference: `// Run request from the plant HMI. Plant_Stop is wired NC.
XIC(P2_Remote_En)XIO(P4_Fault)XIO(FTS_Alarm)XIC(Plant_Stop)[XIC(Plant_Start),XIC(Run_Request)]OTE(Run_Request);
// Warn for 5 s before closing 18/41.
XIC(Run_Request)TON(Warn_Tmr,5000,0);
XIC(Run_Request)XIO(Warn_Tmr.DN)OTE(Warn_Horn);
XIC(Warn_Tmr.DN)OTE(Remote_Run);
// Failed to start: commanded for 10 s with no running signal.
XIC(Remote_Run)XIO(P3_Running)TON(FTS_Tmr,10000,0);
XIC(FTS_Tmr.DN)OTL(FTS_Alarm);
XIC(Plant_Reset)OTU(FTS_Alarm);`,
  help: ['dry-contacts', 'interposing-relays', 'auto-restarts', 'ton', 'alarms-and-ack'],
  realWorld:
    "Use an **interposing relay** between the PLC output and terminals 18/41, so the panel's 230 VAC never reaches the PLC card. P1 to P4 are rated 2 A at AC 220 V or DC 24 V; feed them from the PLC's 24 VDC and check sinking versus sourcing inputs. P4 can't tell you **which** fault, and nothing on sheet 6 reports polymer low: fixing the gap from outside the panel needs more signals. A pre-start horn is good practice for anything that starts remotely; follow the site's own rules for warning time.",
  hints: ['Seal `Run_Request` with Plant_Start, gated by `XIC(P2_Remote_En)XIO(P4_Fault)XIO(FTS_Alarm)XIC(Plant_Stop)`.', '`TON(Warn_Tmr,5000,0)`; horn while it times, `Remote_Run` when it is done.', '`XIC(Remote_Run)XIO(P3_Running)TON(FTS_Tmr,10000,0)` then latch FTS_Alarm.'],
};

export default [pressInLadder, closeGap, talkToPanel];
