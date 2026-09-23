import { describe, expect, it } from 'vitest';
import {
  PROGRESS_KEY,
  PROGRESS_V2_KEY,
  SETTINGS_KEY,
  completeLevel,
  createDefaultSettings,
  emptyPackProgress,
  groupBySize,
  isUnlocked,
  loadPackProgress,
  loadProgress,
  loadSettings,
  migrateLegacyProgress,
  packProgressCount,
  resetProgress,
  savePackProgress,
  saveProgress,
  saveSettings,
} from './progress';
import { PACKS } from './pack';
import type { Level } from './types';

function levelOf(size: number): Level {
  return { size, colors: [] };
}

function memStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    peek: () => ({ ...store }),
  };
}

describe('ordered unlock', () => {
  it('unlocks only the first Level when nothing is completed', () => {
    expect(isUnlocked([false, false, false], 0)).toBe(true);
    expect(isUnlocked([false, false, false], 1)).toBe(false);
    expect(isUnlocked([false, false, false], 2)).toBe(false);
  });

  it('unlocks the next Level once its predecessor is completed', () => {
    expect(isUnlocked([true, false, false], 1)).toBe(true);
    expect(isUnlocked([true, false, false], 2)).toBe(false);
    expect(isUnlocked([true, true, false], 2)).toBe(true);
  });

  it('stays locked when any earlier Level is incomplete', () => {
    expect(isUnlocked([true, false, true], 2)).toBe(false);
  });

  it('marks a Level completed without touching the others', () => {
    expect(completeLevel([false, false, false], 0)).toEqual([true, false, false]);
    expect(completeLevel([true, false, false], 5)).toEqual([true, false, false]);
  });
});

describe('grouping by Board size', () => {
  it('groups Pack indices under each Board size in order', () => {
    const pack = [levelOf(5), levelOf(6), levelOf(5), levelOf(6)];
    expect(groupBySize(pack)).toEqual([
      { size: 5, indices: [0, 2] },
      { size: 6, indices: [1, 3] },
    ]);
  });
});

describe('versioned localStorage persistence', () => {
  it('round-trips unlocks/completions through the versioned progress key', () => {
    const storage = memStorage();
    saveProgress(storage, [true, false]);
    expect(storage.peek()[PROGRESS_KEY]).toBeDefined();
    expect(loadProgress(storage, 3)).toEqual([true, false, false]);
  });

  it('falls back to locked defaults on missing or corrupt progress', () => {
    expect(loadProgress(memStorage(), 2)).toEqual([false, false]);
    expect(loadProgress(memStorage({ [PROGRESS_KEY]: 'not-json' }), 2)).toEqual([
      false,
      false,
    ]);
  });

  it('round-trips toggles through the versioned settings key', () => {
    const storage = memStorage();
    saveSettings(storage, { sound: false, animation: true });
    expect(storage.peek()[SETTINGS_KEY]).toBeDefined();
    expect(loadSettings(storage)).toEqual({ sound: false, animation: true });
  });

  it('falls back to defaults on missing or corrupt settings', () => {
    expect(loadSettings(memStorage())).toEqual(createDefaultSettings());
    expect(loadSettings(memStorage({ [SETTINGS_KEY]: 'not-json' }))).toEqual(
      createDefaultSettings(),
    );
  });

  it('clears both versioned keys on reset', () => {
    const storage = memStorage();
    saveProgress(storage, [true]);
    saveSettings(storage, { sound: false, animation: false });
    resetProgress(storage);
    expect(storage.peek()[PROGRESS_KEY]).toBeUndefined();
    expect(storage.peek()[SETTINGS_KEY]).toBeUndefined();
  });

  it('clears the v2 per-Pack key on reset alongside the legacy key', () => {
    const storage = memStorage();
    saveProgress(storage, [true]);
    savePackProgress(storage, emptyPackProgress(PACKS));
    saveSettings(storage, { sound: false, animation: false });
    resetProgress(storage);
    expect(storage.peek()[PROGRESS_KEY]).toBeUndefined();
    expect(storage.peek()[PROGRESS_V2_KEY]).toBeUndefined();
    expect(storage.peek()[SETTINGS_KEY]).toBeUndefined();
  });
});

