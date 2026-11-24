# How to use Control Room
A ten-minute walk through the game, from the mission map to commissioning. There's a practice board near the end where you can try the editor without a work order. Then read [Rules of thumb](#/basics) before your first mission.

## What you're doing {#overview}
You're AmeriPro's new controls technician. Each **work order** is one of our machines: a truck's transfer pump, a lift station, the hood-wash rig, the screw press, a water treatment trailer. For each one you:
1. Read the brief and the work order.
2. Build or fix the control logic in the drawing.
3. Run the machine live: press its buttons, fill its tanks, break things.
4. Press **Commission**. The game runs its own tests on your logic and tells you, in plain English, what passed and what didn't.

There are three kinds of work order:
- **Build:** wire something new from the work order.
- **Callout:** something's broken in the field. Find the fault and fix it.
- **Investigate:** read an existing drawing, run it, and answer a question about how it behaves. Several of these use the real screw press panel.

## The mission map {#map}
The home page lists the chapters. **Chapter 1** is relay logic, **Chapter 2** is Allen-Bradley-style PLC ladder.
- Missions open in order. Commissioning one opens the next.
- The first mission of each chapter is always open, so you can start Chapter 2 without finishing Chapter 1.
- A card shows **✓ Commissioned**, **In progress** or **Locked**.
- To skip ahead, open **Save** at the top right and tick **Unlock every mission**.

## The mission screen {#screen}
{{img:mission}}

1. **Header.** **Brief** reopens the story. **Hint** gives one hint at a time, with **Another hint** for more. **Real world** explains how this shows up on real equipment. **Start over** puts the logic back how the mission started. **Commission** runs the tests.
2. **Sim controls.** The clock shows machine time. **Pause** and **Step** let you go slowly. **×1** to **×600** speed time up, so a 10-minute timer takes a second. **Power off** kills control power. **Meter** turns on the voltmeter (Chapter 1).
3. **The machine.** It's live and connected to your drawing.
4. **Work order.** What the job needs, a checklist of things to make happen, and sometimes **Break something** buttons or a question to answer.
5. **The drawing.** Your schematic (Chapter 1) or ladder (Chapter 2). Under it, the **inspector** shows the buttons for whatever you've selected.

## Running the machine {#machine}
- **Pushbuttons** are momentary, like real ones: they stay pressed while you hold the mouse button down.
- **To hold two buttons at once**, Shift+click one (or long-press it on a tablet). It stays held and shows **HELD**. Then press the other. Click the held one again to let go.
- **Selector switches** turn one position each click.
- **Tanks** can be dragged up or down to set the level, or use the arrow keys.
- **Overloads and drives** have a **RESET** button on the drawing of the machine.
- **A jammed pump** can be cleared by clicking it, once the machine is switched off.
- **The status line** under the machine reports events: a fuse blowing, a relay chattering, a short.

## Reading the drawing {#drawing}
- **L1** is the left rail and **N** the right. Each rung is a path between them.
- **Rungs are numbered from 0**, at their left end.
- **Green means live.** A wire or contact with power on it glows green, so you can watch power flow as you press buttons.
- **Yellow tags** (SB1, KM1, KT2) name the device each symbol belongs to, the same as the labels on the real panel.
- **Grey rungs** are locked: they're hardwired, or the mission wants you to read the drawing rather than change it.
- **Problems** with your wiring, like a rung with no load, are listed just above the drawing.

## Building a rung {#build}
1. **Select a rung** by tapping its number on the left. Yellow **+** circles appear at every place you can insert something. They only show on the selected rung.
2. **Tap a +**. Pick a part from the list: **NO contact**, **NC contact**, **Relay / contactor coil**, **Timer coil**, **Pilot lamp** and so on. Each mission only offers the parts it needs.
3. **Set its tag.** The tag box lists the devices on this machine. Pick one, or type it.
4. **Keep going** left to right, and finish with a load (a coil, lamp or solenoid) at the right end.
5. **+ Rung** in the toolbar adds a new empty rung.

**Select a part** by tapping it. The inspector offers **Help card**, **◀ Move** and **Move ▶**, **Delete**, and the branch buttons below.

**Select a rung** (tap its number) for **Move up**, **Move down**, **Add to end**, **Edit as text**, **Comment** and **Delete rung**.

**Undo** and **Redo** are in the toolbar, or use Ctrl+Z and Ctrl+Y.

## Branches: parallel paths {#branches}
A branch puts parts **side by side**, so either path can carry power.
- **Make a branch:** select a part and choose **Branch around it**. It gets a new empty leg underneath. Tap the **+** on that leg to fill it.
- **Add another leg:** select any part already in the branch and choose **Add leg to its branch**. Or tap the **small square** at the branch's left edge and choose **Add leg**.
- **Remove a branch:** tap the small square and choose **Delete branch**.

