# Fail-safe wiring
Ask: **if this wire breaks, what happens?** A broken wire looks exactly like an open contact.

- A Stop button wired through a **NC** contact: a broken wire opens the circuit, and the machine stops. Fail-safe.
- A Stop wired through a **NO** contact would have to close to stop. A broken wire means Stop does nothing. Not fail-safe.

The same goes for limit switches, floats that stop a fill, and guard switches.

## Try it
Every start/stop mission has a test that breaks the Stop wire. Only a fail-safe design passes.

## Real world
- In a PLC, a NC stop button reads **ON** when it's healthy and not pressed. So the ladder examines it with [[xic]] (true when ON). Using [[xio]] on a NO stop button looks the same on screen but fails dangerous when the wire breaks.
- Alarms have a fail-safe version too: a relay energized while healthy, so a broken wire raises the alarm.
- Fail-safe wiring is good practice, but it isn't a safety rating. Safety functions need [[hardwired-safety]].