describe('per-Pack unlock (#12)', () => {
  it('keeps unlock sequential within each Pack independently', () => {
    const starter = [true, true, false];
    const classic = [false, false, false];
    expect(isUnlocked(starter, 2)).toBe(true);
    // Finishing Starter never unlocks Classic beyond its own first Level
    expect(isUnlocked(classic, 0)).toBe(true);
    expect(isUnlocked(classic, 1)).toBe(false);
    expect(isUnlocked(classic, 2)).toBe(false);
  });

  it('reports per-Pack done/total counts for progress indication', () => {
    const progress = {
      starter: [true, true, false],
      classic: [false],
      expert: [],
    };
    expect(packProgressCount(progress, 'starter')).toEqual({ done: 2, total: 3 });
    expect(packProgressCount(progress, 'classic')).toEqual({ done: 0, total: 1 });
    expect(packProgressCount(progress, 'expert')).toEqual({ done: 0, total: 0 });
    expect(packProgressCount(progress, 'unknown')).toEqual({ done: 0, total: 0 });
  });
});

describe('v1-to-v2 migration (#12)', () => {
  it('migrates a legacy flat store slice-by-slice into Packs in order', () => {
    const legacy = Array.from({ length: 30 }, (_, i) => i < 12);
    const migrated = migrateLegacyProgress(legacy, PACKS);
    expect(Object.keys(migrated)).toEqual(['starter', 'classic', 'expert']);
    expect(migrated.starter).toEqual(Array(10).fill(true));
    expect(migrated.classic).toEqual([true, true, ...Array(8).fill(false)]);
    expect(migrated.expert).toEqual(Array(10).fill(false));
  });

  it('pads short legacy stores and truncates long ones', () => {
    expect(migrateLegacyProgress([true], PACKS).starter[0]).toBe(true);
    expect(migrateLegacyProgress([true], PACKS).starter[1]).toBe(false);
    expect(migrateLegacyProgress([true], PACKS).expert).toEqual(Array(10).fill(false));
    const long = migrateLegacyProgress(Array(40).fill(true), PACKS);
    expect(long.starter).toHaveLength(10);
    expect(long.classic).toHaveLength(10);
    expect(long.expert).toHaveLength(10);
  });

  it('loads the v2 store when present, ignoring the legacy key', () => {
    const storage = memStorage();
    saveProgress(storage, Array(30).fill(true));
    const v2 = emptyPackProgress(PACKS);
    v2.starter[0] = true;
    savePackProgress(storage, v2);
    expect(loadPackProgress(storage, PACKS)).toEqual(v2);
  });

  it('falls back to the legacy store with one-way migration when v2 is missing', () => {
    const storage = memStorage({ [PROGRESS_KEY]: JSON.stringify([true, ...Array(29).fill(false)]) });
    const loaded = loadPackProgress(storage, PACKS);
    expect(loaded.starter[0]).toBe(true);
    expect(loaded.starter.slice(1).every((c) => c === false)).toBe(true);
    expect(loaded.expert.every((c) => c === false)).toBe(true);
  });

  it('falls back to the legacy store when v2 is corrupt', () => {
    const storage = memStorage({
      [PROGRESS_V2_KEY]: 'not-json',
      [PROGRESS_KEY]: JSON.stringify([true, ...Array(29).fill(false)]),
    });
    expect(loadPackProgress(storage, PACKS).starter[0]).toBe(true);
  });

  it('falls back to empty progress when both stores are missing or corrupt', () => {
    expect(loadPackProgress(memStorage(), PACKS)).toEqual(emptyPackProgress(PACKS));
    const corrupt = memStorage({
      [PROGRESS_V2_KEY]: '{"version":2,"completed":{"starter":"nope"}}',
      [PROGRESS_KEY]: 'not-json',
    });
    expect(loadPackProgress(corrupt, PACKS)).toEqual(emptyPackProgress(PACKS));
  });

  it('round-trips the v2 store without touching the legacy key', () => {
    const storage = memStorage();
    const v2 = emptyPackProgress(PACKS);
    v2.classic[3] = true;
    savePackProgress(storage, v2);
    expect(storage.peek()[PROGRESS_V2_KEY]).toBeDefined();
    expect(storage.peek()[PROGRESS_KEY]).toBeUndefined();
    expect(loadPackProgress(storage, PACKS)).toEqual(v2);
  });
});
