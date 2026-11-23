// Chapter 2, missions 2.1 to 2.6: ladder basics.
import type { Mission, Scenario } from '../../../engine/mission/types';

/** The E-stop must still work with every PLC output forced on. Proves it's hardwired. */
export function forcedEStop(estop: string, contactor: string, start: Scenario['steps'] = []): Scenario {
  return {
    name: 'The E-stop works even with every PLC output forced on.',
    steps: [
      ...start,
      { t: 1, fault: { type: 'forceOutputs' } },
      { t: 1.5, expect: { [contactor]: true }, say: `With every output forced on, ${contactor} should pull in. (This is the test setup, not your program.)` },
      { t: 2, press: estop },
      { t: 2.2, until: 4, expect: { [contactor]: false }, say: `With outputs forced on, the E-stop did not drop ${contactor}.` },
    ],
  };
}

const START_STOP_REF = `// Stop_PB is wired NC, so it reads 1 while healthy: examine it with XIC.
// EStop_OK keeps the pump from restarting when the E-stop is released.
XIC(EStop_OK)XIC(Stop_PB)[XIC(Start_PB),XIC(Pump_Cmd)]OTE(Pump_Cmd);
XIC(Pump_Cmd)OTE(Run_Lamp);`;

const PLC_REAL_WORLD_IO =
  "Studio 5000 shows I/O as module tags like `Local:1:I.Data.0`; you usually make an **alias** with a readable name such as `Stop_PB`. Connected Components Workbench (Micro800) uses I/O variables like `_IO_EM_DI_00`. This game gives every input and output a plain name from the start.";

const newBrain: Mission = {
  id: '2.1',
  chapter: 2,
  order: 1,
  kind: 'build',
  engine: 'ladder',
  machine: 'truck7-plc',
  title: 'New Brain, Same Pump',
  site: 'Truck 7',
  brief:
    "Truck 7 got a small PLC. The buttons now land on PLC **inputs**, and a PLC **output** drives KM1 through the E-stop, which stays hardwired.\n\nRebuild the seal-in in ladder. One catch: **Stop_PB is wired NC**, so the input reads **1** while nobody is pressing it. In ladder you examine it with **XIC** (true when the bit is 1). That keeps the fail-safe: a broken wire reads 0 and stops the pump.\n\nAlso: when the E-stop drops KM1, the PLC still thinks the pump should run. Make sure releasing the E-stop doesn't restart it.",
  goal: ['Start_PB starts the pump and it stays running; Stop_PB stops it.', 'A broken Stop wire stops the pump.', 'After a power dip or an E-stop, the pump stays off until someone presses Start.', 'Run_Lamp lights while the pump is commanded on.'],
  starter: '',
  editable: true,
  palette: ['XIC', 'XIO', 'OTE'],
  tests: [
    {
      name: 'Tap Start: the pump starts and stays running.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, expect: { KM1: true, 'P1.running': true, H1: true }, say: 'After a tap on Start, the pump did not keep running (or the lamp stayed dark).' },
      ],
    },
    {
      name: 'Tap Stop: the pump stops.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, tap: 'SB1' },
        { t: 4, until: 6, expect: { KM1: false }, say: 'After a tap on Stop, the pump kept running.' },
      ],
    },
    {
      name: 'Stop wins when both are held.',
      steps: [
        { t: 1, press: 'SB1' },
        { t: 1, press: 'SB2' },
        { t: 1.5, until: 3, expect: { KM1: false }, say: 'With Stop and Start held together, the pump ran.' },
      ],
    },
    {
      name: 'The Stop wire breaks: the pump stops.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, fault: { type: 'open', device: 'SB1' } },
        { t: 3.5, until: 6, expect: { KM1: false }, say: 'When the Stop wire broke, the pump kept running. A NC stop reads 1 when healthy: examine it with XIC so a broken wire (0) stops the pump.' },
      ],
    },
    {
      name: 'Power dips: the pump stays off when power returns.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, power: false },
        { t: 4, power: true },
        { t: 4.5, until: 7, expect: { KM1: false }, say: 'After a power dip, the pump restarted by itself.' },
      ],
    },
    {
      name: 'E-stop pressed and released: the pump stays off.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, press: 'ES1' },
        { t: 3.5, expect: { KM1: false }, say: 'The E-stop did not drop the pump.' },
        { t: 5, release: 'ES1' },
        { t: 5.5, until: 8, expect: { KM1: false }, say: 'When the E-stop was released, the pump restarted by itself. Drop the seal-in when EStop_OK goes to 0.' },
      ],
    },
    forcedEStop('ES1', 'KM1'),
  ],
  reference: START_STOP_REF,
  help: ['xic', 'xio', 'ote', 'fail-safe', 'tags-and-types', 'hardwired-safety'],
  realWorld: `${PLC_REAL_WORLD_IO}\n\nIn CCW (Micro800), XIC is called a **direct contact**, XIO a **reverse contact**, and OTE a **direct coil**. The logic is identical.`,
  hints: ['Rung: `XIC(Stop_PB)`, then a branch of `XIC(Start_PB)` and `XIC(Pump_Cmd)`, then `OTE(Pump_Cmd)`.', 'Put `XIC(EStop_OK)` at the start of that rung.', 'Second rung: `XIC(Pump_Cmd)OTE(Run_Lamp)`.'],
  tip: 'Pause, then Step scan to watch one scan at a time.',
};

