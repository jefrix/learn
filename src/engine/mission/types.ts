import type { Fault } from '../sim';
import type { Val } from '../signals';

/** An expected value: exact, or a numeric range. */
export type Expect = Val | { min?: number; max?: number };

export interface Step {
  /** Seconds from the start of the scenario. */
  t: number;
  press?: string;
  release?: string;
  /** Press, then release half a second later. */
  tap?: string;
  set?: Record<string, Val>;
  /** Set tank levels (0..1), as if someone dragged them. */
  level?: Record<string, number>;
  fault?: Fault;
  clear?: Fault;
  power?: boolean;
  action?: { part: string; do: 'reset' | 'clearJam' | 'clean' };
  /** Checked once at t, or on every tick from t to `until`. */
  expect?: Record<string, Expect>;
  until?: number;
  /** The plain-language sentence shown when this check fails. */
  say?: string;
}

export interface Scenario {
  /** Shown when it passes, e.g. "Stop wire breaks: the pump stops." */
  name: string;
  /** Starting operator positions, signals and tank levels. */
  init?: { signals?: Record<string, Val>; levels?: Record<string, number> };
  steps: Step[];
  /** Tick length in seconds (default 0.05). */
  dt?: number;
}

/** Something the player has to make happen in the live sim (investigate missions). */
export interface Objective {
  id: string;
  /** What to do, shown as a checklist line. */
  text: string;
  /** All of these must be true at the same moment. */
  when: Record<string, Expect>;
  /** Or: an event kind that must occur (overflow, undosed, trip, dryRun). */
  event?: string;
  /** Only counts once this other objective is met. */
  after?: string;
}

export interface HiddenFault {
  fault: Fault;
  /** What the player selects to repair it: a device tag, a wire number or a plant part. */
  target: string;
  /** Shown after it's repaired. */
  found: string;
}

export interface Quiz {
  question: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface Mission {
  id: string;
  chapter: 1 | 2;
  order: number;
  kind: 'build' | 'callout' | 'investigate';
  engine: 'relay' | 'ladder';
  machine: string;
  title: string;
  site: string;
  /** A few sentences of story: what's wrong and who called. */
  brief: string;
  /** Checklist of what the player has to do. */
  goal: string[];
  /** Starting logic: relay rung text, or ladder program text. */
  starter: string;
  /** true: free editing. 'presets': only timer presets. false: read-only. */
  editable: boolean | 'presets';
  /** Parts the palette offers; defaults to everything for the engine. */
  palette?: string[];
  /** Live-session starting state. */
  init?: { signals?: Record<string, Val>; levels?: Record<string, number> };
  hiddenFaults?: HiddenFault[];
  tests: Scenario[];
  observe?: Objective[];
  quiz?: Quiz;
  /** A reference solution in the same format as the starter. */
  reference: string;
  /** For investigate missions: a scripted session that meets every objective. */
  walkthrough?: Scenario;
  help: string[];
  /** How this mission differs from real hardware and our real press. */
  realWorld: string;
  hints: string[];
  /** Faults the player may cause on purpose from the work order panel. */
  breakables?: { label: string; fault: Fault }[];
  /** Keyboard-free tip shown under the editor. */
  tip?: string;
}
