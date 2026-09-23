import { describe, expect, it } from 'vitest';
import {
  PROGRESS_KEY,
  SETTINGS_KEY,
  completeLevel,
  createDefaultSettings,
  groupBySize,
  isUnlocked,
  loadProgress,
  loadSettings,
  resetProgress,
  saveProgress,
  saveSettings,
} from './progress';
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
});
