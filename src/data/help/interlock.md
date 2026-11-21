# Interlocks
An interlock stops two things from happening together. The classic one is forward and reverse: each contactor's coil runs through the **other** contactor's NC auxiliary contact, so once one is in, the other can't pull in.

`... NC(KM2) COIL(KM1)` and `... NC(KM1) COIL(KM2)`

## Real world
- Reversing starters also have a **mechanical interlock**: a lever that physically blocks one contactor while the other is closed. Use both.
- An electrical interlock relies on contacts behaving. Mirror (force-guided) contacts and safety relays exist for the case where a contactor welds.
- In a PLC, an interlock in ladder is a convenience. The hardwired one stays. See [[hardwired-safety]].
