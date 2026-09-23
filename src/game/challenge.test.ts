import { describe, expect, it } from 'vitest';
import { computePar, formatStars, starsForLevel, starsForPar } from './challenge';
import { FIXTURE_LEVEL } from './fixture';
import { PACKS } from './pack';
import { isSolved } from './win';
import type { CellPos } from './types';

function straightRowPipes(): Record<string, CellPos[]> {
  const pipes: Record<string, CellPos[]> = {};
  for (const color of FIXTURE_LEVEL.colors) {
    const row = color.endpoints[0].row;
    const cells: CellPos[] = [];
    for (let col = 0; col < FIXTURE_LEVEL.size; col += 1) {
      cells.push({ row, col });
    }
    pipes[color.id] = cells;
  }
  return pipes;
}

describe('Par from the Solver seam (#14)', () => {
  it('derives Par 25 for the 5x5 striped fixture Board', () => {
    expect(computePar(FIXTURE_LEVEL)).toBe(25);
  });

  it('derives Par equal to Board Cells for shipped Pack Levels', () => {
    expect(computePar(PACKS[0].levels[0])).toBe(25);
    expect(computePar(PACKS[2].levels[PACKS[2].levels.length - 1])).toBe(64);
  });

  it('returns null Par for an unsolvable Board', () => {
    expect(
      computePar({
        size: 2,
        colors: [
          { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 1, col: 1 }] },
          { id: 'G', endpoints: [{ row: 0, col: 1 }, { row: 1, col: 0 }] },
        ],
      }),
    ).toBeNull();
  });
});

describe('star thresholds (#14)', () => {
  it('awards one star up to Par 25, two to Par 49, three beyond', () => {
    expect(starsForPar(25)).toBe(1);
    expect(starsForPar(26)).toBe(2);
    expect(starsForPar(36)).toBe(2);
    expect(starsForPar(49)).toBe(2);
    expect(starsForPar(50)).toBe(3);
    expect(starsForPar(64)).toBe(3);
  });

  it('maps a Level to stars through its solver-derived Par', () => {
    expect(starsForLevel(FIXTURE_LEVEL)).toBe(1);
    expect(
      starsForLevel({
        size: 2,
        colors: [
          { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 1, col: 1 }] },
          { id: 'G', endpoints: [{ row: 0, col: 1 }, { row: 1, col: 0 }] },
        ],
      }),
    ).toBeNull();
  });
});

describe('win-check stays fill-plus-connect (#14)', () => {  it('solves only when every Cell is filled and every Color is connected', () => {
    expect(isSolved(FIXTURE_LEVEL, straightRowPipes())).toBe(true);
    expect(starsForLevel(FIXTURE_LEVEL)).not.toBeNull();
  });

  it('stays unsolved when a connected Pipe leaves Cells empty', () => {
    const pipes = straightRowPipes();
    pipes['P'] = [
      { row: 4, col: 0 },
      { row: 4, col: 4 },
    ];
    expect(isSolved(FIXTURE_LEVEL, pipes)).toBe(false);
  });

  it('stays unsolved when every Cell is filled but a Color is disconnected', () => {
    const pipes = straightRowPipes();
    pipes['R'] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ];
    pipes['G'] = [
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 1, col: 4 },
      { row: 0, col: 4 },
    ];
    expect(isSolved(FIXTURE_LEVEL, pipes)).toBe(false);
  });
});

describe('star glyph (#14)', () => {
  it('fills the earned slots out of three', () => {
    expect(formatStars(0)).toBe('☆☆☆');
    expect(formatStars(2)).toBe('★★☆');
    expect(formatStars(3)).toBe('★★★');
  });
});