const oneScan: Mission = {
  id: '2.2',
  chapter: 2,
  order: 2,
  kind: 'build',
  engine: 'ladder',
  machine: 'bench-plc',
  title: 'One Scan at a Time',
  site: 'AmeriPro shop',
  brief:
    "A PLC works in **scans**: read every input into the input image, solve the rungs **top to bottom**, write the output image. Then again, every few milliseconds.\n\nThe last tech left a chain of three rungs in the wrong order: each rung uses a bit that's set by the rung **below** it, so the lamp lags behind the button by a few scans. That's usually invisible, but it matters for one-shots, sequences, and fast machines.\n\n**Pause**, press the button, and use **Step scan** to watch it ripple. Then fix the order.",
  goal: ['Lamp must turn on in the same scan the button is first seen, and off the same way.', 'Use Step scan to answer the question.'],
  starter: `// Each rung copies the one below it.
XIC(Step2)OTE(Lamp);
XIC(Step1)OTE(Step2);
XIC(Button)OTE(Step1);`,
  editable: true,
  palette: ['XIC', 'XIO', 'OTE'],
  quiz: {
    question: 'With the starter order, how many scans after the button is first read does the lamp turn on?',
    options: ['1 scan (the same scan)', '2 scans', '3 scans', 'It never turns on'],
    answer: 2,
    explain: 'Scan 1 sets Step1 (rung 2). Scan 2 sets Step2 (rung 1). Scan 3 sets Lamp (rung 0). Reverse the order and all three happen in one scan.',
  },
  tests: [
    {
      name: 'The lamp follows the button in the same scan.',
      steps: [
        { t: 1, press: 'SB1' },
        { t: 1.05, expect: { H1: true }, say: 'The lamp lagged behind the button by more than one scan. Put the rungs in the order the bits flow: Button → Step1 → Step2 → Lamp.' },
        { t: 2, release: 'SB1' },
        { t: 2.05, expect: { H1: false }, say: 'The lamp stayed on for extra scans after the button was let go.' },
      ],
      dt: 0.05,
    },
  ],
  reference: 'XIC(Button)OTE(Step1);\nXIC(Step1)OTE(Step2);\nXIC(Step2)OTE(Lamp);',
  help: ['scan-cycle', 'rung-order'],
  realWorld:
    "Real scan times are a few milliseconds, so a 3-scan lag is about 10 ms: harmless for a lamp, not for a one-shot that another rung already passed. **Micro800** reads inputs, solves, then writes outputs, like this game. **ControlLogix and CompactLogix** update I/O on their own schedule (the RPI), so an input can change in the middle of a scan; copy inputs to internal tags at the top of the routine if you need a steady snapshot.",
  hints: ['Select a rung number, then use **Move up** / **Move down**.', 'The rung that reads Button should be first, and the one that writes Lamp last.'],
};

