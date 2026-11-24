# Rules of thumb
The rules every controls tech leans on, and why each one exists. Read this before the first work order. Every rule with a live example is one you can press and break right here: push the buttons on the machine, and use the **Break** buttons to see what fails safe and what doesn't.

## Part 1: Reading a rung {#reading}

### 1. Power flows from L1 to N, left to right {#flow}
A rung is a path from the hot rail **L1** on the left to the neutral rail **N** on the right. Contacts are gates along that path. If every gate on the path is closed, current flows and the load at the right end turns on. In the game, a live path glows green.

**Why it matters:** troubleshooting is just following that path. If the load is off, somewhere between L1 and the load there's an open gate. See [[reading-a-schematic]].

### 2. One load per rung, at the right end {#one-load}
Every rung needs exactly one load (a coil, timer coil, lamp, solenoid or horn) as the last thing before N. Contacts go to its left.
- **Never two loads in series.** Two 120 V coils in series share the voltage, about 60 V each, and neither pulls in properly. Give each load its own rung.
- **Never a rung of only contacts.** With no load, closing the contacts connects L1 straight to N: a dead short that blows the control fuse.
- **Switch the hot side.** Real codes put the contacts on the L1 side and connect the load straight to N, so an open contact leaves the load dead, not sitting live.

### 3. Contacts are drawn at rest {#shelf-state}
Drawings show every contact in its **shelf state**: no one pressing it, no power on. A **NO** (normally open) contact is drawn open and closes when its device acts. A **NC** (normally closed) contact is drawn closed and opens when its device acts. A relay's contacts act when its coil is energized. See [[no-nc-contacts]].

### 4. Series means AND, parallel means OR {#series-parallel}
Contacts **in series** (one after another) all have to be closed: A **and** B. Contacts **in parallel** (side by side on a branch) need only one closed: A **or** B. Almost every control circuit is built from these two ideas. See [[series-parallel]].

{{demo:series-parallel}}

## Part 2: Start and stop {#start-stop}

### 5. Stops in series, starts in parallel {#stops-series}
With more than one station, **any** Stop must be able to stop the machine and **any** Start must be able to start it.
- Each Stop has to break the path by itself, so Stops go **in series**: the path needs Stop A **and** Stop B closed.
- Each Start has to make the path by itself, so Starts go **in parallel**: Start A **or** Start B.

**If you get it backwards:** Stops in parallel means pressing one Stop does nothing, because current flows around it through the other. That's a machine nobody can stop from the far station.

{{demo:two-stations}}

### 6. Stop buttons are NC, Start buttons are NO {#nc-stops}
A Stop is wired **normally closed**, so the machine runs only while current flows through it. Pressing it opens the path. So does a broken wire, a loose terminal or a burned contact.

**Why:** a fault on a NC stop looks exactly like someone pressing Stop. The machine stops, which is the safe direction. If a Stop worked by *closing* a circuit, a broken wire would make it silently do nothing, and you'd only find out when you needed it. This idea is called **fail-safe** design. See [[fail-safe]].

A Start is **normally open** for the same reason: if its wire breaks, the machine just won't start. Annoying, but safe.

In the example above, press **Break: wire to Stop A**. The fan stops and won't restart until it's fixed. Then try **Break: wire to Start B**: station A still works, and nothing starts by itself.

### 7. A momentary Start needs a seal-in {#seal-in}
A pushbutton only stays closed while you hold it. To keep a motor running after you let go, put a **NO contact of the motor's own contactor in parallel with Start**. Once the contactor pulls in, its contact holds the circuit closed by itself. See [[seal-in]].
- The seal-in goes **around the Start only**, never around the Stop. If it also bypassed the Stop, pressing Stop would do nothing.
- In the example above, the fan's own KM1 contact sits on the Start branch. Press Start, let go, and watch KM1 keep the rung live.

### 8. Momentary controls don't restart after a power loss {#no-restart}
A sealed-in circuit drops out when power fails and **stays out** when power comes back. Someone has to press Start again. That's deliberate: a machine that restarts by itself when the lights come back on can hurt the person working on it. This is called **three-wire** control.

Maintained controls, like a selector switch or a float, are **two-wire** control: they restart the load as soon as power returns. Use them where an automatic restart is safe and expected, like a sump pump. See [[two-wire-three-wire]].

Try it: in the two-station example, start the fan, then press **Power off** and **Power on**. The fan stays off.

## Part 3: Protection {#protection}

### 9. Interlock anything that must never run together {#interlock}
Forward and reverse contactors on the same motor must never close at the same time: that's a phase-to-phase short. Put a **NC contact of each contactor in series with the other's coil**. While Forward is pulled in, its NC contact holds Reverse open, and the other way around. See [[interlock]].

Real reversing starters add a **mechanical interlock** too, so even a welded contact can't let both close.

{{demo:interlock}}

### 10. An overload's NC contact goes in series with the coil it protects {#overload}
An overload relay (FR) watches motor current. When it trips, its NC contact opens and drops the contactor. See [[overload-relay]].

**Before you press Reset, turn the mode switch to Stop or Off.** If the circuit is two-wire, the motor restarts the moment the overload resets, with your hands near it. And find out *why* it tripped first: a jam, a bad bearing, a low voltage. Resetting over and over burns the motor. See [[stop-before-reset]].

