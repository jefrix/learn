// Chapter 1, missions 1.1 to 1.9: relay basics on small AmeriPro machines.
import type { Mission, Scenario } from '../../../engine/mission/types';

const STOP_START = 'NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);\nNO(KM1)LAMP(H1);';

const lightsOn: Mission = {
  id: '1.1',
  chapter: 1,
  order: 1,
  kind: 'build',
  engine: 'relay',
  machine: 'bench',
  title: 'Lights On',
  site: 'AmeriPro shop, training board',
  brief:
    "Welcome to controls. Before anyone hands you a truck, you get the training board: two buttons, two lamps, and 120 VAC control power.\n\nA circuit only works when there's a **complete path** from L1, through the parts, to N. A **normally open** (NO) contact closes when you push the button. A **normally closed** (NC) contact is closed at rest and opens when you push it.",
  goal: ['Wire the amber lamp H1 so it lights only while you hold the black button SB1.', 'Wire the green lamp H2 through the red button SB2 so it is lit at rest and goes out while you hold SB2.'],
  starter: '',
  editable: true,
  palette: ['NO', 'NC', 'LAMP'],
  tests: [
    {
      name: 'The amber lamp follows the black button.',
      steps: [
        { t: 0.5, expect: { H1: false }, say: 'H1 was lit before anyone pressed SB1.' },
        { t: 1, press: 'SB1' },
        { t: 1.5, expect: { H1: true }, say: 'Holding SB1 did not light H1.' },
        { t: 2, release: 'SB1' },
        { t: 2.5, expect: { H1: false }, say: 'H1 stayed lit after SB1 was let go.' },
      ],
    },
    {
      name: 'The green lamp is on at rest and goes out while red is held.',
      steps: [
        { t: 0.5, expect: { H2: true }, say: 'H2 was dark with nothing pressed. A NC contact is closed at rest.' },
        { t: 1, press: 'SB2' },
        { t: 1.5, expect: { H2: false }, say: 'Holding SB2 did not put H2 out.' },
        { t: 2, release: 'SB2' },
        { t: 2.5, expect: { H2: true }, say: 'H2 did not come back on when SB2 was let go.' },
      ],
    },
  ],
  reference: 'NO(SB1)LAMP(H1);\nNC(SB2)LAMP(H2);',
  help: ['no-nc-contacts', 'pushbutton', 'pilot-lamp', 'reading-a-schematic'],
  realWorld:
    "Real panels draw contacts in their **shelf state**: how they sit with no one touching them and no power on. That's why a NC contact is drawn closed. Control power on our trucks is usually 120 VAC from a control transformer; the press uses 230 VAC. PLC inputs and outputs are often 24 VDC.",
  hints: ['Tap the yellow **+** on the empty rung, pick **NO**, and set its tag to `SB1`. Then add a **LAMP** after it with tag `H1`.', 'For the second lamp, add a new rung: `NC(SB2)` then `LAMP(H2)`.'],
  tip: 'Tap a rung number to work on that rung.',
};

const bothOrEither: Mission = {
  id: '1.2',
  chapter: 1,
  order: 2,
  kind: 'build',
  engine: 'relay',
  machine: 'bench',
  title: 'Both or Either',
  site: 'AmeriPro shop, training board',
  brief: 'Contacts **in series** (one after another) all have to close: that is AND. Contacts **in parallel** (side by side, on a branch) give the current two ways through: that is OR.',
  goal: ['H1 lights only while SB1 **and** SB2 are both held.', 'H2 lights while SB1 **or** SB2 (or both) is held.'],
  starter: '',
  editable: true,
  palette: ['NO', 'NC', 'LAMP'],
  tests: [
    {
      name: 'Nothing pressed: both lamps dark.',
      steps: [{ t: 0.5, expect: { H1: false, H2: false }, say: 'A lamp was lit with no button pressed.' }],
    },
    {
      name: 'One button: H2 lights, H1 does not.',
      steps: [
        { t: 1, press: 'SB1' },
        { t: 1.5, expect: { H1: false, H2: true }, say: 'With only SB1 held, H1 should stay dark and H2 should light.' },
        { t: 2, release: 'SB1' },
        { t: 2.5, press: 'SB2' },
        { t: 3, expect: { H1: false, H2: true }, say: 'With only SB2 held, H1 should stay dark and H2 should light.' },
      ],
    },
    {
      name: 'Both buttons: both lamps light.',
      steps: [
        { t: 1, press: 'SB1' },
        { t: 1, press: 'SB2' },
        { t: 1.5, expect: { H1: true, H2: true }, say: 'With both buttons held, both lamps should light.' },
      ],
    },
  ],
  reference: 'NO(SB1)NO(SB2)LAMP(H1);\n[NO(SB1),NO(SB2)]LAMP(H2);',
  help: ['series-parallel', 'no-nc-contacts'],
  realWorld: 'Two-hand control stations on presses use the series idea, but real ones also need both buttons pressed within half a second and use a safety relay, so one button cannot be taped down. This board is not a two-hand safety control.',
  hints: ['For OR, put a **branch** around the first contact: select it and choose **Branch around it**, then add the second contact on the new leg.'],
};

