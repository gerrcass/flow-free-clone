import { describe, expect, it } from 'vitest';
import { generateLevel, generatePack } from './generator';
import { isSolved } from './win';
import { cellKey } from './cells';

describe('generator (reproducible Pack seam)', () => {
  it('builds a 5x5 Level whose own solution fills and connects the Board', () => {
    const { level, solution } = generateLevel(5, 4, 42);
    expect(level.size).toBe(5);
    expect(level.colors).toHaveLength(4);
    const endpoints = level.colors.flatMap((c) => c.endpoints);
    expect(new Set(endpoints.map(cellKey)).size).toBe(8);
    for (const e of endpoints) {
      expect(e.row).toBeGreaterThanOrEqual(0);
      expect(e.row).toBeLessThan(5);
      expect(e.col).toBeGreaterThanOrEqual(0);
      expect(e.col).toBeLessThan(5);
    }
    expect(isSolved(level, solution)).toBe(true);
  });

  it('is deterministic for one seed and varies across seeds', () => {
    expect(generateLevel(6, 5, 7)).toEqual(generateLevel(6, 5, 7));
    expect(generateLevel(6, 5, 7)).not.toEqual(generateLevel(6, 5, 8));
  });

  it('ramps ~30 Levels from 5x5 to 8x8 with valid construction solutions', () => {
    const pack = generatePack();
    expect(pack).toHaveLength(30);
    const sizes = pack.map((p) => p.level.size);
    expect(Math.min(...sizes)).toBe(5);
    expect(Math.max(...sizes)).toBe(8);
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]);
    }
    for (const { level, solution } of pack) {
      expect(isSolved(level, solution)).toBe(true);
    }
  });
});
