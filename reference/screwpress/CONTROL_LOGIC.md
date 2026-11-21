# PJDL-302 screw press: control logic summary

A plain-text summary of AmeriPro's real screw press panel, condensed from `guide.html` and `notes.html` (read from the six wiring sheets in `drawings/`, the photos in `photos/`, and the maker's manual). Use it as source material for the relay-logic and PLC missions. Items marked **(unconfirmed)** are best readings that haven't been checked on the machine.

The panel is **pure relay logic**: no PLC inside. It does accept a plant PLC through dry-contact terminals (see Field connections).

## Machine
- Two-shaft multi-disc screw press for restaurant fats, oils and grease (F.O.G.), plus a companion solid-liquid separator on the same panel.
- Supply 230 V 60 Hz. Two 0.75 kW screw motors on Schneider ATV320 drives (U1, U2), speed set by door pots R1 and R2.
- Process path: sludge pump → metering tank → mixing tank (polymer added, mixer forms flocs) → two screw barrels → cake out the top, filtrate out the bottom. A solenoid valve sprays wash water on the rings.

## Device tags
| Tag | Device |
|---|---|
| QF1–QF4 | Breakers (cabinet stickers are shifted from the drawing; see guide) |
| SB1 | E-stop (breaks the control circuit only; drives and Power lamp stay powered) |
| SB2 | Wash valve pushbutton (fires Y1 by hand) |
| SB3 / SB4 | Auto start / Auto stop |
| SA1 | Local / Remote selector |
| SA2 | Manual / Stop / Auto selector for the press |
| SA4, SA5, SA6 | Mixer, sludge pump, dosing pump OFF/ON (Manual only) |
| SA7 | Screw forward/reverse (normal running is one direction only) |
| SA8 | Separator Manual / Stop / Auto |
| SA9 | Separator Manual / Stop / Remote |
| SA10 | Vibrator Manual / Stop / Auto |
| SA11, SA12 | Drive 1 / drive 2 OFF/ON (active in Manual **and** Auto) |
| KA5 | Auto run latch relay |
| KA3 | Remote-enabled relay |
| KA20, KA21 | Drive 1 / drive 2 fault relays (from drive relay contacts R1B/R1C) |
| KA22–KA24 | Press motor fault relays; KA25, KA26 separator faults |
| KA1, KA10 | Relays shown feeding the press and separator control circuits, but **missing from the rail with no coil on any sheet (unconfirmed)** |
| KM11, KM12 | Screw motor fan contactors; also send the run command to drives U1/U2 |
| KM2 | Mixer contactor (overload FR2, 2.5–4 A) |
| KM3 | Sludge pump contactor (overload FR3, 12–18 A) |
| KM4 | Dosing (polymer) pump contactor (overload FR4, 4–6 A) |
| KM5 | Separator main motor, 4 kW, direct start (overload FR5, 12–18 A) |
| KM6 | Separator submersible sewage pump (overload FR6, 5.5–8 A) |
| KM7 | Separator vibrator |
| KT1 | Wash timer: pulses Y1 about 30 s every 10 min while either screw runs (manual factory setting 25 s / 15 min, 20 s minimum) |
| KT2 | Run-on timer after Auto stop. Dial reads 30 min; manual says about 5 min **(unconfirmed)** |
| KT3 | Vibrator timer: pulses KM7 about 2 s each hour |
| LVS1 | Level relay with electrode rods in the mixing tank (Auto branch only) |
| LVS2 | Separator level relay, rods E4–E6 **(tank unconfirmed)** |
| Y1 | Wash-water solenoid valve |
| H1 | Power lamp (wired after QF1, so lit even with E-stop pressed) |
| H-series | Fault lamps for each motor and drive |

## Behavior (from the drawings)
**Modes.** SA2 at Manual: SA4/SA5/SA6 run the mixer and pumps directly. SA2 at Auto with SA1 at Local: pressing SB3 latches KA5, which runs the mixer, sludge pump and dosing pump, and the screws. SA1 at Remote: a plant PLC contact on terminals 18/41 starts and stops the press instead of SB3/SB4.

**Drive switches still matter in Auto.** SA11 and SA12 sit after the point where the Manual and Auto paths join, so a drive switched off stays off in Auto (the manual claims otherwise).

**Auto stop is not an instant stop.** SB4 drops KA5: feed, polymer and mixer stop at once. The screws stay latched through their own contacts until KT2 times out, to clear the barrel. Turning SA2 out of Auto appears to skip this and stop the screws at once, leaving sludge inside.

**Level control.** In Auto, LVS1's electrode rods stop and restart the sludge pump to hold the mixing tank level. LVS1 is only on the Auto branch, so Manual feed has **no high-level cutoff**. Sludge buildup on the rods can give a false full reading.

**Low-tank floats.** Terminals 31/32 (sludge tank low) are in series with the sludge pump; 36/37 (polymer dissolving tank low) are in series with the dosing pump only. Yellow jumpers appear to bridge both **(unconfirmed)**, so the pumps would run with no dry-run protection.

**Known safety gap.** An empty polymer tank or a tripped dosing pump (FR4) stops only KM4. The sludge pump keeps running, so raw, undosed sludge goes into the press. A low float gives no lamp or signal at all. This is a natural thing for a PLC to fix: stop the feed and raise an alarm.

**Faults.** Each overload trip drops only its own contactor and lights its fault lamp. A drive fault (KA20/KA21) blocks only that screw; the other screw, feed and polymer keep going. All fault relays close a shared fault output to P4.

**Separator.** In Auto, the pump KM6 runs only while the main motor KM5 runs and LVS2 allows it, so the screw is turning before liquid arrives. KT3 pulses the vibrator.

**Reset procedures.** Overload: set SA2 to Stop first (the machine could restart when the relay resets), fix the cause, press the blue RESET on the overload, return to mode. E-stop: set SA2 to Stop, twist to release, fix, restart. Drive fault: set SA2 to Stop, fix, reset the drive, restart.

## Field connections (sheet 6)
Panel output contacts are dry contacts rated AC 220 V or DC 24 V, 2 A, so the PLC supplies its own signal voltage.

| Terminals | Direction | Meaning | Closed by |
|---|---|---|---|
| 18 / 41 | In | Press remote start from a plant PLC | PLC contact, with SA1 on Remote |
| 55 / 56 | In | Separator remote start | PLC contact |
| 31 / 32 | In | Sludge tank low level | Float, in series with sludge pump |
| 36 / 37 | In | Dissolving tank low level | Float, in series with dosing pump |
| P1–P2 | Out | Press remote enabled | KA3 |
| P1–P3 | Out | Press running | KM11 KM12 KM2 KM3 KM4 |
| P1–P4 | Out | Press fault | KA20–KA24 |
| P1–P5 | Out | Separator remote enabled | KA13 |
| P1–P6 | Out | Separator running | KM5 KM6 |
| P1–P7 | Out | Separator fault | KA25 KA26 |

## Using this in the game
- Good relay missions: trace the Auto start latch (SB3 → KA5); find why a screw won't run in Auto (SA11/SA12 off); explain why the screws keep running after Auto stop (KT2 run-on); spot the Manual-mode overfill risk.
- Good PLC missions: rebuild the press's Auto sequence in Allen-Bradley-style ladder, then **improve on it**: stop the feed and raise an alarm when the polymer tank goes low or FR4 trips, add a high-level cutoff in Manual, and drive the P-terminal status outputs.
- Simplify freely for gameplay, but don't teach anything here as a safe practice on the real machine. Lockout/tagout, hardwired E-stops and an electrician's review still apply.
