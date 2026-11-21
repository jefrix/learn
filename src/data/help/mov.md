# MOV: Move
When its rung is true, `MOV(Source,Dest)` copies Source into Dest. When the rung is false, it does nothing and Dest keeps its value.

Uses: set a state number (`MOV(21,State)`), copy a value to a display (`MOV(Level_In,Level_Display)`), load a preset (`MOV(30000,Tmr.PRE)`).

Moving a REAL into a DINT **rounds** to the nearest whole number (ties go to the even number).

## Real world
- **Studio 5000:** MOV, plus MVM (masked move), COP and CPS for arrays and structures.
- **CCW:** a **MOV** block, or an assignment in structured text (`Dest := Source;`).
