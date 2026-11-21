# OTE: Output Energize
`-( )-` writes the rung condition into its bit **every scan**: 1 when the rung is true, **0 when it's false**. It passes the rung condition through, so you can put more instructions after it.

Because it writes every scan, two OTEs on the same bit fight, and the last rung wins. See [[duplicate-outputs]].

On power-up, the prescan clears every OTE bit. See [[prescan-first-scan]].

## Real world
- **Studio 5000:** OTE. **CCW (Micro800):** a **direct coil**.
- Most motor outputs should be OTE with a seal-in, not [[otl-otu]]. A seal-in drops out on power loss; a latch doesn't.
