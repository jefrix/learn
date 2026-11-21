# Claude Code prompt: Control Room

Paste everything below the line into Claude Code, run from the root of this repo.

---

You are helping me build an original browser-based learning game that teaches industrial controls, then software. It lives in this repo (`jefrix/learn`), which is published with GitHub Pages at jefrix.github.io/learn. Read this whole brief and the files in `reference/`, then propose a plan before writing code.

## Who it's for
Me: Jeff Ricks, Technical Director at AmeriPro, a restaurant-services company (F.O.G. pumping, hood cleaning, and wastewater equipment). We run a custom PJDL-302 multi-disc screw press with a relay-logic control panel, and I need to learn Allen-Bradley PLC ladder programming for an upcoming work project. I read schematics loosely and direct AI-built web projects, but I'm not yet a programmer. Teach by doing, not by text walls.

## What's in this repo already
- `reference/screwpress/CONTROL_LOGIC.md`: **start here.** A plain-text summary of our press panel's real relay logic: device tags, modes, the Auto latch, the KT2 run-on, level control, faults, the known safety gap, and the PLC field terminals. Items marked unconfirmed are best readings.
- `reference/screwpress/drawings/`: the six wiring sheets of the real panel (photos of Chinese-made drawings).
- `reference/screwpress/photos/`: the panel door, relay rail, terminal strip, drives, breakers and nameplates.
- `reference/screwpress/guide.html` and `notes.html`: our existing operator guide and its notes page, including an interactive panel-door simulator written in plain JavaScript. Study its panel logic, but build this game's engines fresh.
- `reference/mwtp/`: control and P&ID documents for our Mobile Water Treatment Plant trailer concepts (MWTP-250 and MWTP-50C), for the late-game treatment missions.
- `assets/ameripro_logo.jpg`: our logo.

These are reference material only. Don't edit or publish anything in `reference/` as part of the game; the game goes in its own folders.

## Vision
A game called "Control Room" (working title). The player is a new controls technician at **AmeriPro**. Each mission is a piece of AmeriPro equipment or a customer site that needs fixing or automating: a grease trap pump-out truck's tank, a lift station, a hood-cleaning wash rig, the screw press and its separator, and finally a mobile water treatment trailer. The machines are animated on screen and respond to the player's logic in real time. Getting it right is the reward: the pump starts, the tank fills, the alarm clears.

The **screw press is the spine of the game.** The player meets it in Chapter 1 as relay logic, learns to read its real panel (with a simplified version of its drawings and device tags: SB, SA, KA, KM, KT, FR, LVS, H), and in Chapter 2 rebuilds and improves it in Allen-Bradley ladder. The capstone fixes the press's real safety gap: an empty polymer tank or a dosing-pump trip doesn't stop the feed.

## Curriculum (in this order)
**Chapter 1: Relay logic.** A schematic sandbox where the player wires pushbuttons, selector switches, NO/NC contacts, relay coils, contactors, overloads, on-delay/off-delay timers, level relays and pilot lamps. Topics: series vs parallel, NO vs NC, why stop buttons and E-stops are NC (fail-safe), seal-in circuits, interlocks (no forward and reverse at once), overload trips and reset, timers, level control with electrodes and floats. Use our panel's tag conventions.

**Chapter 2: Allen-Bradley-style PLC ladder logic.** A ladder editor using Allen-Bradley instruction names and behavior: XIC, XIO, OTE, OTL, OTU, ONS, TON, TOF, RTO, CTU, CTD, RES, EQU, NEQ, GRT, LES, GEQ, LEQ, MOV, ADD, SUB. Use tag-based addressing like Studio 5000 and Connected Components Workbench (named tags with data types BOOL, DINT, REAL, TIMER, COUNTER), including timer members .PRE, .ACC, .EN, .TT, .DN. Topics in order: the scan cycle (read inputs, solve rungs top to bottom, write outputs), contacts and coils, seal-in vs OTL/OTU, why duplicate OTE on the same tag is a bug, rung order effects, one-shots, timers, counters, compares, simple sequences (state numbers with MOV and EQU), alarms with acknowledge, and analog scaling (4–20 mA to engineering units). A late mission covers interfacing a PLC to a relay panel through dry contacts, using the press's real terminals (18/41 remote start, P1–P4 status outputs).

