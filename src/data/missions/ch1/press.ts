// Chapter 1, missions 1.10 to 1.14: reading the real PJDL-302 panel.
import type { Mission } from '../../../engine/mission/types';
import { PRESS_PANEL, PRESS_AUTO_INIT } from '../../machines/press';

const PRESS_REAL_WORLD =
  "This drawing is a **simplified redraw** of sheets 3, 4 and 6 of our press panel, turned sideways into horizontal rungs. The real sheets are drawn vertically, IEC style. Best readings that aren't confirmed on the machine: KA1 is treated as a closed wire; KA4 is drawn as an Auto relay whose contacts keep the Manual and Auto legs apart; each pump gets its own KA4 contact below wire 33. **Nothing here is a procedure for the real press.** Lockout/tagout, the hardwired E-stop and an electrician's review still apply.";

const walkdown: Mission = {
  id: '1.10',
  chapter: 1,
  order: 14,
  kind: 'investigate',
  engine: 'relay',
  machine: 'press',
  title: 'Panel Walkdown',
  site: 'PJDL-302 screw press',
  brief:
    "This is the real thing: our PJDL-302 multi-disc screw press. Sludge is pumped into the mixing tank, polymer is dosed in, the mixer forms flocs, and two screws squeeze out the water.\n\nThe panel is **pure relay logic**. Every tag on the door and in the drawing matches the real panel: SB buttons, SA selectors, KA relays, KM contactors, KT timers, FR overloads, LVS level relay, H lamps.\n\nWalk the panel. Start it, watch it run, trip something, and reset it the way the operator guide says.",
  goal: ['Work through the checklist below in the live machine.', 'Use the drawing to see which contacts are holding each device in.'],
  starter: PRESS_PANEL,
  editable: false,
  init: { signals: { ...PRESS_AUTO_INIT.signals }, levels: PRESS_AUTO_INIT.levels },
  breakables: [{ label: 'Trip the dosing pump overload FR4', fault: { type: 'trip', part: 'FR4' } }],
  observe: [
    { id: 'o1', text: 'With SA2 at Auto, press SB3 Auto start: KA5 latches and both screws run.', when: { KA5: true, KM11: true, KM12: true } },
    { id: 'o2', text: 'See the feed pump run lamp H7 lit (KM3 running).', when: { H7: true, KM3: true } },
    { id: 'o3', text: 'Trip FR4 and find the lamp that lights for it.', when: { FR4: true, H34: true } },
    { id: 'o4', text: 'Reset FR4 the safe way: SA2 to Stop first, then RESET.', when: { SA2: 'stop', FR4: false }, after: 'o3' },
    { id: 'o5', text: 'Press the E-stop SB1. Notice which lamp stays lit.', when: { SB1: true, H1: true, KA5: false } },
  ],
  quiz: {
    question: 'The E-stop is pressed and H1 (Power) is still lit. What does that tell you?',
    options: ['The E-stop is broken.', 'The E-stop only opens the control circuit. The panel, the drives and H1 are still powered.', 'H1 is wired to the plant PLC.', 'Nothing. Lamps take a minute to go out.'],
    answer: 1,
    explain: "On our press, SB1 breaks only the control circuit (wire 1 to 2). The main breaker, the drives U1/U2 and H1 stay live. **An E-stop is not lockout/tagout.** Before hands go in, the disconnect gets locked out and the panel tested dead.",
  },
  tests: [],
  reference: PRESS_PANEL,
  walkthrough: {
    name: 'walkdown',
    steps: [
      { t: 1, tap: 'SB3' },
      { t: 5, fault: { type: 'trip', part: 'FR4' } },
      { t: 6, set: { SA2: 'stop' } },
      { t: 10, action: { part: 'FR4', do: 'reset' } },
      { t: 11, set: { SA2: 'auto' } },
      { t: 12, tap: 'SB3' },
      { t: 14, press: 'SB1' },
      { t: 16 },
    ],
  },
  help: ['reading-a-schematic', 'e-stop', 'lockout-tagout', 'stop-before-reset', 'overload-relay'],
  realWorld: PRESS_REAL_WORLD,
  hints: ['Turn SA2 to AUTO (tap the right half of the knob), then press the green SB3.', 'Use the **Trip the dosing pump overload** button, then look at the red fault lamps.', 'Turn SA2 to STOP before pressing FR4 RESET.'],
};

