# CTU and CTD: Count Up and Count Down
**CTU** adds 1 to `.ACC` each time its rung goes from false to true. **CTD** subtracts 1 the same way. Holding the rung true doesn't keep counting: the `.CU` / `.CD` bit remembers the last state.

`.DN` is 1 whenever ACC ≥ PRE. A CTU and a CTD can share one COUNTER tag to count up and down.

Counting past 2,147,483,647 wraps to −2,147,483,648 and sets `.OV`; below the minimum sets `.UN`.

## Real world
- **Studio 5000:** CTU / CTD with a COUNTER tag. Clear it with [[res]].
- **CCW:** IEC function blocks: **CTU** (CU, RESET, PV → Q, CV), **CTD** (CD, LOAD, PV → Q, CV), and **CTUD**.
