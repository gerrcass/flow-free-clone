import type { Level } from './types';

export const PROGRESS_KEY = 'flow-free-clone:progress:v1';
export const SETTINGS_KEY = 'flow-free-clone:settings:v1';

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
  storage.removeItem(SETTINGS_KEY);
}