const twoCoils: Mission = {
  id: '2.3',
  chapter: 2,
  order: 3,
  kind: 'callout',
  engine: 'ladder',
  machine: 'lift-plc',
  title: 'Callout: Two Coils, One Pump',
  site: 'Route 9 lift station',
  brief:
    "A contractor converted this lift station to a PLC. The operator says: **\"Auto works, but HAND does nothing.\"**\n\nLook at the program. Two rungs both end in `OTE(P1_Run)`. OTE writes the rung's result every scan, true **or false**. The last rung wins, every scan. Verify flags it, but it runs.",
  goal: ['Make HAND run pump 1, and keep Auto pumping down from the high float to the low float.', 'End with only one OTE for P1_Run.'],
  starter: `// Hand: run pump 1 while SA1 is at HAND
XIC(HOA_Hand)OTE(P1_Run);
// Auto: start at the high float, pump down to the low float
XIC(HOA_Auto)[XIC(LSH),XIC(P1_Run)]XIC(LSL)OTE(P1_Run);`,
  editable: true,
  init: { signals: { 'WELL.inflow': 0 } },
  tests: [
    {
      name: 'HAND runs pump 1; OFF stops it.',
      init: { signals: { SA1: 'hand', 'WELL.inflow': 0 }, levels: { WELL: 0.4 } },
      steps: [
        { t: 1, expect: { KM1: true }, say: 'With SA1 at HAND, pump 1 did not run.' },
        { t: 2, set: { SA1: 'off' } },
        { t: 2.5, expect: { KM1: false }, say: 'With SA1 at OFF, pump 1 kept running.' },
      ],
    },
    {
      name: 'AUTO pumps down from the high float to the low float.',
      init: { signals: { SA1: 'auto', 'WELL.inflow': 0 }, levels: { WELL: 0.65 } },
      steps: [
        { t: 1, expect: { KM1: true }, say: 'With the level above the high float, Auto did not start pump 1.' },
        { t: 2, level: { WELL: 0.4 } },
        { t: 2.5, expect: { KM1: true }, say: 'Between the floats, pump 1 stopped. It should keep pumping down.' },
        { t: 3, level: { WELL: 0.15 } },
        { t: 3.5, expect: { KM1: false }, say: 'Below the low float, pump 1 kept running. That runs it dry.' },
        { t: 4, level: { WELL: 0.4 } },
        { t: 4.5, expect: { KM1: false }, say: 'Pump 1 restarted between the floats.' },
      ],
    },
  ],
  reference: '[XIC(HOA_Hand),XIC(HOA_Auto)[XIC(LSH),XIC(P1_Run)]XIC(LSL)]OTE(P1_Run);',
  help: ['duplicate-outputs', 'ote', 'xic'],
  realWorld:
    "Studio 5000's Verify reports duplicate destructive bits as a **warning**, not an error, so this program downloads and runs. CCW is similar. In HAND, this pump ignores the floats: the operator is the level control, the same as our press in Manual. Real lift stations usually keep a hardwired high-level float that can start a pump even if the PLC fails.",
  hints: ['Combine both conditions into **one** rung with a branch in front of a single `OTE(P1_Run)`.', 'Delete the old Hand rung once its condition is in the branch.'],
};

