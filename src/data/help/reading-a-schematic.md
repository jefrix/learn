# Reading a schematic
A control schematic shows **how current flows**, not where parts sit. Power comes from one side (L1, or wire 2 on our press), passes through contacts, and ends at a load (a coil, lamp or valve) that goes to the other side (N, or T1 on our press).

- **Rungs** are the horizontal lines. Read each one left to right: which contacts have to close for this load to get power?
- **Device tags** (KA5, KM3, SB4) show up in several places: the coil once, its contacts wherever they're used.
- **Wire numbers** label each conductor. On our press, wire 17 is SA2's Manual side and wire 18 its Auto side; wire 19 is where the screw paths join.
- **Cross-references** like `/4.7` under a coil say which sheet and column its contacts are on.

## Try it
Tap any element in the drawing. Tap a rung number to work on that rung. Live wires glow green.

## Real world
Our press sheets are drawn vertically in IEC style, with rungs running top to bottom. US NFPA 79 drawings run rungs left to right like this game. The logic is the same. This game's press drawing is a **simplified redraw**, not a copy of the real sheets.
