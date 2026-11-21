# E-stop
An emergency stop is a red mushroom button on a yellow background. It **latches** when pressed and has to be twisted or pulled to release. It opens a NC circuit that stops the machine, and releasing it must **not** restart anything.

## Safety
- **Our press's SB1 breaks only the control circuit** (wire 1 to 2). The main breaker, the drives U1 and U2, and the Power lamp H1 stay live. The E-stop is not [[lockout-tagout]].
- Before releasing an E-stop: SA2 to Stop, fix the cause, then release and restart. See [[stop-before-reset]].
- E-stops must be hardwired. A PLC can read an E-stop's status, but must not be the only thing that stops the machine. See [[hardwired-safety]].

## Real world
Modern machines run E-stops through a dual-channel **safety relay** that checks both channels and the contactors before allowing a reset (ISO 13850, NFPA 79).