## Typing instead of clicking {#typing}
When the part list is open, you can also type in the **or type** box at the bottom of it, like `NO KM1` or `NC SB1`, and press Enter. **Esc** cancels.

**Text** in the toolbar (or **Edit as text** on one rung) shows the drawing as text, which is quicker for big changes:
- Contacts and loads are written `NO(SB2)`, `NC(SB1)`, `COIL(KM1)`, `LAMP(H1)`, `SOL(Y1)`.
- A branch is written in square brackets with its legs separated by commas: `[NO(SB2),NO(KM1)]`.
- A timer coil is `TMR(KT1,on,5)`: tag, kind (`on`, `off` or `cycle`), then seconds.
- Each rung ends with a semicolon.

So a whole start/stop rung is `NC(SB1)[NO(SB2),NO(KM1)]COIL(KM1);`.

With something selected in the drawing, the keyboard works too: the arrow keys move the selection, **Delete** removes it, **B** puts a branch around it, **Enter** jumps to its tag box, and typing any other letter starts a new instruction after it.

## Practice board {#practice}
This board isn't a mission, so nothing is graded. It starts with one rung: button A lights the series lamp. Try these:
1. Tap rung number **0**, tap the **+** after `NO(SB1)`, and add a `NO` contact tagged `SB2`. Now the lamp needs A **and** B held (Shift+click one to hold it).
2. **+ Rung**, then build `NO(SB1)` then `LAMP(H2)` on rung 1.
3. Select that `NO(SB1)` and choose **Branch around it**. Put `NO(SB2)` on the new leg. Now either button lights the parallel lamp.
4. Open **Text** to see what you built written out.

{{demo:sandbox}}

## Meter and fuse {#meter}
In Chapter 1, **Meter** turns on the voltmeter. Tap any wire in the drawing to read its voltage to N. Work from L1 toward the load: the fault is between the last point with voltage and the first without.

If you wire a rung with no load, L1 shorts straight to N and the **control fuse blows**. Everything goes dead. Fix the wiring, then press **Replace fuse**.

## Getting help {#help}
- **Hint** in the header gives hints one at a time. Using them costs nothing.
- **Help card** in the inspector explains whatever part you've selected, with a **Real world** section on how it looks in Allen-Bradley software or on a real panel. Help cards link to each other.
- **Help cards** at the top of every page lists them all.
- [Rules of thumb](#/basics) has the wiring rules with live examples.

## Commissioning {#commission}
Press **Commission** when you think it works. The game runs the mission's test scenarios at high speed: pressing buttons, filling tanks and breaking wires in a set order, and checking the outputs at each step.
- **✓** means a scenario passed. **✗** explains what went wrong, like "When the polymer tank went low, the sludge pump kept running", with the values it saw.
- Any solution that passes is fine. There's no single right drawing.
- Some missions also need the **Work order checklist** done in the live machine, a **question** answered, or a hidden fault found with **Inspect and repair** (select a device in the drawing to see that button).
- When everything passes, you get a **Real world** note and a button to the next mission.

## Chapter 2: the PLC screen {#plc}
{{img:ladder}}

The ladder works the same way as the schematic: select a rung, tap **+**, pick an instruction. The differences:
- **Instructions are Allen-Bradley's:** `XIC`, `XIO`, `OTE`, `OTL`, `OTU`, `TON`, `CTU` and the rest. In text they look like `XIC(Start_PB)OTE(Pump_Cmd);`.
- **Tags are names**, not device numbers. Tags you use in a rung are created for you. The **Tags** tab shows every tag's live value, and lets you declare a `REAL` (decimal) tag with **Create tag**.
- **Verify** checks the program as you edit. If it finds errors, the PLC keeps running the last good program until they're fixed.
- **Step scan** runs one PLC scan at a time. The **Scan** tab shows the three stages: inputs read, rungs solved top to bottom, outputs written.
- **The hardwired circuit** (E-stop, overloads) sits in a panel under the ladder. You can read it but not change it, because safety stays out of the PLC.
- There's no meter in Chapter 2. You troubleshoot from the tag values instead.

## Your progress {#progress}
Progress is saved in this browser automatically. Open **Save** at the top right to **Export save** to a file (to back it up, or move to another computer), **Import save**, or erase everything. **Start over** in a mission resets only that mission.

**Next:** read [Rules of thumb](#/basics), then start [1.1 Lights On](#/m/1.1).
