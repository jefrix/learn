# OTL and OTU: Latch and Unlatch
`-(L)-` **sets** its bit to 1 when its rung is true. `-(U)-` **clears** it to 0 when its rung is true. When their rungs are false, they do nothing, so the bit **keeps its value**.

They're useful for alarms that must stay until acknowledged, sequence flags, and remembering a fault.

## Safety
A latched bit is **retained through a power cycle** in Logix. A motor started with OTL can **restart by itself** when power returns. Unlatch it on the first scan with `XIC(S:FS)OTU(...)`, or use a [[seal-in]] with [[ote]]. See [[prescan-first-scan]].

## Real world
- **Studio 5000:** OTL / OTU. **CCW (Micro800):** **set coil** and **reset coil**. In Micro800, a variable only keeps its value through power loss if it's marked **Retain**.
