# Compare instructions
These are input instructions: true when the comparison holds (and the rung coming in is true).

- **EQU** A = B, **NEQ** A ≠ B
- **GRT** A > B, **LES** A < B
- **GEQ** A ≥ B, **LEQ** A ≤ B

Sources can be tags, literals, or timer and counter members: `GEQ(Level_In,60)`, `EQU(State,10)`, `GRT(Tmr.ACC,2500)`.

## Watch out
Don't use **EQU on REALs** from a sensor: 59.999998 is not 60. Use GEQ/LEQ or a band. EQU is right for whole-number state numbers.

## Real world
- **Studio 5000:** EQU, NEQ, GRT, LES, GEQ, LEQ, plus **LIM** (in a range) and **CMP** (an expression).
- **CCW:** comparison blocks **EQ, NE, GT, LT, GE, LE**.
