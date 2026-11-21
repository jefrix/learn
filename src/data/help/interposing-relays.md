# Interposing relays
An **interposing relay** sits between a PLC output and whatever it drives. The PLC's 24 VDC output energizes the relay coil; the relay's dry contact switches the other circuit.

Why:
- Keeps a different voltage (like our press's 230 VAC control) off the PLC card.
- Gives a contact rated for the load.
- Makes a clean dry contact for another panel's input, like the press's terminals 18/41.

## Real world
- Put a suppression diode or RC snubber across relay coils and contactor coils.
- Label the relay with the PLC address it's driven from, so the next tech can trace it.
- See [[dry-contacts]] for the press's P1 to P7 status contacts.
