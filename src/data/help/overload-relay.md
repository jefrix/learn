# Overload relay (FR)
An overload relay protects a motor from overheating. It measures motor current; if the current stays too high for too long (a jam, a failing bearing, a lost phase), it **trips**. Tripping only moves its own small contacts:

- **95-96 (NC)** opens. Wire it into the contactor's coil circuit so the contactor drops out.
- **97-98 (NO)** closes. Use it for a fault lamp or a PLC input.

A tripped overload has to cool before its blue RESET button will reset it.

## Try it
In mission 1.6, the overload trips but does nothing until you wire 95-96 into the coil rung.

## Safety
If an overload is set to **auto reset**, a two-wire motor can restart by itself after cooling. Keep it on manual reset and see [[stop-before-reset]].

## Real world
Our press: FR2 mixer (2.5 to 4 A), FR3 sludge pump (12 to 18 A), FR4 dosing pump (4 to 6 A). Set the dial to the motor's full-load amps from its nameplate. The game's trip after a few seconds of jam is much faster than a real thermal overload.
