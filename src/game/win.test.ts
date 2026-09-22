import { describe, expect, it } from 'vitest';
import { fillRatio, isConnected, isSolved } from './win';
import { FIXTURE_LEVEL } from './fixture';
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

describe('win-check (rule 5)', () => {
  it('is solved only when every Cell is filled AND every Color is connected', () => {
    expect(isSolved(FIXTURE_LEVEL, straightRowPipes())).toBe(true);
  });

  it('is not solved when a Color is connected but Cells remain empty', () => {
    const pipes = straightRowPipes();
    pipes['P'] = [
      { row: 4, col: 0 },
      { row: 4, col: 4 },
    ];
    expect(isSolved(FIXTURE_LEVEL, pipes)).toBe(false);
  });

  it('is not solved when every Cell is filled but a Color is disconnected', () => {
    const pipes = straightRowPipes();
    // Break R: keep all its Cells filled by R except disconnect endpoints.
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

  it('is not connected when the Pipe passes through a rival Endpoint', () => {
    const pipes = straightRowPipes();
    // R runs from (0,0) to (0,4) but detours through G's Endpoint at (1,0).
    pipes['R'] = [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 1, col: 4 },
      { row: 0, col: 4 },
    ];
    expect(isConnected(FIXTURE_LEVEL, 'R', pipes)).toBe(false);
  });

  it('reports Board fill ratio', () => {
    expect(fillRatio(FIXTURE_LEVEL, straightRowPipes())).toBe(1);
    const empty: Record<string, CellPos[]> = { R: [], G: [], B: [], Y: [], P: [] };
    expect(fillRatio(FIXTURE_LEVEL, empty)).toBe(0);
  });
});
