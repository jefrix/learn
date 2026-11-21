# On-delay timer
An on-delay timer's contacts change a set time **after** its coil is energized. If the coil drops before the time is up, it resets to zero.

- **NO timed-closed** contact: closes after the delay.
- **NC timed-open** contact: opens after the delay.

In this game, `TMR(KT2,on,300)` is a 300 s on-delay. Its `NO(KT2)` and `NC(KT2)` contacts change when it times out.

## Try it
Use the speed buttons: at ×60 a 5-minute timer takes 5 seconds.

## Real world
- Our press's **KT2** (a DH48S-2Z) is an on-delay used as a run-on: KA5's NC contact energizes it after Auto stop, and its NC contact drops the screws when it times out. Dial: 30 min. Manual: about 5 min.
- In PLC ladder this is a [[ton]].
