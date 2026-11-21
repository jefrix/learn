# ADD, SUB, MUL, DIV
When the rung is true: `ADD(A,B,Dest)` stores A + B, `SUB` A − B, `MUL` A × B, `DIV` A ÷ B.

- If the destination is a **REAL**, you keep the decimals.
- If it's a **DINT**, a decimal result is **rounded**, except integer DIV, which **truncates**: 7 ÷ 2 = 3.
- Overflowing a DINT, or dividing by zero, sets a **minor fault** flag. In this game a divide by zero leaves Dest unchanged.

## Try it
Mission 2.7 scales 4-20 mA with `SUB` then `MUL`. See [[analog-scaling]].

## Real world
- **Studio 5000:** ADD, SUB, MUL, DIV, MOD, SQR and more; **CPT** computes a whole expression in one box; **SCP** scales between two ranges.
- **CCW:** ADD, SUB, MUL, DIV blocks, or a structured text expression.
- The game added MUL and DIV to the brief's instruction list because analog scaling needs them.