const sealIn: Mission = {
  id: '1.3',
  chapter: 1,
  order: 3,
  kind: 'build',
  engine: 'relay',
  machine: 'truck7',
  title: 'Seal It In',
  site: 'Truck 7 at the disposal site',
  brief:
    "Truck 7's transfer pump empties the tank into the receiving tank. The driver wants a **Start** button they can tap and walk away from, and a **Stop** that always works.\n\nA momentary Start button only closes while it's held. To keep the contactor in after you let go, put a contact of the contactor itself in parallel with Start: a **seal-in** (holding) contact.",
  goal: ['Tap SB2 Start: KM1 pulls in and stays in.', 'Tap SB1 Stop: KM1 drops out.', 'Light H1 while the pump runs.', 'If the stop wire breaks, the pump must stop. If power dips, it must not restart by itself.'],
  starter: '',
  editable: true,
  palette: ['NO', 'NC', 'COIL', 'LAMP'],
  tests: [
    {
      name: 'Tap Start: the pump starts and stays running.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, expect: { KM1: true, 'P1.running': true }, say: 'After a tap on Start, the pump did not keep running. It needs a seal-in contact.' },
        { t: 3, expect: { H1: true }, say: 'The pump ran but H1 did not light.' },
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
        { t: 1.5, until: 3, expect: { KM1: false }, say: 'With Stop and Start held together, the pump ran. Stop has to win.' },
      ],
    },
    {
      name: 'The stop wire breaks: the pump stops.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, fault: { type: 'open', device: 'SB1' } },
        { t: 3.5, until: 6, expect: { KM1: false }, say: 'When the wire to the Stop button broke, the pump kept running, and now nothing can stop it. Wire Stop normally closed so a broken wire stops the machine.' },
      ],
    },
    {
      name: 'Power dips: the pump stays off when power returns.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, power: false },
        { t: 4, power: true },
        { t: 4.5, until: 7, expect: { KM1: false }, say: 'When power came back after a dip, the pump restarted by itself with nobody touching it.' },
      ],
    },
  ],
  reference: STOP_START,
  help: ['seal-in', 'contactor', 'fail-safe', 'two-wire-three-wire'],
  realWorld:
    "This is three-wire control, the standard motor starter circuit. A real starter's seal-in contact is the contactor's auxiliary contact (often terminals 13-14). The stop button's NC contact is a fail-safe choice, but a regular Stop is **not** an emergency stop: an E-stop is a red mushroom on yellow that latches and is wired into a safety circuit.",
  hints: ['Rung: `NC(SB1)` then `NO(SB2)` then `COIL(KM1)`.', 'Select `NO(SB2)`, choose **Branch around it**, and put `NO(KM1)` on the new leg.', 'Add a second rung: `NO(KM1)` then `LAMP(H1)`.'],
};

const secondStation: Mission = {
  id: '1.4',
  chapter: 1,
  order: 4,
  kind: 'build',
  engine: 'relay',
  machine: 'truck7',
  title: 'Second Station',
  site: 'Truck 7 tailgate',
  brief: "Drivers stand at the tailgate where they can see the hose. Add a tailgate station: **SB3 Stop** and **SB4 Start**.\n\nRule of thumb: **stops in series, starts in parallel.** Any stop opens the path; any start closes it.",
  goal: ['Either Start starts the pump.', 'Either Stop stops it.', 'A broken wire to either Stop stops the pump.'],
  starter: STOP_START,
  editable: true,
  palette: ['NO', 'NC', 'COIL', 'LAMP'],
  tests: [
    {
      name: 'Panel start and stop still work.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, expect: { KM1: true }, say: 'The panel Start no longer starts the pump.' },
        { t: 4, tap: 'SB1' },
        { t: 5, expect: { KM1: false }, say: 'The panel Stop no longer stops the pump.' },
      ],
    },
    {
      name: 'Tailgate start and stop work.',
      steps: [
        { t: 1, tap: 'SB4' },
        { t: 3, expect: { KM1: true }, say: 'The tailgate Start SB4 did not start the pump.' },
        { t: 4, tap: 'SB3' },
        { t: 5, expect: { KM1: false }, say: 'The tailgate Stop SB3 did not stop the pump.' },
      ],
    },
    {
      name: 'Mix them: start at the panel, stop at the tailgate.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, tap: 'SB3' },
        { t: 4, expect: { KM1: false }, say: 'Started at the panel, the tailgate Stop could not stop it.' },
      ],
    },
    {
      name: 'Tailgate stop wire breaks: the pump stops.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, fault: { type: 'open', device: 'SB3' } },
        { t: 3.5, until: 5, expect: { KM1: false }, say: 'When the tailgate Stop wire broke, the pump kept running.' },
      ],
    },
  ],
  reference: 'NC(SB1)NC(SB3)[NO(SB2),NO(SB4),NO(KM1)]COIL(KM1);\nNO(KM1)LAMP(H1);',
  help: ['series-parallel', 'seal-in', 'fail-safe'],
  realWorld: 'Remote stations on trucks use oil-resistant, weatherproof operators (NEMA 4X or IP66). Long runs to a remote station pick up voltage drop and noise, which is one reason many trucks use 24 VDC controls with an interposing relay.',
  hints: ['Work on the top rung (rung **0**, the one with the KM1 coil); don\'t add a new rung. Tap the **0** at its left end so the yellow **+** circles appear, then tap the **+** just after `NC(SB1)` and add `NC(SB3)`. Stops go in series.', 'Starts go in parallel. Tap `NO(SB2)` or `NO(KM1)` (they share a branch) and choose **Add leg to its branch**, or tap the small square at the left edge of that branch and choose **Add leg**. Then tap the **+** on the new empty leg and add `NO(SB4)`.'],
};

