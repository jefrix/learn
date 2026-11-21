# TOF: Timer Off Delay
While its rung is **true**, a TOF holds `.DN` = 1 and ACC = 0. When the rung goes **false**, it starts timing; when ACC reaches PRE, `.DN` drops to 0. If the rung goes true again first, it resets with DN still on.

Use `XIC(Fan_Tmr.DN)` for "on now, and for a while after".

## Watch out
A [[res]] on a TOF clears DN at once, even while the rung is true, which surprises people.

## Real world
- **Studio 5000:** TOF. On power-up the prescan sets its ACC to PRE and clears DN, so it doesn't start timing by itself.
- **CCW:** the IEC **TOF** function block (IN, PT, Q, ET).
- Relay version: [[off-delay]].