const lightsOut: Mission = {
  id: '2.4',
  chapter: 2,
  order: 4,
  kind: 'build',
  engine: 'ladder',
  machine: 'truck7-plc',
  title: 'Lights Out',
  site: 'Truck 7',
  brief:
    "This version of Truck 7's program uses **OTL** (latch) and **OTU** (unlatch) instead of a seal-in. It works, until the power blinks.\n\nOTE outputs are cleared when the PLC powers up (that's part of the **prescan**). Latched bits are not: the PLC remembers them. So after a power dip, this pump **starts by itself**.\n\nFix it so the pump stays off after power returns and after an E-stop. You can switch to a seal-in, or unlatch on the first scan with `S:FS`.",
  goal: ['Start and Stop still work.', 'After a power dip, the pump stays off.', 'After an E-stop is released, the pump stays off.'],
  starter: `XIC(Start_PB)OTL(Pump_Cmd);
XIO(Stop_PB)OTU(Pump_Cmd);
XIC(Pump_Cmd)OTE(Run_Lamp);`,
  editable: true,
  tests: [
    {
      name: 'Start and Stop work.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, expect: { KM1: true }, say: 'Start did not start the pump.' },
        { t: 4, tap: 'SB1' },
        { t: 5, expect: { KM1: false }, say: 'Stop did not stop the pump.' },
      ],
    },
    {
      name: 'Power dips: the pump stays off when power returns.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, power: false },
        { t: 4, power: true },
        { t: 4.5, until: 7, expect: { KM1: false }, say: 'After the power dip the latched bit was still 1, so the pump restarted with nobody touching it.' },
      ],
    },
    {
      name: 'E-stop released: the pump stays off.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, press: 'ES1' },
        { t: 5, release: 'ES1' },
        { t: 5.5, until: 8, expect: { KM1: false }, say: 'When the E-stop was released, the pump restarted.' },
      ],
    },
    {
      name: 'The Stop wire breaks: the pump stops.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, fault: { type: 'open', device: 'SB1' } },
        { t: 3.5, until: 5, expect: { KM1: false }, say: 'When the Stop wire broke, the pump kept running.' },
      ],
    },
  ],
  reference: `XIC(Start_PB)XIC(Stop_PB)XIC(EStop_OK)OTL(Pump_Cmd);
// Unlatch on Stop, on the E-stop, and on the first scan after power-up.
[XIO(Stop_PB),XIO(EStop_OK),XIC(S:FS)]OTU(Pump_Cmd);
XIC(Pump_Cmd)OTE(Run_Lamp);`,
  help: ['otl-otu', 'prescan-first-scan', 'seal-in', 'auto-restarts'],
  realWorld:
    "In **Logix** controllers, every tag keeps its value through a power cycle; the prescan then clears OTE outputs and resets TON timers. In **Micro800** (CCW), variables are **not retained** unless you tick Retain, and the first-scan bit is `_SYSVA_FIRST_SCAN`. Either way, write the program so a machine can't restart itself after a power loss.",
  hints: ['On the OTU rung, tap `XIO(Stop_PB)` and choose **Branch around it**, then tap the **+** on the new empty leg and add `XIC(S:FS)`.', 'For a third leg, tap either contact on that branch and choose **Add leg to its branch**, then add `XIO(EStop_OK)` on it. Also add `XIC(EStop_OK)` to the OTL rung.'],
};