const deadTailgate: Mission = {
  id: '1.4b',
  chapter: 1,
  order: 5,
  kind: 'callout',
  engine: 'relay',
  machine: 'truck7',
  title: 'Callout: Dead Tailgate Start',
  site: 'Truck 7, Tuesday 6:40 AM',
  brief: "The driver says the tailgate Start does nothing. The panel buttons work fine. The drawing is right; something in the field isn't.\n\nTurn on the **Meter** and tap wires in the drawing while someone holds SB4. Voltage on one side of a closed contact and none on the other means that path is broken.",
  goal: ['Find why SB4 does not start the pump.', 'Select the faulty device in the drawing and use **Inspect and repair**.'],
  starter: 'NC(SB1)NC(SB3)[NO(SB2),NO(SB4),NO(KM1)]COIL(KM1);\nNO(KM1)LAMP(H1);',
  editable: false,
  hiddenFaults: [{ fault: { type: 'open', device: 'SB4' }, target: 'SB4', found: "SB4's wire had chafed through where the cable runs past the tailgate hinge. You splice it, add a grommet, and the tailgate Start works again." }],
  tests: [
    {
      name: 'Tailgate start works again.',
      steps: [
        { t: 1, tap: 'SB4' },
        { t: 3, expect: { KM1: true }, say: 'SB4 still does not start the pump.' },
      ],
    },
  ],
  reference: 'NC(SB1)NC(SB3)[NO(SB2),NO(SB4),NO(KM1)]COIL(KM1);\nNO(KM1)LAMP(H1);',
  help: ['troubleshooting-with-a-meter', 'live-work'],
  realWorld: "Measuring voltage in a live panel is real technician work, and it's done by **qualified people** with the right meter (CAT III rated) and PPE under NFPA 70E. When you can, troubleshoot with the panel locked out and use continuity instead.",
  hints: ['Hold SB4 on the machine, then tap the wire on each side of `NO(SB4)` with the meter on.', 'Voltage on the left of SB4 and none on its right while it is pressed: the problem is at SB4.'],
};

