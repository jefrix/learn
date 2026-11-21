# Sequences with state numbers
A machine that goes through steps (fill, mix, run, run on, idle) is easier to program and troubleshoot as a **state machine**: one DINT tag holds the step number.

- Move to a step with `MOV(20,State)`.
- Do things in a step with `EQU(State,20)`.
- Time a step with a timer enabled by `EQU(State,20)`, and leave when its `.DN` is set.
- Drive each output from **one** rung that lists the states it's on in: `[EQU(State,23),EQU(State,24)]OTE(P202_Run)`.

Number steps with gaps (10, 20, 21, 22...) so you can add steps later.

## Real world
- Show the state number on the HMI. When the machine stops, the operator can tell you "it's stuck in 22".
- **Studio 5000** also offers **SFC** (sequential function charts). **CCW** offers ladder, function block and structured text; a `CASE` statement in ST is another clean way to write a sequence.
