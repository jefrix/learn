# Hardwired safety vs. PLC logic
A PLC is a computer. It can crash, be programmed wrong, have an output fail on, or be forced by someone online. So the things that keep people safe are **hardwired**:

- E-stops and guard switches drop power to the motors through relays or a safety relay, whatever the PLC is doing.
- The PLC can **read** the E-stop's state, raise alarms, and stop things in order. It must not be the only thing stopping them.

## Try it
In Chapter 2, every machine keeps its E-stop in a locked hardwired circuit. A commissioning test forces every PLC output on and checks that the E-stop still drops the contactors.

## Real world
Safety functions are designed to standards (ISO 13849, IEC 62061) with safety-rated parts or a **safety PLC** such as GuardLogix. A regular PLC is not a safety device. The MWTP trailer's design uses a hardwired safety relay (K-SAFE) so the divert valve fails to waste even if the PLC faults.
