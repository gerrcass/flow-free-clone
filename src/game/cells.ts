import type { CellPos } from './types';

export function samePos(a: CellPos, b: CellPos): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: CellPos, b: CellPos): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function cellKey(at: CellPos): string {
  return `${at.row},${at.col}`;
}