const fwdRev: Mission = {
  id: '1.5',
  chapter: 1,
  order: 6,
  kind: 'build',
  engine: 'relay',
  machine: 'jog',
  title: 'Forward and Back',
  site: 'Press room test stand',
  brief:
    "To clear a jam, a screw sometimes has to back up. Reversing a three-phase motor means swapping two phases, so it takes two contactors: **KM1 forward** and **KM2 reverse**.\n\nIf both ever close at once, two phases are shorted together. Prevent that with an **interlock**: each coil's rung runs through the other contactor's NC contact.",
  goal: ['SB2 runs forward (KM1), SB3 runs reverse (KM2), SB1 stops either.', 'KM1 and KM2 must never be in together, even with both buttons pressed.', 'Light H1 for forward and H2 for reverse.'],
  starter: '',
  editable: true,
  palette: ['NO', 'NC', 'COIL', 'LAMP'],
  tests: [
    {
      name: 'Forward runs and stops.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, expect: { KM1: true, 'M1.dir': 1, H1: true }, say: 'Forward did not run and stay running (or H1 did not light).' },
        { t: 4, tap: 'SB1' },
        { t: 5, expect: { KM1: false }, say: 'Stop did not stop forward.' },
      ],
    },
    {
      name: 'Reverse runs and stops.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 3, expect: { KM2: true, 'M1.dir': -1, H2: true }, say: 'Reverse did not run and stay running (or H2 did not light).' },
        { t: 4, tap: 'SB1' },
        { t: 5, expect: { KM2: false }, say: 'Stop did not stop reverse.' },
      ],
    },
    {
      name: 'Both pressed: never both contactors.',
      steps: [
        { t: 1, press: 'SB2' },
        { t: 1, press: 'SB3' },
        { t: 1.05, until: 3, expect: { 'M1.short': false }, say: 'With both buttons pressed, KM1 and KM2 closed together: a phase-to-phase short.' },
      ],
    },
    {
      name: 'Reverse is ignored while forward runs.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 2, press: 'SB3' },
        { t: 2.05, until: 4, expect: { KM2: false, KM1: true }, say: 'Pressing Reverse while running forward pulled in KM2 or dropped KM1. Stop first, then reverse.' },
      ],
    },
    {
      name: 'Stop wire breaks: the motor stops.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 2, fault: { type: 'open', device: 'SB1' } },
        { t: 2.5, until: 4, expect: { KM1: false }, say: 'When the Stop wire broke, the motor kept running.' },
      ],
    },
  ],
  reference: 'NC(SB1)[NO(SB2),NO(KM1)]NC(KM2)COIL(KM1);\nNC(SB1)[NO(SB3),NO(KM2)]NC(KM1)COIL(KM2);\nNO(KM1)LAMP(H1);\nNO(KM2)LAMP(H2);',
  help: ['interlock', 'seal-in', 'contactor'],
  realWorld:
    "Real reversing starters add a **mechanical interlock**, a lever between the two contactors so one physically can't close while the other is in. The electrical interlock here is still required. Our press doesn't use pushbuttons for this: it uses selector **SA7** (forward/reverse), and normal running is forward only.",
  hints: ['Build forward as a seal-in rung, then copy the idea for reverse.', 'Add `NC(KM2)` into the KM1 rung, and `NC(KM1)` into the KM2 rung.'],
};

const welded: Mission = {
  id: '1.5b',
  chapter: 1,
  order: 7,
  kind: 'callout',
  engine: 'relay',
  machine: 'jog',
  title: "Callout: It Won't Stop",
  site: 'Press room test stand',
  brief: "The screw is turning forward and **Stop does nothing**. Look at the drawing: KM1's coil goes dark when you press Stop, but the motor keeps turning.\n\nA coil can drop out while its contacts stay shut if they've **welded** together, which happens after heavy current or a lot of jogging.",
  goal: ['Press Stop and compare the KM1 coil with the motor.', 'Answer the question below.', 'Replace the bad part with **Inspect and repair**.'],
  starter: 'NC(SB1)[NO(SB2),NO(KM1)]NC(KM2)COIL(KM1);\nNC(SB1)[NO(SB3),NO(KM2)]NC(KM1)COIL(KM2);\nNO(KM1)LAMP(H1);\nNO(KM2)LAMP(H2);',
  editable: false,
  hiddenFaults: [{ fault: { type: 'welded', device: 'KM1' }, target: 'KM1', found: "KM1's main contacts were welded shut. With the panel locked out, you swap the contactor and check the new one's contacts open and close freely." }],
  quiz: {
    question: 'The coil is dead and the motor still runs. What actually stops it right now?',
    options: ['Pressing Stop harder', 'Pressing Reverse', 'Opening the disconnect or breaker feeding the motor, then locking it out', 'Waiting for the overload to trip'],
    answer: 2,
    explain: "Only removing power from the motor circuit stops it. That's why lockout/tagout is done at the **disconnect**, never at a pushbutton or a contactor: a contactor can fail closed.",
  },
  tests: [
    {
      name: 'Stop stops the motor again.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 3, tap: 'SB1' },
        { t: 4, expect: { 'M1.running': false }, say: 'The motor still runs after Stop.' },
      ],
    },
  ],
  reference: 'NC(SB1)[NO(SB2),NO(KM1)]NC(KM2)COIL(KM1);\nNC(SB1)[NO(SB3),NO(KM2)]NC(KM1)COIL(KM2);\nNO(KM1)LAMP(H1);\nNO(KM2)LAMP(H2);',
  help: ['contactor', 'lockout-tagout', 'e-stop'],
  realWorld: "Welded contacts are why safety circuits use **force-guided (mirror) contacts** and safety relays that check the contactor actually opened before allowing a restart. A plain contactor gives no such check. Before replacing it: lock out, tag out, and **test for absence of voltage**.",
  hints: ['Watch the KM1 coil symbol in the drawing when you press Stop. Then watch the motor.', 'Select KM1 in the drawing and choose **Inspect and repair KM1**.'],
};

