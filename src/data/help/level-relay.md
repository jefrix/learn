# Level relay and electrodes (LVS)
A conductive level relay (like our press's FLR-202C, tagged **LVS1**) passes a small current through the liquid between electrode rods. A common rod E1 sits low; E2 marks the low level and E3 the high level.

In fill mode, the relay **calls for fill** when the liquid drops below E2 and stops at E3. Between the rods it keeps doing what it was doing.

## Try it
In mission 1.14, use **Sludge bridges the high rod** to see a fouled electrode.

## Real world
- Sludge or grease bridging the rods makes the relay read **wet when it's dry**. On the press, that stops the feed with the tank not full; the manual lists it as a cause of a stopped pump. Clean the rods on a schedule.
- Electrode relays only work on conductive liquids.
- On our press LVS1 is only in the **Auto** branch, so Manual feed has no high-level cutoff.
- Which rod does which job on our press is a best reading, not confirmed.
