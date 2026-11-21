# XIO: Examine If Open
`-]/[-` is **true when its bit is 0**. Rung-condition-out = rung-condition-in AND NOT the bit.

Use it for "this must NOT be happening": `XIO(Fault)`, `XIO(Tmr.DN)`, `XIO(Other_Pump_Running)`.

## Watch out
Don't use XIO on a stop button to "make it act normally closed". If the button is wired NO and you examine it with XIO, a broken wire looks like "not pressed" and the stop never works. Wire stops NC and examine them with [[xic]]. See [[fail-safe]].

## Real world
- **Studio 5000:** XIO. **CCW (Micro800):** a **reverse contact**.
