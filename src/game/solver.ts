import type { CellPos, Level } from './types';
import { cellKey, samePos } from './cells';

export interface SolverOptions {
  /** Hard cap on search steps so unsolvable Boards always terminate. */
  maxSteps?: number;
}

const DEFAULT_MAX_STEPS = 5_000_000;

interface Search {
  size: number;
  order: { id: string; a: CellPos; b: CellPos }[];
  rivalEndpointOf: Map<string, string>;
  occupied: boolean[];
  occupiedCount: number;
  pipes: Record<string, CellPos[]>;
  steps: number;
  exhausted: boolean;
  maxSteps: number;
}

function idx(size: number, at: CellPos): number {
  return at.row * size + at.col;
}

function manhattan(a: CellPos, b: CellPos): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function neighbors(size: number, at: CellPos): CellPos[] {
  const out: CellPos[] = [];
  if (at.row > 0) out.push({ row: at.row - 1, col: at.col });
  if (at.row + 1 < size) out.push({ row: at.row + 1, col: at.col });
  if (at.col > 0) out.push({ row: at.row, col: at.col - 1 });
  if (at.col + 1 < size) out.push({ row: at.row, col: at.col + 1 });
  return out;
}

function freeFor(s: Search, colorIdx: number, at: CellPos): boolean {
  if (s.occupied[idx(s.size, at)]) return false;
  const rival = s.rivalEndpointOf.get(cellKey(at));
  return rival === undefined || rival === s.order[colorIdx].id;
}

/**
 * Sound dead-state detection after every committed Cell:
 * - an empty non-Endpoint Cell needs two free neighbors (a future Pipe
 *   passes through it as interior);
 * - every unplaced Color's Endpoints must share one empty region;
 * - no empty region may lack an Endpoint to cover it.
 */
function prunable(s: Search, nextIdx: number, head: CellPos): boolean {
  const { size } = s;
  const usable = (at: CellPos): boolean =>
    !s.occupied[idx(size, at)] || samePos(at, head);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const at = { row: r, col: c };
      if (s.occupied[idx(size, at)] || s.rivalEndpointOf.has(cellKey(at))) continue;
      let liberties = 0;
      for (const nb of neighbors(size, at)) {
        if (usable(nb)) liberties += 1;
      }
      if (liberties < 2) return true;
    }
  }
  const seen = new Array<boolean>(size * size).fill(false);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const start = { row: r, col: c };
      if (!usable(start) || seen[idx(size, start)]) continue;
      const inComponent = new Set<string>();
      const stack: CellPos[] = [start];
      seen[idx(size, start)] = true;
      while (stack.length > 0) {
        const at = stack.pop()!;
        inComponent.add(cellKey(at));
        for (const nb of neighbors(size, at)) {
          const k = idx(size, nb);
          if (!usable(nb) || seen[k]) continue;
          seen[k] = true;
          stack.push(nb);
        }
      }
      let endpointCount = 0;
      for (let i = nextIdx; i < s.order.length; i += 1) {
        const inA = inComponent.has(cellKey(s.order[i].a));
        const inB = inComponent.has(cellKey(s.order[i].b));
        if (inA !== inB) return true;
        if (inA) endpointCount += 2;
      }
      if (endpointCount === 0 && !inComponent.has(cellKey(head))) return true;
    }
  }
  // The active head must still reach its mate through free Cells.
  const target = s.order[nextIdx - 1].b;
  if (!samePos(head, target)) {
    const reached = new Set<string>([cellKey(head)]);
    const queue: CellPos[] = [head];
    while (queue.length > 0) {
      const at = queue.pop()!;
      for (const nb of neighbors(size, at)) {
        const k = cellKey(nb);
        if (reached.has(k) || !freeFor(s, nextIdx - 1, nb)) continue;
        if (samePos(nb, target)) return false;
        reached.add(k);
        queue.push(nb);
      }
    }
    return true;
  }
  return false;
}

function extendActive(s: Search, colorIdx: number): boolean {
  s.steps += 1;
  if (s.steps > s.maxSteps) {
    s.exhausted = true;
    return false;
  }
  const color = s.order[colorIdx];
  const pipe = s.pipes[color.id];
  const head = pipe[pipe.length - 1];
  if (samePos(head, color.b)) {
    return startNext(s, colorIdx + 1);
  }
  const next = neighbors(s.size, head)
    .filter((nb) => freeFor(s, colorIdx, nb))
    .sort((p, q) => manhattan(p, color.b) - manhattan(q, color.b));
  for (const nb of next) {
    if (s.exhausted) return false;
    s.occupied[idx(s.size, nb)] = true;
    s.occupiedCount += 1;
    pipe.push(nb);
    if (!prunable(s, colorIdx + 1, nb) && extendActive(s, colorIdx)) return true;
    pipe.pop();
    s.occupied[idx(s.size, nb)] = false;
    s.occupiedCount -= 1;
  }
  return false;
}

function startNext(s: Search, colorIdx: number): boolean {
  if (colorIdx === s.order.length) {
    return s.occupiedCount === s.size * s.size;
  }
  const color = s.order[colorIdx];
  s.occupied[idx(s.size, color.a)] = true;
  s.occupiedCount += 1;
  s.pipes[color.id] = [{ ...color.a }];
  if (samePos(color.a, color.b)) {
    if (startNext(s, colorIdx + 1)) return true;
  } else if (!prunable(s, colorIdx + 1, color.a) && extendActive(s, colorIdx)) {
    return true;
  }
  delete s.pipes[color.id];
  s.occupied[idx(s.size, color.a)] = false;
  s.occupiedCount -= 1;
  return false;
}

/**
 * Prove a Level completable under the win-check contract (the 5-rule
 * contract enforced by isSolved/isConnected in win.ts):
 * 1. every Board Cell is filled, 2. no two Pipes overlap,
 * 3. each Pipe connects its Color's two Endpoints,
 * 4. consecutive Pipe Cells are orthogonally adjacent,
 * 5. no Pipe crosses a rival Color's Endpoint.
 * Find one Pipe per Color satisfying all five. Returns
 * the Pipes, or null when no solution exists within the step budget.
 */
export function solveLevel(
  level: Level,
  options: SolverOptions = {},
): Record<string, CellPos[]> | null {
  const { size } = level;
  if (level.colors.length === 0) return size === 0 ? {} : null;
  const order = level.colors
    .map((c, i) => ({ id: c.id, a: c.endpoints[0], b: c.endpoints[1], i }))
    .sort((p, q) => manhattan(q.a, q.b) - manhattan(p.a, p.b) || p.i - q.i)
    .map(({ id, a, b }) => ({ id, a, b }));
  const rivalEndpointOf = new Map<string, string>();
  for (const c of level.colors) {
    for (const e of c.endpoints) rivalEndpointOf.set(cellKey(e), c.id);
  }
  const s: Search = {
    size,
    order,
    rivalEndpointOf,
    occupied: new Array<boolean>(size * size).fill(false),
    occupiedCount: 0,
    pipes: {},
    steps: 0,
    exhausted: false,
    maxSteps: options.maxSteps ?? DEFAULT_MAX_STEPS,
  };
  return startNext(s, 0) ? s.pipes : null;
}
