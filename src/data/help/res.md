# RES: Reset
`-(RES)-` clears a timer or counter when its rung is true.

- **Timer:** ACC = 0, and EN, TT, DN = 0.
- **Counter:** ACC = 0, and CU, CD, DN, OV, UN = 0.

## Watch out
Because RES also clears `.CU`, if a counter's count-up rung is still true on the next scan, it counts **again**. Reset counters with a condition that isn't also counting.

## Real world
- **Studio 5000:** RES.
- **CCW:** no separate instruction. Use the timer or counter block's own **RESET** input, or turn off its IN.