const trip: Mission = {
  id: '1.6',
  chapter: 1,
  order: 8,
  kind: 'build',
  engine: 'relay',
  machine: 'lift',
  title: 'Trip',
  site: 'Customer lift station, Route 9 strip mall',
  brief:
    "This lift station pump runs on a simple OFF/ON selector: two-wire control. The overload FR1 is mounted under the contactor, but **nobody wired its contacts**. A tripped overload only opens its own small contacts: 95-96 (NC) has to be in the coil circuit to drop the contactor, and 97-98 (NO) can light a fault lamp.\n\nWire it, then drop a rag in the pump and practice the reset: **selector to OFF first**, clear the cause, reset, then back to ON.",
  goal: ['Wire FR1 so a trip drops KM1.', 'Light H2 when FR1 trips.', 'Practice the safe reset in the live machine.'],
  starter: 'POS(SA1,on)COIL(KM1);\nNO(KM1)LAMP(H1);',
  editable: true,
  palette: ['NO', 'NC', 'POS', 'COIL', 'LAMP'],
  init: { signals: { SA1: 'on' } },
  breakables: [{ label: 'Drop a rag in the pump', fault: { type: 'jam', part: 'P1' } }],
  observe: [
    { id: 'o1', text: 'Jam the pump: FR1 trips, KM1 drops out, H2 lights.', when: { FR1: true, KM1: false, H2: true } },
    { id: 'o2', text: 'Turn SA1 to OFF, clear the jam (tap the pump), then press FR1 RESET.', when: { SA1: 'off', FR1: false, 'P1.jammed': false }, after: 'o1' },
    { id: 'o3', text: 'Back to ON: the pump runs again.', when: { SA1: 'on', KM1: true, 'P1.running': true }, after: 'o2' },
  ],
  walkthrough: {
    name: 'trip drill',
    steps: [
      { t: 1, fault: { type: 'jam', part: 'P1' } },
      { t: 8, set: { SA1: 'off' } },
      { t: 9, action: { part: 'P1', do: 'clearJam' } },
      { t: 10, action: { part: 'FR1', do: 'reset' } },
      { t: 11, set: { SA1: 'on' } },
      { t: 13 },
    ],
  },
  tests: [
    {
      name: 'ON runs the pump, OFF stops it.',
      steps: [
        { t: 1, expect: { KM1: true, H1: true }, say: 'With SA1 at ON and no trip, the pump did not run.' },
        { t: 2, set: { SA1: 'off' } },
        { t: 2.5, expect: { KM1: false }, say: 'SA1 at OFF did not stop the pump.' },
      ],
    },
    {
      name: 'A jam trips FR1, which drops KM1 and lights H2.',
      steps: [
        { t: 1, fault: { type: 'jam', part: 'P1' } },
        { t: 6, expect: { FR1: true }, say: 'The overload never tripped.' },
        { t: 6, expect: { KM1: false }, say: "FR1 tripped but KM1 stayed in, so the motor kept cooking. FR1's NC contact belongs in KM1's coil rung." },
        { t: 6, expect: { H2: true, H1: false }, say: 'After the trip, H2 should be lit and H1 dark.' },
      ],
    },
    {
      name: 'Reset with SA1 at OFF: nothing starts until you turn it back on.',
      steps: [
        { t: 1, fault: { type: 'jam', part: 'P1' } },
        { t: 7, set: { SA1: 'off' } },
        { t: 8, action: { part: 'P1', do: 'clearJam' } },
        { t: 12, action: { part: 'FR1', do: 'reset' } },
        { t: 12.5, until: 14, expect: { KM1: false, H2: false }, say: 'After the reset with SA1 at OFF, something restarted or H2 stayed lit.' },
        { t: 15, set: { SA1: 'on' } },
        { t: 16, expect: { KM1: true }, say: 'Back at ON, the pump did not restart.' },
      ],
    },
  ],
  reference: 'POS(SA1,on)NC(FR1)COIL(KM1);\nNO(KM1)LAMP(H1);\nNO(FR1)LAMP(H2);',
  help: ['overload-relay', 'two-wire-three-wire', 'stop-before-reset', 'lockout-tagout'],
  realWorld:
    "With two-wire control, the pump **restarts the instant** the overload resets if the selector is still at ON. That's why our press guide says: mode switch to Stop first. Some overloads are set to **auto reset**, which restarts a two-wire motor with nobody there; keep them on manual (H) reset. Clearing a jam in real life means **lockout/tagout** at the disconnect, not just turning a selector to OFF.",
  hints: ['Insert `NC(FR1)` before `COIL(KM1)`.', 'New rung: `NO(FR1)` then `LAMP(H2)`.', 'Use the **Drop a rag in the pump** button in the work order to cause a trip.'],
};

