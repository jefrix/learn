# The scan cycle
A PLC runs its program over and over. Each pass is a **scan**:

- **Read inputs.** Every input terminal is copied into the **input image**. The program sees that snapshot, not the live wire.
- **Solve the rungs**, top to bottom, left to right. Bits written by one rung are seen by every rung below it in the same scan.
- **Write outputs.** The **output image** goes to the output terminals.

Then it starts again, typically every few milliseconds.

## Try it
Pause the machine and press **Step scan**. Each press moves one phase: inputs read, one rung solved, outputs written, then the machine acts.

## Real world
- **Micro800** (Connected Components Workbench) works this way: inputs, program, outputs.
- **ControlLogix and CompactLogix** (Studio 5000) update I/O **asynchronously**, on each module's RPI (requested packet interval), so an input tag can change partway through a scan. If a routine needs a stable snapshot, copy the inputs into internal tags at the top.
- See [[rung-order]] for why the order of rungs matters.
