# Where Control Room simplifies

The game tries never to teach something false. Where it simplifies, it says so here and in the mission's Real-world card.

## Relay logic
- **Relays settle instantly.** Real relays take 10 to 20 ms to pick up and their contacts bounce, so circuits that depend on pickup races behave differently. The solver repeats until nothing changes and flags a circuit that never settles as chatter.
- **Loads go straight to N.** A coil, lamp or valve must be the last thing in its line. Real circuits sometimes put contacts on the neutral side; the game doesn't.
- **One control voltage per drawing.** The press runs 230 VAC; small machines 120 VAC; PLC I/O 24 VDC. The meter just reports "voltage" or "0 V"; there are no voltage drops, ground faults or induced voltages.
- **Overloads trip after a few seconds of jam**, far faster than a real thermal overload's trip curve. They have to cool for 3 s before they reset.
- **Timers** are ideal. The DH48S-style cycle timer starts with its OFF time; check the real timer's manual.
- **Faults** are clean: a broken wire is fully open, a welded contact fully closed. Real faults can be intermittent or high-resistance.
- **Meter use** in a live panel is shown without PPE or approach limits. In real life, only qualified people test live, under NFPA 70E.

## The PJDL-302 press
The press drawing is a **simplified redraw** of sheets 3, 4 and 6, turned into horizontal rungs. Best readings, not confirmed:
- **KA1 and KA10** are missing from the rail; the game treats wire 2 to 12 as closed.
- **KA4** is modeled as an Auto relay whose changeover contacts keep the Manual and Auto legs from feeding each other. Its contacts can't be read reliably from the photo of sheet 4. As drawn, wire 33 seems to join both pump branches above the KA4 contacts; if that's right, SA5 or SA6 alone might run both pumps in Manual. The game gives each pump its own KA4 contact below wire 33. **Have an electrician check this.**
- **KT2** defaults to 5 minutes (the manual's factory setting); the dial reads 30.
- **The float jumpers** (31/32 and 36/37) are modeled as working floats; mission 1.7b covers what a jumper does. The tags LS1 and LS2 are made up.
- **Drive faults** light their lamp and pull in KA20/KA21 only on a fault. The real ATV320 wiring uses R1B/R1C and may show a fault whenever the drive is unpowered.
- **H10** and the separator (SA8 to SA10, KM5 to KM7, LVS2, KT3) are left out.
- **Process physics** are rough: flow rates, tank sizes and the screw throughput are made up to make the level control visible. Polymer dosing is only "on or off"; there is no floc quality model.
- The **wash valve, Y1,** is drawn as a valve from city water; its real piping isn't modeled.

## PLC ladder
- **Scan model.** Inputs are read at the start of each scan and outputs written at the end. That matches Micro800. ControlLogix and CompactLogix update I/O asynchronously on each module's RPI.
- **One scan per sim tick** (50 ms by default, 100 ms in some long tests). Real scans are a few milliseconds, so timer accuracy here is ±1 tick.
- **Instruction set.** XIC, XIO, OTE, OTL, OTU, ONS, TON, TOF, RTO, CTU, CTD, RES, EQU, NEQ, GRT, LES, GEQ, LEQ, MOV, ADD, SUB, plus MUL and DIV (added for analog scaling). No JSR, routines, tasks, arrays, user-defined types, strings, SINT/INT, or PID.
- **Timers** clamp ACC at PRE when done, and the first true scan starts timing without adding time, as Logix does.
- **Divide by zero** leaves the destination unchanged and records a minor fault. Logix's exact result and fault bits differ by data type.
- **Overflow** wraps DINTs and records a minor fault; there's no S:V or S:MINOR status tag to read.
- **Prescan** covers OTE, ONS, TON, TOF, RTO, CTU and CTD only.
- **Power loss** keeps every tag's value, like Logix. Micro800 doesn't retain variables unless they're marked Retain; the help cards say so.
- **Tags** are created automatically from use (BOOL, TIMER, COUNTER, DINT); REALs must be declared. Studio 5000 makes you create every tag.
- **Verify** catches unknown instructions, missing operands, type mismatches and writes to inputs, and warns about duplicate OTE. It doesn't do everything Studio 5000's Verify does.
- **Online edits** take effect immediately with tag values kept. Real online editing has accept/test/assemble steps.
- **Analog inputs** are read as REAL milliamps or as engineering units "scaled by the card", with no ADC resolution or filtering.
- **Forcing** exists only as a test fault that forces every output on.

## MWTP filter skid
- **One UF train** instead of two, so filtering stops during backwash. The real MWTP-250 keeps the other train producing.
- No integrity test, UV, chlorination, CT tracking, Fill & Prove step, break-tank level control, or clearwell control. Turbidity and TMP are set by hand or by a simple fouling rate.
- K-SAFE is reduced to one relay fed by the E-stop and a PLC-healthy signal.
- The reference documents differ on a few numbers (backwash 45 s in the P&ID, 40 s in an electrical note; chlorine low trip 0.8 vs 0.5 mg/L). The game uses the P&ID's 45 s sequence and 0.15 NTU for 5 s divert.
