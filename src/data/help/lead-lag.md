# Lead/lag pumps
A duplex station has two pumps:

- The **lead** pump starts at the normal start level and runs to the stop level.
- If the level keeps rising to a higher setpoint, the **lag** pump joins in.
- After each cycle, lead and lag **swap** (alternate) so both pumps wear evenly and a seized pump gets noticed.
- If one pump faults, the other takes over as lead.

Alternation is a toggle on the end-of-cycle one-shot, the same pattern as a one-button start/stop. See [[ons]].

## Real world
Real stations add: a hardwired high-level float that runs a pump even with the PLC down, run-time and start counts per pump, a fail-to-run check (motor running but no flow), and call-out alarms.
