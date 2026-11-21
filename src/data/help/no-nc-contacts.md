# NO and NC contacts
A contact is a switch inside a device. **Normally open (NO)** contacts are open at rest and close when the device is actuated: a button pressed, a relay coil energized, a float lifted. **Normally closed (NC)** contacts are the opposite: closed at rest, open when actuated.

"Normal" means the **shelf state**: no one touching it, no power on. Drawings always show contacts that way, whatever the machine is doing.

## Try it
In mission 1.1, hold SB1 and SB2 and watch which lamp each one turns on or off.

## Real world
- On control relays, NO contacts are often numbered 13-14, 23-24; NC contacts 11-12, 21-22. Overload contacts are 95-96 (NC) and 97-98 (NO).
- IEC drawings (like our press sheets) draw contacts vertically with a slanted blade; the NFPA style used in this game draws `-| |-` and `-|/|-`.
- In PLC ladder, the same idea becomes [[xic]] and [[xio]], but those examine a **bit**, not a physical contact. See [[fail-safe]].
