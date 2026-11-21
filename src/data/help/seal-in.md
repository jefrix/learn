# Seal-in (holding) circuit
A momentary Start button only closes while it's held. To keep a motor running after you let go, wire a NO contact of the motor's own contactor **in parallel with Start**. Once the coil pulls in, that contact closes and holds the coil in by itself. Stop, in series ahead of both, breaks the hold.

`NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1)`

A seal-in drops out on a power loss and stays out when power returns. That's a safety feature called **undervoltage protection**. See [[two-wire-three-wire]].

## Real world
- The contactor's auxiliary contact (13-14) does the sealing.
- In PLC ladder the same circuit uses [[xic]] and [[ote]], and it's the safest default. [[otl-otu]] latches behave differently after a power loss.
- On our press, KA5 seals itself in (mission 1.11), and the screws seal in through KM11/KM12 during the run-on.
