# Control Room: design

Approved plan, 2026-11-21. The brief is `PROMPT.md`; the source material is `reference/`.

## The loop
Open a work order, see the machine animated, build or fix its logic, poke the machine live (buttons, floats, levels, faults), then press **Commission**. The game runs the mission's test scenarios against your logic at high speed and reports in plain English. Passing unlocks the next work order.

Mission kinds:
- **Build**: wire it (relay) or write it (ladder).
- **Callout**: a working machine has a hidden fault; find it with the live view and the meter, then fix it.
- **Investigate**: the real press. Trace, predict or reproduce a behavior; the game checks what you actually did in the sim.

## Engines (pure TypeScript, no DOM, unit-tested)
- `src/engine/rung.ts`: the shared rung tree (series lists and parallel branches) and its text form, which follows Logix neutral text: `XIC(Start)[XIC(Pump),...]OTE(Pump);`. Relay circuits use the same grammar with relay mnemonics: `NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);`.
- `src/engine/relay/`: compiles rungs to a wire-numbered netlist and solves it. Energized nodes come from a graph search from the sources; relays iterate to a stable state (chatter is reported); a path to N with no load is a dead short that blows the control fuse. On-delay, off-delay and cycle timers; level relays; overloads; faults.
- `src/engine/ladder/`: Logix-style scan. Every instruction takes rung-condition-in and gives rung-condition-out, and runs even when its rung is false. Input image, rungs top to bottom, output image. Prescan on power-up.
- `src/engine/process/`: fixed-step tanks, pumps, valves, floats, electrodes, 4–20 mA transmitters, motors, screws.
- `src/engine/sim.ts`: couples the plant, any hardwired relay circuit, the player's relay circuit or ladder program, and I/O wiring on one clock.
- `src/engine/mission/`: runs test scenarios headless and writes the plain-language report.

## Data (`src/data/`, no engine edits needed to add content)
- `machines/*.ts`: parts (plant + operator devices) with positions, relay field devices, hardwired circuits, PLC I/O.
- `missions/ch1|ch2/*.ts`: brief, starter, palette, hidden faults, tests, observation objectives, reference solution, help card ids, Real-world note. Files are auto-discovered.
- `help/*.md`: help cards with a **Real world** section.

## Defaults chosen
- Logix (Studio 5000) mnemonics, with the Connected Components Workbench (Micro800) equivalent on every card.
- Press drawings redrawn in horizontal ladder form (the real sheets are vertical IEC style).
- MUL and DIV added to the instruction set for analog scaling.
- The separator (SA8–SA10, KM5–KM7, LVS2, KT3) is left out of Chapters 1–2.
- KT2 defaults to the manual's 5 minutes; the dial reads 30.
- KA4 is not modeled (its contacts can't be read from the photo); KA1/KA10 are treated as closed.

## Safety pillars in code
- Fault-injection tests: every start/stop mission breaks the stop wire and expects the machine to stop. Only NC stops (and XIC in ladder) pass.
- PLC missions keep the E-stop hardwired in a fixed circuit the player can't edit. A test forces every PLC output on and checks the E-stop still drops the contactors.
- Every simplification is listed in `docs/SIMPLIFICATIONS.md` and in the mission's Real-world card.
