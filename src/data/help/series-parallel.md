# Series and parallel
**Series:** contacts one after another. Current has one path, so every contact has to be closed. That's AND.

**Parallel:** contacts side by side on a branch. Current can take any closed path. That's OR.

Rule of thumb for motor control: **stops in series, starts in parallel.** Any stop opens the only path; any start (or the seal-in) gives a way through.

## Real world
In PLC ladder it's the same picture: instructions in series are AND, branches are OR. See [[xic]].