const fill: Mission = {
  id: '1.7',
  chapter: 1,
  order: 9,
  kind: 'build',
  engine: 'relay',
  machine: 'wash',
  title: 'Fill to the Line',
  site: 'Hood-wash rig on Truck 3',
  brief:
    "The rig's water tank fills from city water through solenoid valve **Y2**. Fill should start when the water drops below the **low float** LSL and keep going until it reaches the **high float** LSH, then wait until it's low again. That gap between floats keeps the valve from chattering.\n\nA float's contact is actuated when water reaches it. Use a fill relay **KA1** with a seal-in so it remembers it's filling.",
  goal: ['With SA1 at AUTO, KA1 (and Y2) turns on below LSL and off at LSH.', 'Between the floats, it keeps doing whatever it was doing.', 'If the LSH wire breaks, filling stops.', 'H3 lights when the high-high float LSHH is reached.'],
  starter: '// Fill valve follows the fill relay KA1\nNO(KA1)SOL(Y2);',
  editable: true,
  palette: ['NO', 'NC', 'POS', 'COIL', 'LAMP', 'SOL'],
  init: { signals: { SA1: 'auto' } },
  tests: [
    {
      name: 'Low tank: fills to the high float, then stops.',
      init: { signals: { SA1: 'auto' }, levels: { TK1: 0.1 } },
      steps: [
        { t: 1, expect: { Y2: true }, say: 'With the tank below the low float, filling did not start.' },
        { t: 200, expect: { Y2: true }, say: 'Filling stopped partway, after the water passed the low float. KA1 needs a seal-in.' },
        { t: 520, expect: { Y2: false, 'TK1.level': { max: 0.9 } }, say: 'Filling did not stop at the high float.' },
      ],
    },
    {
      name: 'Between the floats, it waits.',
      init: { signals: { SA1: 'auto' }, levels: { TK1: 0.9 } },
      steps: [
        { t: 1, level: { TK1: 0.5 } },
        { t: 2, until: 10, expect: { Y2: false }, say: 'Filling started while the level was still above the low float.' },
        { t: 11, level: { TK1: 0.15 } },
        { t: 12, expect: { Y2: true }, say: 'The level dropped below the low float and filling did not start.' },
      ],
    },
    {
      name: 'LSH wire breaks: filling stops.',
      init: { signals: { SA1: 'auto' }, levels: { TK1: 0.1 } },
      steps: [
        { t: 2, fault: { type: 'open', device: 'LSH' } },
        { t: 2.5, until: 5, expect: { Y2: false }, say: 'When the LSH wire broke, the tank kept filling with nothing to stop it.' },
      ],
    },
    {
      name: 'SA1 at OFF: no filling.',
      init: { signals: { SA1: 'off' }, levels: { TK1: 0.1 } },
      steps: [{ t: 1, until: 5, expect: { Y2: false }, say: 'With SA1 at OFF the tank filled anyway.' }],
    },
    {
      name: 'High-high float lights H3.',
      init: { signals: { SA1: 'off' }, levels: { TK1: 0.97 } },
      steps: [{ t: 1, expect: { H3: true }, say: 'The water reached LSHH and H3 did not light.' }],
    },
  ],
  reference: 'POS(SA1,auto)NC(LSH)[NC(LSL),NO(KA1)]COIL(KA1);\nNO(KA1)SOL(Y2);\nNO(LSHH)LAMP(H3);',
  help: ['float-switch', 'seal-in', 'fail-safe', 'solenoid-valve'],
  realWorld:
    "Many real systems wire the high-high alarm the other way: a relay that is **energized while healthy**, so a broken float wire also raises the alarm. That's fail-safe for the alarm, at the cost of an extra relay. Floats stick, especially in greasy water, which is why critical tanks get a second independent high-level switch.",
  hints: ['Start the rung with `POS(SA1,auto)`, then `NC(LSH)`.', "LSL is actuated when water is at or above it, so `NC(LSL)` is closed only when the tank is low. Put it in parallel with `NO(KA1)`."],
};