const traceLatch: Mission = {
  id: '1.11',
  chapter: 1,
  order: 15,
  kind: 'investigate',
  engine: 'relay',
  machine: 'press',
  title: 'Trace the Latch',
  site: 'PJDL-302 screw press',
  brief:
    "KA5 is the press's **Auto run latch**. Find its rung in the drawing: SB3 starts it, SB4 stops it, and one of KA5's own contacts holds it in.\n\nThere's a second way in. With **SA1 at Remote**, KA3 pulls in, which blocks SB3 and lets a plant PLC contact on terminals **18/41** run KA5 instead.",
  goal: ['Trace the KA5 rung in the drawing while you operate the panel.'],
  starter: PRESS_PANEL,
  editable: false,
  init: { signals: { ...PRESS_AUTO_INIT.signals }, levels: PRESS_AUTO_INIT.levels },
  observe: [
    { id: 'o1', text: 'In Local, start with SB3 and let go: KA5 stays in.', when: { SA1: 'local', KA5: true, SB3: false } },
    { id: 'o2', text: 'Stop it with SB4: KA5 drops.', when: { SA1: 'local', KA5: false, SB4: true }, after: 'o1' },
    { id: 'o3', text: 'Turn SA1 to Remote and close the plant PLC contact (18/41): KA5 pulls in.', when: { SA1: 'remote', PLC: 'on', KA5: true, KA3: true } },
    { id: 'o4', text: 'Still in Remote, open the PLC contact and press SB3: nothing happens.', when: { SA1: 'remote', PLC: 'off', SB3: true, KA5: false }, after: 'o3' },
  ],
  quiz: {
    question: 'Which contact keeps KA5 pulled in after you let go of SB3?',
    options: ['SB4, normally closed', "KA5's own normally open contact, in parallel with SB3", 'KA3, normally closed', 'LVS1'],
    answer: 1,
    explain: "That's a **seal-in**, the same idea as Truck 7's pump. SB4 (NC) and KA3 (NC) are in series after it, so either one opening drops KA5.",
  },
  tests: [],
  reference: PRESS_PANEL,
  walkthrough: {
    name: 'trace',
    steps: [
      { t: 1, tap: 'SB3' },
      { t: 3, press: 'SB4' },
      { t: 4, release: 'SB4' },
      { t: 5, set: { SA1: 'remote', PLC: 'on' } },
      { t: 7, set: { PLC: 'off' } },
      { t: 8, press: 'SB3' },
      { t: 9 },
    ],
  },
  help: ['seal-in', 'control-relay', 'dry-contacts', 'auto-restarts'],
  realWorld: `In Remote, the press can start with **nobody at the panel**. Anyone working near it must assume it can start at any time unless it's locked out. ${PRESS_REAL_WORLD}`,
  hints: ['Tap KA5 in the drawing to see its contacts highlighted when they close.', 'The PLC contact is the small OFF/ON switch labeled "PLC 18/41" inside the cabinet.'],
};

const screwOne: Mission = {
  id: '1.12',
  chapter: 1,
  order: 16,
  kind: 'callout',
  engine: 'relay',
  machine: 'press',
  title: "Callout: Screw 1 Won't Run",
  site: 'PJDL-302 screw press, night shift',
  brief:
    "The night operator says: \"Auto is running but screw 1 just sits there. The manual says the drive switches don't matter in Auto.\"\n\nStart the press in Auto and follow the power along the drawing to KM11.",
  goal: ['Get both screws running in Auto.', 'Answer the question below.'],
  starter: PRESS_PANEL,
  editable: false,
  init: { signals: { ...PRESS_AUTO_INIT.signals, SA11: 'off' }, levels: PRESS_AUTO_INIT.levels },
  observe: [{ id: 'o1', text: 'Both screws running in Auto.', when: { SA2: 'auto', KA5: true, KM11: true, KM12: true } }],
  quiz: {
    question: 'What was stopping screw 1?',
    options: ['KT2 had timed out.', 'SA11 was at OFF. It sits after the point where Manual and Auto join (wire 19), so it counts in Auto too.', 'Drive U1 had faulted.', 'KA5 never latched.'],
    answer: 1,
    explain: "The press manual says Auto makes these switches invalid, but our drawing shows SA11 and SA12 **after** wire 19. If a screw won't start, check its drive switch first.",
  },
  tests: [],
  reference: PRESS_PANEL,
  walkthrough: {
    name: 'screw one',
    init: { signals: { SA11: 'off' } },
    steps: [
      { t: 1, tap: 'SB3' },
      { t: 3, set: { SA11: 'on' } },
      { t: 5 },
    ],
  },
  help: ['reading-a-schematic', 'selector-switch', 'troubleshooting-with-a-meter'],
  realWorld: PRESS_REAL_WORLD,
  hints: ['Turn the meter on and tap the wires along the KM11 rung, from wire 19 to the coil.', 'Wire 19 is live, wire 22 is dead. What sits between them?'],
};

