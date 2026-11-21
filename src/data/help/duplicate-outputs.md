# Duplicate outputs (two OTEs, one bit)
If two rungs end in `OTE(P1_Run)`, both write it **every scan**. The later rung always overwrites the earlier one, so only the **last** rung really controls the output. The first rung appears to "do nothing".

Fix: put every condition for that output into **one rung**, with branches in front of a single OTE.

## Real world
- Studio 5000's Verify reports this as a **warning** ("duplicate destructive bit"), not an error: the program still downloads and runs.
- Two [[otl-otu]] rungs on one bit are fine; that's how latches work. Mixing OTE and OTL on the same bit is almost always a bug.
