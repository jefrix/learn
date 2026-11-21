# RTO: Retentive Timer On
Like [[ton]], except it **keeps** `.ACC` (and `.DN`) when its rung goes false. Time adds up across stops. Only a [[res]] clears it.

Typical uses: motor run hours, filter run time before a backwash, maintenance reminders.

## Real world
- **Studio 5000:** RTO. Its ACC is retained through a power cycle too.
- **CCW:** Micro800 has an **RTO** function block; check that its variables are set to Retain if the count must survive power loss.
- A DINT millisecond ACC tops out around 24.8 days. For real run-hour totals, roll minutes into a separate counter.
