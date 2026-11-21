# Dry contacts
A **dry contact** is a plain switch contact with no voltage of its own; whatever is connected supplies the voltage. Our press's field terminals on sheet 6 are dry contacts rated AC 220 V or DC 24 V, 2 A:

- **18/41 in:** a plant PLC closes a contact here to start the press in Remote.
- **P1-P2 out:** remote enabled (KA3). **P1-P3:** running. **P1-P4:** fault (KA20 to KA24).

So a plant PLC supplies its own 24 VDC to P1 and reads P2 to P4 on its inputs.

## Real world
- A PLC output that drives a panel input usually goes through an **interposing relay**, so the PLC and the panel's control voltage stay separate.
- Check whether the PLC input card is sinking or sourcing before wiring a dry contact to it.
- P4 is labeled "Mouse Fault" on the drawing, which looks like a translation slip for "general fault".
