# Control relay (KA)
A control relay is a small relay used for logic: a coil and a few NO and NC contacts, switching only control signals. Our press uses Schneider RXM relays on a DIN rail: KA3 remote enabled, KA4 Auto, KA5 the Auto run latch, KA20 to KA26 fault relays.

## Real world
- Relays take 10 to 20 ms to pick up, and contacts bounce. The game settles relays instantly, so races that depend on pickup time don't show here.
- A PLC replaces most control relays with internal bits. Relays stay where a circuit must work with no PLC (safety circuits) and for interposing between a PLC and field devices. See [[dry-contacts]].
