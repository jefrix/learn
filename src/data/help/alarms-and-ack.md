# Alarms with acknowledge
A good alarm tells someone, stays visible until they've seen it, and doesn't nag after they have.

A simple pattern:

- **Condition:** `GEQ(Level_In,102)OTE(High_Level)`.
- **Unacknowledged:** latch it on the rising edge: `XIC(High_Level)ONS(High_OS)OTL(Alarm_Unack)`.
- **Ack:** `XIC(Ack_PB)OTU(Alarm_Unack)`.
- **Horn** while unacknowledged; **lamp** while the condition is active **or** unacknowledged.

So an alarm that clears by itself still waits for someone to acknowledge it, and an acknowledged alarm stays lit until the problem is gone.

For alarms that must also **block** something (like the press feed), latch a separate block bit and clear it only when the condition is gone **and** acknowledged.

## Real world
- **ISA-18.2** describes alarm states (unacknowledged, acknowledged, returned to normal) and good alarm management.
- **Studio 5000** has built-in **ALMD** (digital) and **ALMA** (analog) alarm instructions that HMIs can read directly.
