// Relay-panel devices. Field devices (buttons, selectors, floats, overloads)
// are actuated by the operator or the plant through signals; panel devices
// (relays, contactors, timers, level relays) are actuated by their own coils.

export type DeviceType =
  | 'pushbutton' // momentary; actuated while pressed
  | 'estop' // latching mushroom; actuated while pushed in
  | 'selector' // positions; use POS(tag,pos) contacts
  | 'relay' // KA control relay
  | 'contactor' // KM motor contactor
  | 'timer' // KT
  | 'overload' // FR; actuated when tripped
  | 'float' // actuated when liquid is at or above it
  | 'levelRelay' // LVS; reads electrode rods, actuated while it calls for fill
  | 'signal' // a contact driven by an outside signal (PLC output, drive fault relay)
  | 'lamp'
  | 'solenoid'
  | 'horn'
  | 'plcInput'; // a PLC input terminal used as a load

export interface DeviceDef {
  tag: string;
  type: DeviceType;
  /** Plain name shown under the tag, e.g. "Auto start". */
  label?: string;
  /** Signal that actuates the device, when it differs from the tag. */
  signal?: string;
  /** Selector positions, in knob order. */
  positions?: string[];
  /** Level relay: signals that are true while the low / high electrode is wet. */
  low?: string;
  high?: string;
  /** Terminal or wiring note, e.g. "31/32". */
  terminals?: string;
}

/** Guess a device type from its tag prefix, following the press panel's conventions. */
export function inferType(tag: string): DeviceType {
  const t = tag.toUpperCase();
  if (/^(KM|M)\d/.test(t)) return 'contactor';
  if (/^(KT|TR|TD)\d/.test(t)) return 'timer';
  if (/^(KA|CR|K)\d/.test(t)) return 'relay';
  if (/^(H|PL)\d/.test(t)) return 'lamp';
  if (/^(Y|SOL)\d/.test(t)) return 'solenoid';
  if (/^(HA|HORN)/.test(t)) return 'horn';
  if (/^(SB|PB)\d/.test(t)) return 'pushbutton';
  if (/^(SA|SS)\d/.test(t)) return 'selector';
  if (/^(FR|OL)\d/.test(t)) return 'overload';
  if (/^LVS\d/.test(t)) return 'levelRelay';
  if (/^(LS|FS)/.test(t)) return 'float';
  return 'relay';
}

export function deviceType(tag: string, defs: Record<string, DeviceDef>): DeviceType {
  return defs[tag]?.type ?? inferType(tag);
}

/** Relay mnemonics and what they draw. */
export const RELAY_OPS = {
  NO: 'Normally open contact',
  NC: 'Normally closed contact',
  POS: 'Selector contact, closed in one position',
  WIRE: 'Plain wire',
  COIL: 'Relay or contactor coil',
  TMR: 'Timer coil',
  LAMP: 'Pilot lamp',
  SOL: 'Solenoid valve coil',
  HORN: 'Horn',
  IN: 'PLC input terminal',
} as const;

export const LOAD_OPS = new Set(['COIL', 'TMR', 'LAMP', 'SOL', 'HORN', 'IN']);
export const CONTACT_OPS = new Set(['NO', 'NC', 'POS', 'WIRE']);

export type TimerMode = 'on' | 'off' | 'cycle';

export interface TimerSpec {
  mode: TimerMode;
  /** Seconds. On-delay and off-delay: the delay. Cycle: the OFF time. */
  preset: number;
  /** Cycle timers only: the ON time, in seconds. */
  on: number;
}

/** TMR(KT2,on,300) / TMR(KT2,off,120) / TMR(KT1,cycle,600,30) */
export function timerSpec(args: string[]): TimerSpec {
  const mode = (['on', 'off', 'cycle'].includes(args[1]) ? args[1] : 'on') as TimerMode;
  const preset = Math.max(0, Number(args[2] ?? 5) || 0);
  const on = Math.max(0, Number(args[3] ?? 1) || 0);
  return { mode, preset, on };
}
