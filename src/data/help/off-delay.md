# Off-delay timer
An off-delay timer's contacts change **immediately** when the coil is energized, and change back a set time **after** the coil drops. Re-energizing the coil before then cancels the timing.

Typical use: a cooling fan that keeps running after a motor stops.

In this game: `TMR(KT1,off,120)`.

## Real world
- Some electronic off-delay timers need a separate supply to keep timing after the coil drops; "true off-delay" types don't. Check the wiring diagram.
- In PLC ladder this is a [[tof]].
