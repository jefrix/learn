# XIC: Examine If Closed
`-] [-` is **true when its bit is 1**. Rung-condition-out = rung-condition-in AND the bit.

The name comes from relays: if a field contact is closed, the input bit is 1, and XIC is true. But XIC only looks at the **bit**. It doesn't care whether the field device is wired NO or NC.

## Fail-safe stop buttons
A Stop button wired **NC** reads 1 when healthy. Examine it with **XIC**: pressing it, or a broken wire, gives 0 and stops the rung. See [[fail-safe]].

## Real world
- **Studio 5000:** XIC. **CCW (Micro800):** a **direct contact**.
- Also works on timer and counter bits: `XIC(Tmr.DN)`, and on bits of a DINT: `XIC(Word.3)`.
