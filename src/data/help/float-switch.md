# Float switch (LS)
A float switch changes its contact when liquid lifts it. In this game a float is **actuated when the liquid is at or above it**: its NO contact closes, its NC contact opens.

Two floats make a fill (or pump-down) band: start at one, stop at the other, and use a [[seal-in]] to remember the state in between.

## Real world
- Floats come wired NO or NC, and some can be flipped. Check the datasheet.
- Grease and debris make floats stick. Critical tanks get a second, independent high-level switch.
- Our press has low floats on terminals 31/32 (sludge tank) and 36/37 (polymer tank) that **may be jumpered out** (unconfirmed). See [[jumpers-and-bypasses]]. The game's tags LS1 and LS2 are made up; the drawing shows only terminal numbers.