const onePush: Mission = {
  id: '2.5',
  chapter: 2,
  order: 5,
  kind: 'build',
  engine: 'ladder',
  machine: 'truck7-plc',
  title: 'One Push',
  site: 'Truck 7',
  brief:
    "Drivers want one black button, **SB5**, that starts the pump if it's off and stops it if it's on. And the office wants a count of **loads pumped today** on the panel display, with **SB6** to reset it.\n\nA button stays pressed for many scans, so a plain XIC would flip the pump on and off over and over. **ONS** (one-shot) passes a true for exactly **one scan** each time its rung goes true. **CTU** counts each false-to-true transition of its rung.",
  goal: ['Each press of SB5 toggles the pump, no matter how long it is held.', 'Count every start with CTU and show it on Loads_Display.', 'SB6 resets the count. SB1 Stop still stops the pump.'],
  starter: '',
  editable: true,
  tests: [
    {
      name: 'One press starts, the next press stops, however long it is held.',
      steps: [
        { t: 1, press: 'SB5' },
        { t: 1.2, until: 4, expect: { KM1: true }, say: 'Holding SB5 did not leave the pump steadily on. Use ONS so a held button counts once.' },
        { t: 4, release: 'SB5' },
        { t: 5, press: 'SB5' },
        { t: 5.2, until: 7, expect: { KM1: false }, say: 'The second press did not stop the pump (or it flickered back on).' },
        { t: 7, release: 'SB5' },
      ],
    },
    {
      name: 'Each start counts once on the display; SB6 resets it.',
      steps: [
        { t: 1, tap: 'SB5' },
        { t: 2, tap: 'SB5' },
        { t: 3, tap: 'SB5' },
        { t: 4, tap: 'SB5' },
        { t: 5, press: 'SB5' },
        { t: 7, release: 'SB5' },
        { t: 8, expect: { LoadsOut: 3 }, say: 'Three starts should show 3 on the display.' },
        { t: 9, tap: 'SB6' },
        { t: 10, expect: { LoadsOut: 0 }, say: 'SB6 did not reset the count.' },
      ],
    },
    {
      name: 'Stop still stops the pump.',
      steps: [
        { t: 1, tap: 'SB5' },
        { t: 2, tap: 'SB1' },
        { t: 2.6, expect: { KM1: false }, say: 'SB1 did not stop the pump.' },
      ],
    },
  ],
  reference: `// One scan pulse per press
XIC(Toggle_PB)ONS(Tog_OS)OTE(Tog_Pulse);
// Flip-flop: a pulse turns it on if off, off if on
XIC(EStop_OK)XIC(Stop_PB)[XIC(Tog_Pulse)XIO(Pump_Cmd),XIO(Tog_Pulse)XIC(Pump_Cmd)]OTE(Pump_Cmd);
// Count each start
XIC(Tog_Pulse)XIC(Pump_Cmd)CTU(Loads,9999,0);
XIC(Reset_PB)RES(Loads);
MOV(Loads.ACC,Loads_Display);
XIC(Pump_Cmd)OTE(Run_Lamp);`,
  help: ['ons', 'ctu-ctd', 'res', 'mov'],
  realWorld:
    "In Studio 5000 there are also **OSR** and **OSF** (one-shot rising/falling) that write a separate output bit. CCW uses an **R_TRIG** function block or a rising-edge contact, and its counter is the IEC **CTU** block with inputs CU, RESET, PV and outputs Q, CV. One-button start/stop is common on trucks, but a dedicated Stop button should always stay.",
  hints: ['`XIC(Toggle_PB)ONS(Tog_OS)OTE(Tog_Pulse)` makes a one-scan pulse.', 'Pump rung: a branch of `XIC(Tog_Pulse)XIO(Pump_Cmd)` and `XIO(Tog_Pulse)XIC(Pump_Cmd)`.', '`MOV(Loads.ACC,Loads_Display)` shows the count.'],
};

