# Forcing
Programming software can **force** an input or output on or off, overriding the field device or the program. It's a troubleshooting tool, and a dangerous one.

## Safety
- A forced output stays on **whatever the program says**, including when an interlock in the program should have stopped it. That's one reason safety functions are hardwired. See [[hardwired-safety]].
- Never leave forces in place. Remove them and document what you did.

## Try it
Chapter 2 commissioning forces every output on, then presses the E-stop, to prove the E-stop is hardwired.

## Real world
- **Studio 5000** shows a force indicator on the toolbar and the controller's FORCE LED, and you must enable forces before they take effect.
- **CCW** can lock (force) Micro800 I/O variables while online.
