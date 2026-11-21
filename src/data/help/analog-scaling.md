# Analog scaling (4-20 mA)
A 4-20 mA transmitter sends **4 mA at the bottom** of its range and **20 mA at the top**. To get engineering units:

`value = (mA − 4) × (high − low) / 16 + low`

For a 0-120 in level: `(mA − 4) × 7.5`.

- Do the math in **REAL** tags. DINT math rounds away the decimals.
- **Live zero:** a healthy loop never reads 0 mA, so a broken wire is detectable. NAMUR NE 43 treats below 3.6 mA or above 21 mA as a failure.

## Real world
- Many analog cards scale for you: in **Studio 5000**, set the channel's low and high engineering values; in **CCW**, configure the **Micro800 analog plug-in**. Some cards report raw counts (like 0-32767) instead of mA; then you scale from counts.
- **Studio 5000** also has **SCP** (scale with parameters) and **CPT** (compute).
- Check where the transmitter's zero sits relative to the tank bottom, and whether the liquid's density matches its calibration.