const timingWash: Mission = {
  id: '2.6',
  chapter: 2,
  order: 6,
  kind: 'build',
  engine: 'ladder',
  machine: 'wash-plc',
  title: 'Timing the Wash',
  site: 'Hood-wash rig on Truck 3',
  brief:
    "The wash rig, PLC version. Four timers, four jobs:\n\n- **TON** (on-delay): wait 5 s after the pump starts before spraying (prime).\n- **Two TONs** that reset each other: spray 30 s, then wait 10 min, repeating, like KT1.\n- **TOF** (off-delay): run the cooling fan 60 s after the pump stops.\n- **RTO** (retentive): add up pump run time across stops; light **Service_Lamp** at 1 hour; SB4 resets it with **RES**.\n\nTimer presets are in **milliseconds**: 5 s is `5000`.",
  goal: ['Pump start/stop with seal-in (Stop is wired NC).', 'No spray for 5 s after start; then 10 min off / 30 s on.', 'Spray_PB sprays any time after priming.', 'Fan runs with the pump and 60 s after it stops.', 'Service_Lamp after 1 hour of total pump run time; SB4 resets it.'],
  starter: '',
  editable: true,
  tests: [
    {
      name: 'No spray while priming; manual spray after.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 2, press: 'SB3' },
        { t: 2.1, until: 5.5, expect: { Y1: false }, say: 'Y1 opened during the 5 s prime.' },
        { t: 7, expect: { Y1: true }, say: 'After priming, Spray_PB did not open Y1.' },
        { t: 8, release: 'SB3' },
        { t: 8.5, expect: { Y1: false }, say: 'Y1 stayed open after SB3 was let go.' },
      ],
    },
    {
      name: 'The cycle: 10 minutes off, 30 s spray, repeating.',
      dt: 0.1,
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 10, until: 603, expect: { Y1: false }, say: 'Y1 opened before 10 minutes of OFF time.' },
        { t: 609, until: 634, expect: { Y1: true }, say: 'Y1 was not open for 30 s after the 10-minute wait.' },
        { t: 638, until: 1230, expect: { Y1: false }, say: 'Y1 stayed open longer than 30 s, or opened again too soon.' },
        { t: 1245, until: 1262, expect: { Y1: true }, say: 'The second spray did not come 10 minutes after the first.' },
      ],
    },
    {
      name: 'The fan runs with the pump and 60 s after.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, until: 20, expect: { KM3: true }, say: 'The fan did not run with the pump.' },
        { t: 20, tap: 'SB1' },
        { t: 21, until: 79, expect: { KM3: true, KM2: false }, say: 'The fan stopped before 60 s after the pump.' },
        { t: 82, expect: { KM3: false }, say: 'The fan ran more than 60 s after the pump stopped.' },
      ],
    },
    {
      name: 'Service lamp after 1 hour of total run time, across stops; SB4 resets.',
      dt: 0.1,
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 1800, tap: 'SB1' },
        { t: 1900, expect: { H4: false }, say: 'The service lamp lit after only 30 minutes.' },
        { t: 2000, tap: 'SB2' },
        { t: 3780, expect: { H4: false }, say: 'The service lamp lit early.' },
        { t: 3815, expect: { H4: true }, say: 'After 1 hour of total pump time (30 min + 30 min), the service lamp did not light. An RTO keeps its time when the pump stops.' },
        { t: 3820, tap: 'SB4' },
        { t: 3822, expect: { H4: false }, say: 'SB4 did not reset the service lamp.' },
      ],
    },
    forcedEStop('ES1', 'KM2'),
  ],
  reference: `XIC(EStop_OK)XIC(Stop_PB)[XIC(Start_PB),XIC(Pump_Cmd)]OTE(Pump_Cmd);
// Prime
XIC(Pump_Cmd)TON(Prime_Tmr,5000,0);
// Spray cycle: Off_Tmr times 10 min, then On_Tmr times 30 s and resets both
XIC(Prime_Tmr.DN)XIO(On_Tmr.DN)TON(Off_Tmr,600000,0);
XIC(Off_Tmr.DN)TON(On_Tmr,30000,0);
XIC(Prime_Tmr.DN)[XIC(Off_Tmr.DN)XIO(On_Tmr.DN),XIC(Spray_PB)]OTE(Spray_Valve);
// Cooling fan run-on
XIC(Pump_Cmd)TOF(Fan_Tmr,60000,0);
XIC(Fan_Tmr.DN)OTE(Fan_Cmd);
// Service hours
XIC(Pump_Cmd)RTO(Pump_Hours,3600000,0);
XIC(Service_Reset_PB)RES(Pump_Hours);
XIC(Pump_Hours.DN)OTE(Service_Lamp);`,
  help: ['ton', 'tof', 'rto', 'res'],
  realWorld:
    "Logix timers count in **milliseconds** with a 32-bit ACC (up to about 24 days). In CCW, TON and TOF are IEC function blocks with **IN, PT, Q, ET** and TIME values like `T#5s`; there's no .DN bit, you use Q. The retentive timer is **TONOFF**/**RTO** depending on the library. An RTO's ACC survives power loss in Logix; in Micro800 only if the variable is set to Retain.",
  hints: ['Off_Tmr rung: `XIC(Prime_Tmr.DN)XIO(On_Tmr.DN)TON(Off_Tmr,600000,0)`.', 'On_Tmr rung: `XIC(Off_Tmr.DN)TON(On_Tmr,30000,0)`.', 'Fan: `XIC(Pump_Cmd)TOF(Fan_Tmr,60000,0)` then `XIC(Fan_Tmr.DN)OTE(Fan_Cmd)`.'],
};

export default [newBrain, oneScan, twoCoils, lightsOut, onePush, timingWash];
