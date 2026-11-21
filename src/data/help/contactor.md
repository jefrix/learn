# Contactor (KM)
A contactor is a heavy-duty relay that switches a motor's power. Its coil runs on control voltage; its main contacts (L1-T1, L2-T2, L3-T3) carry motor current; small auxiliary contacts (13-14, 21-22) go back into the control circuit.

On our press: KM2 mixer, KM3 sludge pump, KM4 dosing pump, KM11 and KM12 the screw motor fans, which also send the run command to drives U1 and U2.

## Safety
Contacts can **weld shut** after heavy current or a lot of jogging. Then the coil drops but the motor keeps running. That's why lockout is done at the disconnect, never at a contactor. See [[lockout-tagout]].

## Real world
A contactor plus an [[overload-relay]] makes a **motor starter**. Contactors are sized by motor horsepower and utilization category (AC-3 for starting and stopping motors).