const overflow: Mission = {
  id: '1.7b',
  chapter: 1,
  order: 10,
  kind: 'callout',
  engine: 'relay',
  machine: 'wash',
  title: 'Callout: Overflow Overnight',
  site: 'Truck 3, morning check',
  brief: "The rig sat plugged in overnight and water was all over the shop floor. The fill circuit is the one you built. Fill it from low and watch where it should stop.",
  goal: ['Watch a fill and find why it did not stop.', 'Repair it with **Inspect and repair**.'],
  starter: 'POS(SA1,auto)NC(LSH)[NC(LSL),NO(KA1)]COIL(KA1);\nNO(KA1)SOL(Y2);\nNO(LSHH)LAMP(H3);',
  editable: false,
  init: { signals: { SA1: 'auto' }, levels: { TK1: 0.7 } },
  hiddenFaults: [{ fault: { type: 'jumper', device: 'LSH' }, target: 'LSH', found: 'Someone put a jumper across the LSH terminals while replacing the float and never took it out. You remove it and tag the float as tested.' }],
  tests: [
    {
      name: 'Filling stops at the high float.',
      init: { signals: { SA1: 'auto' }, levels: { TK1: 0.1 } },
      steps: [{ t: 520, expect: { Y2: false }, say: 'The tank still does not stop filling at LSH.' }],
    },
  ],
  reference: 'POS(SA1,auto)NC(LSH)[NC(LSL),NO(KA1)]COIL(KA1);\nNO(KA1)SOL(Y2);\nNO(LSHH)LAMP(H3);',
  help: ['jumpers-and-bypasses', 'troubleshooting-with-a-meter', 'float-switch'],
  realWorld: "Jumpers left in after testing are a classic cause of failures. Our own press may have **yellow jumpers across its float terminals 31/32 and 36/37** (unconfirmed). If they're there, the pumps have no dry-run protection. Any temporary jumper should be logged and tagged, and removed before the machine goes back in service.",
  hints: ['Let it fill and watch LSH in the drawing when the water reaches it.', 'If LSH changes but its contact still conducts, something is bridging it.'],
};

const sprayCycle: Mission = {
  id: '1.8',
  chapter: 1,
  order: 11,
  kind: 'build',
  engine: 'relay',
  machine: 'wash',
  title: 'Spray Cycle',
  site: 'Hood-wash rig on Truck 3',
  brief:
    "The spray valve **Y1** should pulse while the spray pump runs, the way our press's KT1 pulses its wash water: **30 s of spray every 10 min**. The pump also needs **5 s to prime** before any spray, and the manual Spray button SB3 should fire Y1 any time after priming.\n\nUse two timers: an **on-delay** for priming and a **cycle timer** for the pulse.",
  goal: ['No spray during the first 5 s after the pump starts.', 'While running: 10 min off, 30 s on, repeating.', 'SB3 sprays any time after priming.', 'Stopping the pump stops the spray.'],
  starter: '// Spray pump start/stop, already wired\nNC(SB1)[NO(SB2),NO(KM2)]COIL(KM2);',
  editable: true,
  palette: ['NO', 'NC', 'COIL', 'TMR', 'SOL', 'LAMP'],
  tests: [
    {
      name: 'No spray while priming, even with SB3 held.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 2, press: 'SB3' },
        { t: 2.05, until: 5.5, expect: { Y1: false }, say: 'Y1 opened before the pump had run 5 s.' },
      ],
    },
    {
      name: 'Manual spray after priming.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 9, press: 'SB3' },
        { t: 9.5, expect: { Y1: true }, say: 'After priming, SB3 did not open Y1.' },
        { t: 10, release: 'SB3' },
        { t: 10.5, expect: { Y1: false }, say: 'Y1 stayed open after SB3 was let go.' },
      ],
    },
    {
      name: 'The cycle: 30 s of spray every 10 minutes.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 10, until: 598, expect: { Y1: false }, say: 'Y1 opened during the first 10-minute OFF time.' },
        { t: 603, until: 629, expect: { Y1: true }, say: 'Y1 was not open for 30 s at the 10-minute mark.' },
        { t: 633, until: 680, expect: { Y1: false }, say: 'Y1 stayed open longer than 30 s.' },
        { t: 1233, until: 1259, expect: { Y1: true }, say: 'The second spray, 10 minutes after the first ended, did not happen.' },
      ],
    },
    {
      name: 'Stopping the pump stops the spray.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 610, tap: 'SB1' },
        { t: 611, until: 700, expect: { Y1: false }, say: 'Y1 stayed open (or reopened) after the pump stopped.' },
      ],
    },
    {
      name: 'No spray with the pump off.',
      steps: [{ t: 1, until: 700, expect: { Y1: false }, say: 'Y1 opened with the spray pump off.' }],
    },
  ],
  reference: 'NC(SB1)[NO(SB2),NO(KM2)]COIL(KM2);\nNO(KM2)TMR(KT2,on,5);\nNO(KM2)TMR(KT1,cycle,600,30);\nNO(KT2)[NO(KT1),NO(SB3)]SOL(Y1);',
  help: ['on-delay', 'cycle-timer', 'solenoid-valve'],
  realWorld:
    "Our press uses a BERM **DH48S-S** cycle timer for KT1. Its dial reads 30 s / 10 min; the press manual's factory setting is 25 s every 15 min. Digital timers like these lose their count on power loss. Use the speed buttons (×60, ×600) so you don't wait 10 real minutes.",
  hints: ['`NO(KM2)` then `TMR(KT2,on,5)` makes the prime timer.', '`NO(KM2)` then `TMR(KT1,cycle,600,30)` makes the pulse.', 'Spray rung: `NO(KT2)` then a branch of `NO(KT1)` and `NO(SB3)`, then `SOL(Y1)`.'],
};

