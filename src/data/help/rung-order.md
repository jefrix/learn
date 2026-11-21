# Rung order
Rungs are solved top to bottom. A bit written on rung 5 is seen by rungs 6 and later in the **same** scan, but by rungs 0 to 4 only on the **next** scan.

That's usually harmless, a few milliseconds. It matters for:

- **One-shots:** a one-scan pulse written below a rung that reads it is gone before that rung sees it.
- **Sequences:** setting a state number and acting on it in the same scan.
- **Resets:** resetting a timer above the rung that checks its `.DN`.

## Try it
Mission 2.2: step through a chain of rungs in the wrong order and watch the lag.

## Real world
Studio 5000 also splits programs into **tasks**, **programs** and **routines**. Routines run only when a JSR calls them, so order there matters too.
