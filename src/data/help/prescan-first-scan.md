# Prescan and the first scan
When a Logix controller goes to Run (after power-up or a mode change), it does a **prescan** before the first real scan:

- [[ote]] bits are cleared to 0.
- [[ton]] timers are reset; [[tof]] timers get ACC = PRE with DN = 0.
- [[ons]] storage bits and counter `.CU`/`.CD` bits are **set**, so inputs that are already on don't trigger.
- [[otl-otu]] bits and [[rto]] accumulators are **left alone**.

Then the system bit **S:FS** (first scan) is 1 for the first scan only. Use it to put things in a known state: `XIC(S:FS)OTU(Pump_Cmd)`, `XIC(S:FS)MOV(0,State)`.

## Real world
- **Studio 5000:** S:FS. Logix keeps every tag's value through power loss.
- **CCW (Micro800):** `_SYSVA_FIRST_SCAN`. Variables are **not** kept through power loss unless marked Retain.
- The game simplifies prescan to these instructions; real Logix prescan also covers JSR, subroutines and more.