**Chapter 3 onward (plan only, don't build yet):** JavaScript basics, browser dev tools and debugging, git (commits, branches, diffs), game-loop thinking (state, update, render), and Python automation. The theme: "AmeriPro's operator screens are web pages, and now you build them," ending with the player building a small web HMI for the press.

## Design pillars (hard requirements)
1. **Live machine feedback.** Every mission has an animated machine (SVG or canvas) wired to the logic. Inputs are clickable (buttons, switches, floats and levels you can drag). Outputs visibly act (screws turn, pumps run, valves open, lamps light, tank levels change with simple physics).
2. **Watch the logic run.** Power flow highlights in real time: energized rungs and true contacts glow, timers show a live .ACC counting up. A "step scan" mode runs one scan at a time and shows the input image, rung solving and output image, so the scan cycle is visible. Provide a time-speed control so long timers (like the press's run-on) don't make the player wait.
3. **Faults teach.** Missions include realistic troubleshooting: a broken wire, a welded contact, a tripped overload, a float jumpered out, sludge on a level electrode giving a false full reading, a drive fault, a timer preset wrong, a rung order bug. The player finds and fixes them from the live view, the way a technician would.
4. **Real-world notes.** Every instruction and concept has a short help card in plain English, with a "Real world" section saying how it appears in Connected Components Workbench (free, Micro800) and Studio 5000 (CompactLogix/ControlLogix), and where they differ. Don't claim the game replaces real software or training.
5. **Safety woven in.** Teach that E-stops and safety interlocks must be hardwired and not rely on PLC logic alone, that the E-stop is not lockout/tagout (on our press it breaks only the control circuit), that the mode switch goes to Stop before resetting an overload or releasing an E-stop, and that Auto modes can restart equipment with nobody at the panel. Reward fail-safe designs (a stop wired NC and examined with XIC). Never present a game simplification as a safe procedure for the real press.
6. **Mission checking by test.** Each mission defines its required behavior as test scenarios (input sequences and the expected outputs over time). When the player clicks "Commission", the game runs those scenarios against their logic and reports which passed in plain language ("When the polymer tank went low, the sludge pump kept running"). Players may solve missions any way that passes.
7. **Ours, not Rockwell's.** Use the AmeriPro name and logo. Use Allen-Bradley instruction mnemonics as a learning convention, but don't use Rockwell logos, product screenshots, or claim affiliation.

## Missions for Chapters 1–2 (refine these in your plan)
**Relay:** lamp and pushbutton → start/stop pump with seal-in → two-station start/stop → forward/reverse screw with interlock → overload trip and reset (Stop first) → tank fill with high and low floats → timed wash spray (KT1 style pulse) → **read the real press panel**: trace SB3 → KA5, find why a screw won't run in Auto (SA11 off), explain why the screws keep turning after Auto stop (KT2), spot the Manual-mode overfill risk and the polymer-low gap.
**PLC:** rebuild a start/stop → duplicate OTE bug hunt → latch vs seal-in after power loss → lift station duplex pumps with lead/lag alternation and high-level alarm → **rebuild the press Auto sequence** in ladder (mixer, sludge pump and dosing pump with Auto; level control from the mixing tank; screws run on for a set time after stop) → **fix the press's safety gap**: stop the feed and alarm, with acknowledge, on polymer low or a dosing-pump trip, and add a Manual high-level cutoff → **interface a PLC to the relay panel** through terminals 18/41 and the P outputs → final mission: a simplified MWTP water treatment trailer (filter, backwash on timer or differential pressure, turbidity alarm that diverts flow), based on `reference/mwtp/`.

## Tech
- TypeScript + Vite, no backend, built to a static site and deployed to GitHub Pages from this repo (set Vite's `base` to `/learn/`, and add a GitHub Actions workflow that builds and deploys on pushes to `main`).
- Keep the simulation engines pure and UI-independent with unit tests (Vitest): a relay circuit solver, a ladder scan engine with Allen-Bradley semantics, simple process physics (tank levels, flow), and the mission test runner. The UI is a thin layer on top.
- Missions, machines and help cards are data files, so I can add missions without touching engine code.
- Save progress to localStorage (wrapped in try/catch) with export and import of the save as JSON.
- Ladder editing must work with mouse and keyboard and be usable on a tablet. Readable industrial look: panel labels, device tags in safety yellow like the real press panel, not neon hacker green.

## How I want you to work
1. First reply with: a short design doc, the mission list with each mission's teaching goal and its commissioning tests, the data model (circuit, rung, instruction, tag, machine, mission), the folder structure, and the help-card list. Note anything in `reference/` you found unclear or contradictory. Wait for my OK.
2. Build Chapter 1 first, then Chapter 2, in small steps. Run tests and the dev server as you go. Commit after each working step with a clear message.
3. Write unit tests that check the ladder engine against Allen-Bradley behavior for every instruction (including TON/TOF/RTO timing bits, ONS, OTL/OTU retention, and last-rung-wins for duplicate OTE). Write an automated test that solves every mission with a reference solution, so I know each one is solvable.
4. When done, tell me how to run and deploy it, give me a one-line summary of each mission, flag any place the game simplifies real Allen-Bradley behavior or our real press, and list what you'd build next.

Fun first, but never teach something false. If you have to simplify, say so in that mission's Real-world card.