### 11. The E-stop is hardwired and it isn't lockout {#e-stop}
An emergency stop is a red mushroom NC button that drops everything it controls, wired directly in the control circuit, not through a program. It is **not** an isolation point: on our screw press it breaks only the control circuit, and the drives and the Power lamp stay powered. Before hands go into a machine, **lock out and tag out** the disconnect. See [[e-stop]], [[lockout-tagout]] and [[hardwired-safety]].

### 12. Never jumper out a protection to make it run {#jumpers}
A jumper across a float, overload, interlock or door switch gets the machine running and hides the protection that stopped it. On our press, jumpers across the low-level float terminals would let the pumps run dry. If a protection keeps stopping the machine, fix the cause or the device. See [[jumpers-and-bypasses]].

## Part 4: Timers, levels and troubleshooting {#timers}

### 13. Pick the timer by asking when the delay happens {#which-timer}
- **On-delay:** the delay is **before** the output turns on. Hold the input on for the preset time, and the timer's contacts change. Drop the input and they change back at once. Use it for "wait 5 seconds after start, then open the valve". See [[on-delay]].
- **Off-delay:** the output turns on **at once**, and the delay is **after** the input drops. Use it for "keep the screws running 5 minutes after the feed stops". See [[off-delay]].
- **Cycle timer:** pulses on a schedule, like "spray 30 seconds every 10 minutes". See [[cycle-timer]].

In the game, a timer coil is written `TMR(KT1,on,5)`: tag, kind (`on`, `off` or `cycle`), then seconds.

### 14. Level control needs a gap between start and stop {#level-gap}
A pump that fills or empties a tank should **start at one level switch and stop at the other**, and keep running while the level travels between them. That gap (called the deadband) is what stops it short-cycling on and off every few seconds, which wears out contactors and motors. Something has to remember that the pump is running while the level falls between the two switches. Rule 7 tells you what that something is. See [[float-switch]] and [[level-relay]].

### 15. Troubleshoot from L1 toward the load {#meter}
With the **Meter**, tap points along the dead rung starting at L1. Every point that reads voltage has a good path back to L1. The fault is between the **last point with voltage** and the **first point without**. That's faster and safer than swapping parts. See [[troubleshooting-with-a-meter]] and [[live-work]].

## Part 5: PLC ladder (Chapter 2) {#plc}

### 16. The PLC reads, solves, then writes {#scan}
A PLC repeats one cycle, many times a second: **read every input**, **solve the rungs top to bottom**, **write every output**. Nothing reaches the real outputs until the whole program has been solved. Use **Step scan** in Chapter 2 to watch it happen. See [[scan-cycle]].

### 17. XIC and XIO ask about the bit, not the button {#xic-xio}
**XIC** (examine if closed) is true when the bit is **1**. **XIO** (examine if open) is true when the bit is **0**. They describe the bit in memory, not how the button is wired.

A Stop button is still wired NC (rule 6), so its input bit is **1** while nobody presses it. To run while Stop is not pressed, you examine it with **XIC**. Using XIO for a NC stop is the classic beginner mistake: the logic comes out inverted. See [[xic]] and [[xio]].

### 18. One output instruction per bit {#one-ote}
Each **OTE** writes its bit every scan, so if two rungs drive the same tag, **the last rung wins** and the first one is ignored. Put all the conditions for an output on **one rung**, with branches for the OR parts. See [[duplicate-outputs]] and [[ote]].

### 19. Rung order matters {#rung-order}
Because rungs are solved top to bottom, a bit set on rung 5 isn't seen by rung 2 until the next scan. Usually that's harmless, but it can cause one-scan glitches and odd timing. Write logic in the order it should happen. See [[rung-order]].

### 20. Seal in motors; be careful with latches {#latches}
Use **XIC / OTE with a seal-in branch** for motors, just like relays. **OTL / OTU** (latch and unlatch) keep their state through a power loss, so a latched motor can restart by itself when the PLC powers up. If you use a latch, unlatch it on the first scan with `S:FS`. See [[otl-otu]] and [[prescan-first-scan]].

### 21. Do something once per press with ONS {#ons}
A button held for half a second is true for hundreds of scans. If an action like `ADD` or `MOV` should happen **once per press**, put an **ONS** (one-shot) in front of it. Counters (CTU) already count only the moment the input turns on, so they don't need one. See [[ons]].

### 22. Timers count in milliseconds {#timer-ms}
In Allen-Bradley Logix, a TON or TOF preset is in **milliseconds**: 10 seconds is `10000`. A timer's `.DN` bit is the one you usually examine. See [[ton]] and [[tof]].

### 23. Safety stays hardwired; the PLC watches {#plc-safety}
E-stops, overloads and safety interlocks stay in hardwired circuits that work with the PLC switched off. A standard PLC can **monitor** them, raise alarms and log faults, but it isn't rated to be the safety device. See [[hardwired-safety]] and [[auto-restarts]].

### 24. Name tags for what they mean {#tag-names}
`Polymer_Low` and `Feed_Pump_Run` explain themselves. `B3:0/4` doesn't. Good names make the next person's troubleshooting, and yours in six months, much faster. See [[tags-and-types]].
