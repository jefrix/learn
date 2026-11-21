# Cycle (repeat) timer
A cycle timer switches its contact off and on in a repeating pattern while its coil is energized: OFF for one time, ON for another, over and over.

In this game, `TMR(KT1,cycle,600,30)` is off 600 s, on 30 s, repeating, starting with the OFF time.

## Real world
Our press's **KT1** is a BERM DH48S-S cycle timer. Its dial reads 30 s / 10 min; the manual's factory setting is 25 s every 15 min, 20 s minimum. It pulses wash valve Y1 while either screw runs. Check the real timer's manual for whether it starts with the ON or the OFF time. In a PLC, two [[ton]] timers that reset each other do the same job.
