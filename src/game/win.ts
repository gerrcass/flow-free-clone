import type { CellPos, Level } from './types';
import { cellKey, isAdjacent, samePos } from './cells';

export function isConnected(level: Level, colorId: string, pipes: Record<string, CellPos[]>): boolean {
  const def = level.colors.find((c) => c.id === colorId);
  if (!def) return false;
  const pipe = pipes[colorId] ?? [];
  if (pipe.length < 2) return false;
  const [a, b] = def.endpoints;
  const forward = samePos(pipe[0], a) && samePos(pipe[pipe.length - 1], b);
  const backward = samePos(pipe[0], b) && samePos(pipe[pipe.length - 1], a);
  if (!forward && !backward) return false;
  for (let i = 1; i < pipe.length; i += 1) {
    if (!isAdjacent(pipe[i - 1], pipe[i])) return false;
  }
  const middle = pipe.slice(1, -1);
  const crossesRivalEndpoint = level.colors.some(
    (c) =>
      c.id !== colorId &&
      c.endpoints.some((e) => middle.some((cell) => samePos(cell, e))),
  );
  if (crossesRivalEndpoint) return false;
  return true;
}

export function filledCells(pipes: Record<string, CellPos[]>): Set<string> {
  const filled = new Set<string>();
  for (const pipe of Object.values(pipes)) {
    for (const cell of pipe) filled.add(cellKey(cell));
  }
  return filled;
}

export function fillRatio(level: Level, pipes: Record<string, CellPos[]>): number {
  return filledCells(pipes).size / (level.size * level.size);
}

export function isSolved(level: Level, pipes: Record<string, CellPos[]>): boolean {
  if (filledCells(pipes).size !== level.size * level.size) return false;
  return level.colors.every((c) => isConnected(level, c.id, pipes));
}
