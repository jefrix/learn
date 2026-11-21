// A machine: the plant parts, the panel's relay devices, any hardwired circuit
// the player can't edit, and the PLC's I/O wiring.

import type { PartDef } from './process/world';
import type { DeviceDef } from './relay/devices';

export interface PlcPoint {
  tag: string;
  type?: 'BOOL' | 'DINT' | 'REAL';
  /** Inputs wired through a field device's contact. */
  device?: string;
  contact?: 'NO' | 'NC';
  /** Inputs read straight from a signal (analog values, relay-panel terminals); outputs write this signal. */
  signal?: string;
  /** Terminal, e.g. "I-00" or "O-03". */
  address?: string;
  desc?: string;
}

export interface MachineDef {
  id: string;
  title: string;
  site: string;
  /** SVG coordinate space of the machine view. */
  size: [number, number];
  parts: PartDef[];
  devices: Record<string, DeviceDef>;
  /** Extra relay sources besides L1, e.g. 'P1' for the PLC's own 24 V common. */
  sources?: string[];
  /** Relay rungs that are always there and locked (hardwired safety, the real panel). */
  hardwired?: string;
  plc?: { inputs: PlcPoint[]; outputs: PlcPoint[] };
}