const waterBill: Mission = {
  id: '1.8b',
  chapter: 1,
  order: 12,
  kind: 'callout',
  engine: 'relay',
  machine: 'wash',
  title: 'Callout: Water Bill',
  site: 'Truck 3',
  brief: "The water bill for Truck 3 tripled. The spray circuit is the same one you built, but someone changed a timer setting. Run the pump at ×60 and time the sprays.",
  goal: ['Find the wrong setting and set it back to 30 s every 10 min.'],
  starter: 'NC(SB1)[NO(SB2),NO(KM2)]COIL(KM2);\nNO(KM2)TMR(KT2,on,5);\nNO(KM2)TMR(KT1,cycle,60,30);\nNO(KT2)[NO(KT1),NO(SB3)]SOL(Y1);',
  editable: 'presets',
  tests: sprayCycle.tests.filter((t) => t.name.startsWith('The cycle')),
  reference: 'NC(SB1)[NO(SB2),NO(KM2)]COIL(KM2);\nNO(KM2)TMR(KT2,on,5);\nNO(KM2)TMR(KT1,cycle,600,30);\nNO(KT2)[NO(KT1),NO(SB3)]SOL(Y1);',
  help: ['cycle-timer', 'on-delay'],
  realWorld: "Timer dials get bumped. On the press, check KT1 and KT2 against the setting sheet during every service, and write the as-found and as-left values down.",
  hints: ['Select the KT1 timer coil. Its OFF time should be 600 s.'],
};

const runOn: Mission = {
  id: '1.9',
  chapter: 1,
  order: 13,
  kind: 'build',
  engine: 'relay',
  machine: 'fan',
  title: 'Run-On',
  site: 'Press room',
  brief:
    "The drive motor's cooling fan must run whenever the motor runs **and for 2 minutes after it stops**, to carry the heat away.\n\nAn **off-delay** timer does exactly that: its contact closes when the coil energizes and opens a set time after the coil drops.\n\nOur press does the same job a sneakier way, with an **on-delay** timer whose coil is fed through a NC contact. Try both if you like.",
  goal: ['KM2 (fan) runs whenever KM1 runs.', 'KM2 keeps running 2 min after KM1 stops, then stops.'],
  starter: '// Drive motor start/stop, already wired\nNC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);',
  editable: true,
  palette: ['NO', 'NC', 'COIL', 'TMR'],
  tests: [
    {
      name: 'The fan runs with the motor.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 2, until: 30, expect: { KM2: true }, say: 'The fan did not run while the motor ran.' },
      ],
    },
    {
      name: 'The fan runs on 2 minutes after the motor stops.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 30, tap: 'SB1' },
        { t: 31, until: 148, expect: { KM2: true, KM1: false }, say: 'The fan stopped before 2 minutes were up.' },
        { t: 152, until: 200, expect: { KM2: false }, say: 'The fan was still running more than 2 minutes after the motor stopped.' },
      ],
    },
    {
      name: 'Never runs before the motor has run.',
      steps: [{ t: 1, until: 200, expect: { KM2: false }, say: 'The fan ran with the motor never started.' }],
    },
    {
      name: 'A restart during run-on keeps the fan going.',
      steps: [
        { t: 1, tap: 'SB2' },
        { t: 30, tap: 'SB1' },
        { t: 100, tap: 'SB2' },
        { t: 101, until: 300, expect: { KM2: true }, say: 'The fan stopped while the motor was running again.' },
      ],
    },
  ],
  reference: 'NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);\nNO(KM1)TMR(KT1,off,120);\nNO(KT1)COIL(KM2);',
  help: ['off-delay', 'on-delay'],
  realWorld:
    "On the press, **KT2** gives the screws a run-on after Auto stop using an on-delay timer fed through KA5's NC contact, and the screws hold themselves in until KT2 times out. Its dial reads 30 min; the manual says about 5 min. Mission 1.13 is about that.",
  hints: ['`NO(KM1)` then `TMR(KT1,off,120)`.', 'Then `NO(KT1)` then `COIL(KM2)`.'],
};

export default [lightsOn, bothOrEither, sealIn, secondStation, deadTailgate, fwdRev, welded, trip, fill, overflow, sprayCycle, waterBill, runOn];

/** An alternative solution to 1.9 using only an on-delay, like the press's KT2. */
export const RUN_ON_ON_DELAY = 'NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);\n[NO(KM1),NO(KM2)]NC(KT1)COIL(KM2);\nNC(KM1)TMR(KT1,on,120);';
export type { Scenario };
