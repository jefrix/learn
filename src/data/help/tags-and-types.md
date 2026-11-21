# Tags and data types
A **tag** is a named piece of PLC memory. Every tag has a data type:

- **BOOL**: one bit, 0 or 1. Buttons, outputs, flags.
- **DINT**: a 32-bit whole number (about ±2.1 billion). Counts, state numbers.
- **REAL**: a 32-bit decimal number with about 7 significant digits. Levels, pressures, scaled analog.
- **TIMER**: a structure with `.PRE`, `.ACC` (both DINT, in milliseconds) and status bits `.EN`, `.TT`, `.DN`.
- **COUNTER**: `.PRE`, `.ACC`, and bits `.CU`, `.CD`, `.DN`, `.OV`, `.UN`.

In this game, I/O tags come from the machine, tags used in rungs are created for you (BOOL by default, TIMER for a timer, DINT for numbers), and you declare REALs with a `TAG Name REAL` line or the Tags view.

## Real world
- In **Studio 5000** you create every tag yourself, controller-scoped or program-scoped. I/O comes in as module tags (`Local:1:I.Data.0`), and you usually make readable **aliases**. There are also SINT, INT, LINT, arrays and user-defined types.
- In **CCW**, they're called **variables** (global or local). Types follow IEC 61131-3: BOOL, INT, DINT, REAL, TIME and more. There's no TIMER structure: each timer is an instance of a TON function block.
- Storing a REAL into a DINT **rounds** (to the nearest, ties to even). Doing scaling math in DINT loses the fractions. See [[analog-scaling]].
