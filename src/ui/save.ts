// Progress lives in localStorage, wrapped so a private window or blocked
// storage never breaks the game. Export and import as a JSON file.

export interface MissionSave {
  status: 'started' | 'done';
  /** The player's logic, as text. */
  text?: string;
  /** Hidden-fault targets repaired. */
  repaired?: string[];
  /** Objectives met (investigate missions). */
  met?: string[];
  quizOk?: boolean;
  hintsUsed?: number;
}

export interface SaveFile {
  game: 'control-room';
  version: 1;
  missions: Record<string, MissionSave>;
  settings: { speed?: number; unlockAll?: boolean; seenGuides?: string[] };
}

const KEY = 'controlroom.save.v1';

function blank(): SaveFile {
  return { game: 'control-room', version: 1, missions: {}, settings: {} };
}

let cache: SaveFile | null = null;

export function load(): SaveFile {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? validate(JSON.parse(raw)) ?? blank() : blank();
  } catch {
    cache = blank();
  }
  return cache;
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    // Storage blocked or full: progress lasts for this visit only.
  }
}

export function mission(id: string): MissionSave {
  const s = load();
  return (s.missions[id] ??= { status: 'started' });
}

export function updateMission(id: string, patch: Partial<MissionSave>) {
  Object.assign(mission(id), patch);
  persist();
}

export function validate(x: unknown): SaveFile | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Partial<SaveFile>;
  if (o.game !== 'control-room' || o.version !== 1 || typeof o.missions !== 'object' || o.missions === null) return null;
  return { game: 'control-room', version: 1, missions: o.missions, settings: o.settings ?? {} };
}

export function exportSave() {
  const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `control-room-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importSave(file: File): Promise<string | null> {
  try {
    const parsed = validate(JSON.parse(await file.text()));
    if (!parsed) return 'That file is not a Control Room save.';
    cache = parsed;
    persist();
    return null;
  } catch {
    return 'That file could not be read as JSON.';
  }
}

export function resetAll() {
  cache = blank();
  persist();
}