const PANEL_KT2_DIAL = PRESS_PANEL.replace('TMR(KT2,on,300)', 'TMR(KT2,on,1800)');

const stillTurning: Mission = {
  id: '1.13',
  chapter: 1,
  order: 17,
  kind: 'investigate',
  engine: 'relay',
  machine: 'press',
  title: 'Still Turning',
  site: 'PJDL-302 screw press',
  brief:
    "Press **Auto stop** and the feed, polymer and mixer quit at once, but the screws keep turning. That's on purpose: they clear the sludge out of the barrels.\n\nKA5 drops, which energizes **KT2** through KA5's NC contact. The screws hold themselves in through their own KM11/KM12 contacts until KT2 times out and its NC contact opens.\n\nKT2's dial reads **30 minutes**. The manual's factory setting is **about 5**. Set it to the manual's value.",
  goal: ['Watch an Auto stop and the run-on.', 'Set KT2 to 5 minutes (300 s).', 'See what happens if SA2 leaves Auto during the run-on.'],
  starter: PANEL_KT2_DIAL,
  editable: 'presets',
  init: { signals: { ...PRESS_AUTO_INIT.signals }, levels: PRESS_AUTO_INIT.levels },
  observe: [
    { id: 'o1', text: 'After Auto stop: feed and polymer off, screws still turning.', when: { KA5: false, KM11: true, KM3: false, KM4: false, SA2: 'auto' } },
    { id: 'o2', text: 'During a run-on, turn SA2 to Stop: the screws stop at once.', when: { SA2: 'stop', KM11: false, KM12: false }, after: 'o1' },
  ],
  quiz: {
    question: 'Turning SA2 out of Auto during the run-on stops the screws at once. Why does that matter?',
    options: ["It doesn't; it's the same as waiting.", 'It skips the run-on and leaves sludge in the barrels.', 'It resets KT1.', 'It trips FR2.'],
    answer: 1,
    explain: "Wire 18 goes dead, so the screw hold path is gone. The barrels are left full of sludge. The manual also warns that Stop isn't instant in Auto because of this timer, so **use the E-stop in an emergency**.",
  },
  tests: [
    {
      name: 'Auto stop: feed quits at once, screws run on for 5 minutes.',
      steps: [
        { t: 1, tap: 'SB3' },
        { t: 60, tap: 'SB4' },
        { t: 61, expect: { KM3: false, KM4: false, KM2: false }, say: 'After Auto stop, feed, polymer or the mixer kept going.' },
        { t: 61, until: 357, expect: { KM11: true, KM12: true }, say: 'The screws stopped before 5 minutes of run-on.' },
        { t: 364, expect: { KM11: false, KM12: false }, say: 'The screws were still turning more than 5 minutes after Auto stop. KT2 should be set to 300 s.' },
      ],
    },
  ],
  reference: PRESS_PANEL,
  walkthrough: {
    name: 'run-on',
    steps: [
      { t: 1, tap: 'SB3' },
      { t: 20, tap: 'SB4' },
      { t: 30, set: { SA2: 'stop' } },
      { t: 32 },
    ],
  },
  help: ['on-delay', 'seal-in', 'auto-restarts'],
  realWorld: `Confirm KT2's setting with the maker before changing the real dial: 30 minutes may be intentional for F.O.G. ${PRESS_REAL_WORLD}`,
  hints: ['Select the KT2 timer coil in the drawing (the TD circle near wire 43).', 'Set its delay to 300 and press Enter.'],
};

