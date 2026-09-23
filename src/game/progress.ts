import type { Level } from './types';

export const PROGRESS_KEY = 'flow-free-clone:progress:v1';
export const PROGRESS_V2_KEY = 'flow-free-clone:progress:v2';
export const SETTINGS_KEY = 'flow-free-clone:settings:v1';

/** Per-Pack completion map keyed by Pack id (#12). */
export type PackProgress = Record<string, boolean[]>;

export interface PackLike {
  id: string;
  levels: Level[];
}

export interface Settings {
  sound: boolean;
  animation: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function isUnlocked(completed: boolean[], index: number): boolean {
  if (index < 0 || index >= completed.length) return false;
  return completed.slice(0, index).every((c) => c === true);
}

/**
 * Sequential unlock within one Pack (#12): Level 0 is always playable,
 * later Levels open only once every earlier Level in the same Pack is
 * complete. Progress in other Packs never affects this Pack.
 */
export function isUnlockedInPack(completed: boolean[], index: number): boolean {
  return isUnlocked(completed, index);
}

export function completeLevel(completed: boolean[], index: number): boolean[] {
  if (index < 0 || index >= completed.length) return completed;
  if (completed[index]) return completed;
  const next = [...completed];
  next[index] = true;
  return next;
}

export function groupBySize(pack: Level[]): { size: number; indices: number[] }[] {
  const order: number[] = [];
  const groups = new Map<number, number[]>();
  pack.forEach((level, index) => {
    if (!groups.has(level.size)) {
      groups.set(level.size, []);
      order.push(level.size);
    }
    groups.get(level.size)?.push(index);
  });
  return order
    .sort((a, b) => a - b)
    .map((size) => ({ size, indices: groups.get(size) ?? [] }));
}

function emptyProgress(total: number): boolean[] {
  return Array.from({ length: total }, () => false);
}

export function loadProgress(storage: StorageLike, total: number): boolean[] {
  const fallback = emptyProgress(total);
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return fallback.map((_, i) => parsed[i] === true);
  } catch {
    return fallback;
  }
}

export function saveProgress(storage: StorageLike, completed: boolean[]): void {
  storage.setItem(PROGRESS_KEY, JSON.stringify(completed));
}

export function emptyPackProgress(packs: PackLike[]): PackProgress {
  const out: PackProgress = {};
  for (const pack of packs) {
    out[pack.id] = Array.from({ length: pack.levels.length }, () => false);
  }
  return out;
}

/** Done/total pair driving per-Pack progress indication in Level select. */
export function packProgressCount(
  progress: PackProgress,
  packId: string,
): { done: number; total: number } {
  const arr = progress[packId];
  if (!Array.isArray(arr)) return { done: 0, total: 0 };
  return { done: arr.filter((c) => c === true).length, total: arr.length };
}

/**
 * One-way v1-to-v2 migration (#12): slice the legacy flat boolean array
 * in Pack order (Starter, then Classic, then Expert), padding short
 * stores with locked Levels and truncating long ones. Never writes back
 * to the legacy key.
 */
export function migrateLegacyProgress(
  legacy: boolean[],
  packs: PackLike[],
): PackProgress {
  const flat = legacy.map((c) => c === true);
  const out: PackProgress = {};
  let offset = 0;
  for (const pack of packs) {
    out[pack.id] = Array.from(
      { length: pack.levels.length },
      (_, i) => flat[offset + i] === true,
    );
    offset += pack.levels.length;
  }
  return out;
}

function readLegacyFlat(storage: StorageLike): boolean[] | null {
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((c) => c === true);
  } catch {
    return null;
  }
}

function normalizePackArray(value: unknown, length: number): boolean[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((c) => typeof c === 'boolean')) return null;
  // Tolerate Pack-size drift the same way migration does: pad short
  // arrays with locked Levels, truncate long ones, so a v2 store from
  // an older Pack size keeps its valid progress instead of being
  // discarded in favor of stale legacy data.
  return Array.from({ length }, (_, i) => value[i] === true);
}

function readV2(storage: StorageLike, packs: PackLike[]): PackProgress | null {
  try {
    const raw = storage.getItem(PROGRESS_V2_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      completed?: unknown;
    };
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (parsed.version !== 2) return null;
    if (typeof parsed.completed !== 'object' || parsed.completed === null) {
      return null;
    }
    const completed = parsed.completed as Record<string, unknown>;
    const out: PackProgress = {};
    for (const pack of packs) {
      const normalized = normalizePackArray(completed[pack.id], pack.levels.length);
      if (normalized === null) return null;
      out[pack.id] = normalized;
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Load the per-Pack progress map (#12). Prefers the v2 store; falls back
 * to one-way migration of the legacy flat store when v2 is missing or
 * corrupt, persisting the migrated map back to v2 so migration happens
 * once instead of on every load; falls back to empty (all locked) when
 * both are unusable.
 */
export function loadPackProgress(
  storage: StorageLike,
  packs: PackLike[],
): PackProgress {
  const v2 = readV2(storage, packs);
  if (v2 !== null) return v2;
  const legacy = readLegacyFlat(storage);
  if (legacy !== null) {
    const migrated = migrateLegacyProgress(legacy, packs);
    savePackProgress(storage, migrated);
    return migrated;
  }
  return emptyPackProgress(packs);
}

/**
 * Persist the per-Pack map to the v2 key only (#12). The legacy key is
 * never written here, keeping migration one-way (legacy → v2).
 */
export function savePackProgress(
  storage: StorageLike,
  progress: PackProgress,
): void {
  storage.setItem(PROGRESS_V2_KEY, JSON.stringify({ version: 2, completed: progress }));
}

export function createDefaultSettings(): Settings {
  return { sound: true, animation: true };
}

export function loadSettings(storage: StorageLike): Settings {
  const fallback = createDefaultSettings();
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : fallback.sound,
      animation:
        typeof parsed.animation === 'boolean' ? parsed.animation : fallback.animation,
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(storage: StorageLike, settings: Settings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function resetProgress(storage: StorageLike): void {
  storage.removeItem(PROGRESS_KEY);
  storage.removeItem(PROGRESS_V2_KEY);
  storage.removeItem(SETTINGS_KEY);
}
