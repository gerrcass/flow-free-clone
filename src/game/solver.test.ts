import { describe, expect, it } from 'vitest';
import { solveLevel } from './solver';
import { isSolved } from './win';
import { FIXTURE_LEVEL } from './fixture';
import type { Level } from './types';

describe('solver (Pack integrity seam)', () => {
  it('fills a 2x2 Board with one Color end to end', () => {
    const level: Level = {
      size: 2,
      colors: [{ id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }],
    };
    const pipes = solveLevel(level);
    expect(pipes).not.toBeNull();
    expect(isSolved(level, pipes!)).toBe(true);
  });

  it('connects two Colors while filling every Cell of a 3x3 Board', () => {
    const level: Level = {
      size: 3,
      colors: [
        { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 0, col: 2 }] },
        { id: 'B', endpoints: [{ row: 1, col: 0 }, { row: 2, col: 0 }] },
      ],
    };
    const pipes = solveLevel(level);
    expect(pipes).not.toBeNull();
    expect(isSolved(level, pipes!)).toBe(true);
  });

  it('returns null when rival Endpoints box a Color in on a 2x2 Board', () => {
    const level: Level = {
      size: 2,
      colors: [
        { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 1, col: 1 }] },
        { id: 'G', endpoints: [{ row: 0, col: 1 }, { row: 1, col: 0 }] },
      ],
    };
    expect(solveLevel(level)).toBeNull();
  });

  it('solves the 5x5 striped fixture Board', () => {
    const pipes = solveLevel(FIXTURE_LEVEL);
    expect(pipes).not.toBeNull();
    expect(isSolved(FIXTURE_LEVEL, pipes!)).toBe(true);
  });
});