const twoGaps: Mission = {
  id: '1.14',
  chapter: 1,
  order: 18,
  kind: 'investigate',
  engine: 'relay',
  machine: 'press',
  title: 'Two Gaps',
  site: 'PJDL-302 screw press',
  brief:
    "Our drawings show two weak spots. Prove them in the sim before anyone tries to fix them.\n\n**The polymer gap.** The polymer tank's low float (36/37) and the dosing overload FR4 sit only in the dosing pump's rung. If either opens, the sludge pump keeps feeding raw, undosed sludge into the press.\n\n**The Manual overfill.** LVS1's rods only gate the Auto leg. In Manual, nothing stops the feed when the mixing tank is full.\n\nAlso watch what sludge on the rods does: it can make LVS1 think the tank is full when it isn't.",
  goal: ['Reproduce each finding below in the live machine.', "Drag a tank's level to drain or fill it."],
  starter: PRESS_PANEL,
  editable: false,
  init: { signals: { ...PRESS_AUTO_INIT.signals }, levels: PRESS_AUTO_INIT.levels },
  breakables: [
    { label: 'Trip the dosing pump overload FR4', fault: { type: 'trip', part: 'FR4' } },
    { label: 'Sludge bridges the high rod', fault: { type: 'fouled', part: 'rods' } },
  ],
  observe: [
    { id: 'o1', text: 'In Auto, let the polymer tank run low: dosing stops, feed keeps going.', when: { SA2: 'auto', KM3: true, KM4: false, LS2: false } },
    { id: 'o2', text: 'In Auto, trip FR4 while feeding: the sludge pump keeps running.', when: { SA2: 'auto', FR4: true, KM3: true } },
    { id: 'o3', text: 'In Manual, overfill the mixing tank with the feed (SA5) on.', when: { SA2: 'manual', KM3: true }, event: 'overflow' },
    { id: 'o4', text: 'In Auto, foul the high rod: feed stops with the tank well below full.', when: { SA2: 'auto', KA5: true, KM3: false, 'LVS1.E3': true, 'TK_MIX.level': { max: 0.7 } } },
  ],
  quiz: {
    question: 'When the polymer tank runs low in Auto, what does the relay panel do?',
    options: ['Stops the feed and lights a lamp.', 'Stops only the dosing pump. The feed keeps going and no lamp lights.', 'Stops the whole press.', 'Sounds a horn.'],
    answer: 1,
    explain: "A low float gives **no lamp or signal at all** on these drawings, and FR4 only lights H34. Raw sludge goes into the press. Chapter 2 fixes this with a PLC: stop the feed, raise an alarm, require an acknowledge.",
  },
  tests: [],
  reference: PRESS_PANEL,
  walkthrough: {
    name: 'gaps',
    steps: [
      { t: 1, tap: 'SB3' },
      { t: 3, level: { TK_PO: 0.05, TK_MIX: 0.3 } },
      { t: 5, level: { TK_PO: 0.6 } },
      { t: 6, fault: { type: 'trip', part: 'FR4' } },
      { t: 8, set: { SA2: 'stop' } },
      { t: 9, action: { part: 'FR4', do: 'reset' } },
      { t: 12, action: { part: 'FR4', do: 'reset' } },
      { t: 13, set: { SA2: 'manual', SA5: 'on' } },
      { t: 14, level: { TK_MIX: 0.999 } },
      { t: 16, set: { SA5: 'off', SA2: 'stop' } },
      { t: 17, level: { TK_MIX: 0.5 } },
      { t: 18, set: { SA2: 'auto' } },
      { t: 19, tap: 'SB3' },
      { t: 21, fault: { type: 'fouled', part: 'rods' } },
      { t: 23 },
    ],
  },
  help: ['level-relay', 'float-switch', 'hardwired-safety', 'jumpers-and-bypasses'],
  realWorld: `These are findings from our drawings, not confirmed on the machine. Until they're fixed: watch the polymer tank, and in Manual the operator **is** the level control. ${PRESS_REAL_WORLD}`,
  hints: ['Drag the polymer tank down below its float (LS2) while Auto is feeding.', 'For the overfill: SA2 to Manual, SA5 ON, and drag the mixing tank up near full.'],
};

export default [walkdown, traceLatch, screwOne, stillTurning, twoGaps];
