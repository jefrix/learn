# TON: Timer On Delay
While its rung is true, a TON counts `.ACC` up in **milliseconds**. When `.ACC` reaches `.PRE`, it sets `.DN` and stops. When the rung goes false, it **resets**: ACC = 0, and EN, TT, DN all go to 0.

- `.EN` (enabled): the rung is true.
- `.TT` (timer timing): the rung is true and it hasn't finished.
- `.DN` (done): ACC reached PRE.

`TON(Prime_Tmr,5000,0)` is a 5-second delay. Use `XIC(Prime_Tmr.DN)` to act on it.

Two TONs that reset each other make a repeating pulse, like the press's KT1.

## Real world
- In **Studio 5000** the TIMER tag holds PRE and ACC as DINT milliseconds, up to about 24 days.
- In **CCW**, TON is an IEC function block: **IN** (enable), **PT** (preset, a TIME like `T#5s`), **Q** (done), **ET** (elapsed). There's no .DN; use Q.
- Our press's KT2 run-on is an on-delay too. See [[on-delay]].
