# ONS: One Shot
`ONS(Storage_Bit)` makes its rung true for **exactly one scan** each time the rung goes from false to true. The storage bit remembers last scan's condition.

A button stays pressed for hundreds of scans. Without a one-shot, "toggle on each press" would flip every scan. With it, each press counts once.

## Rules
- Give every ONS its **own** storage bit, used nowhere else.
- On power-up, the prescan **sets** the storage bit, so an input that's already on doesn't fire on the first scan.

## Real world
- **Studio 5000:** ONS, plus **OSR** and **OSF** (one-shot rising and falling) that write a separate output bit.
- **CCW (Micro800):** an **R_TRIG** or **F_TRIG** function block, or a **pulse rising edge** contact.
