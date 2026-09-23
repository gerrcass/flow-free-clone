import { describe, expect, it } from 'vitest';
import { PACK } from './pack';
import { PACK_PLAN, generatePack } from './generator';
import { createInitialState, reducer } from './reducer';
import { solveLevel } from './solver';
import { isSolved } from './win';
import { cellKey } from './cells';

describe('Pack integrity (#2)', () => {
  it('ships ~30 Levels ramped 5x5 to 8x8 per the plan', () => {
    expect(PACK).toHaveLength(PACK_PLAN.length);
    PACK.forEach((level, i) => {
      const [size, colors] = PACK_PLAN[i];
      expect(level.size).toBe(size);
      expect(level.colors).toHaveLength(colors);
      expect(new Set(level.colors.map((c) => c.id)).size).toBe(colors);
      const endpoints = level.colors.flatMap((c) => c.endpoints);
      for (const e of endpoints) {
        expect(e.row).toBeGreaterThanOrEqual(0);
        expect(e.row).toBeLessThan(size);
        expect(e.col).toBeGreaterThanOrEqual(0);
        expect(e.col).toBeLessThan(size);
      }
      expect(new Set(endpoints.map(cellKey)).size).toBe(colors * 2);
    });
  });

  it('regenerates bit-for-bit from the seed', () => {
    expect(generatePack().map((g) => g.level)).toEqual(PACK);
  });

  it(
    'passes the solver on every Level',
    { timeout: 120_000 },
    () => {
      PACK.forEach((level, i) => {
        const t0 = performance.now();
        const pipes = solveLevel(level);
        const dt = performance.now() - t0;
        console.log(`pack[${i}] ${level.size}x${level.size} ${level.colors.length} colors: ${dt.toFixed(0)}ms`);
        expect(pipes).not.toBeNull();
        expect(isSolved(level, pipes!)).toBe(true);
      });
    },
  );

  it(
    'replays every solver solution through the Pipe-editing reducer',
    { timeout: 120_000 },
    () => {
      for (const level of PACK) {
        const pipes = solveLevel(level);
        expect(pipes).not.toBeNull();
        let state = createInitialState(level);
        for (const color of level.colors) {
          const path = pipes![color.id];
          state = reducer(state, { type: 'start', colorId: color.id, at: path[0] });
          for (const cell of path.slice(1)) {
            state = reducer(state, { type: 'extend', at: cell });
          }
          state = reducer(state, { type: 'end' });
        }
        expect(state.pipes).toEqual(pipes);
        expect(isSolved(level, state.pipes)).toBe(true);
      }
    },
  );
});
