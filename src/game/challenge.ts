import type { Level } from './types';
import { solveLevel } from './solver';

export type Stars = 1 | 2 | 3;

/**
 * Star thresholds over solver-derived Par (#14, ADR 0004): Par is the
 * total Pipe Cell count of the solver's full-fill solution, which equals
 * Board Cells for every solvable Level. Thresholds split the shipped
 * Boards so Starter 5x5 earns one star, mid Boards earn two, and dense
 * 8x8 Expert Boards earn three:
 * - Par <= 25: 1 star
 * - Par 26-49: 2 stars
 * - Par >= 50: 3 stars
 */
export const PAR_ONE_STAR_MAX = 25;
export const PAR_TWO_STAR_MAX = 49;

/**
 * Solver-derived Par for a Level (#14): the total Pipe Cell count of one
 * solver solution under the win-check contract (fill every Cell, connect
 * every Color). Returns null when the solver finds no solution within its
 * step budget, so unsolvable Boards never award stars.
 */
export function computePar(level: Level): number | null {
  const pipes = solveLevel(level);
  if (pipes === null) return null;
  return Object.values(pipes).reduce((total, pipe) => total + pipe.length, 0);
}

/** Map a Par value to 1-3 stars per the documented thresholds above. */
export function starsForPar(par: number): Stars {
  if (par <= PAR_ONE_STAR_MAX) return 1;
  if (par <= PAR_TWO_STAR_MAX) return 2;
  return 3;
}

/**
 * Stars awarded for completing a Level (#14): its solver-derived Par
 * mapped through the thresholds, or null when the Level has no solver
 * solution. Never changes the win-check itself (see win.ts).
 */
export function starsForLevel(level: Level): Stars | null {
  const par = computePar(level);
  if (par === null) return null;
  return starsForPar(par);
}

/** Three-slot glyph for HUD and win overlay (#14): earned filled, rest empty. */
export function formatStars(earned: number): string {
  const filled = Math.min(3, Math.max(0, Math.floor(earned)));
  return '★'.repeat(filled) + '☆'.repeat(3 - filled);
}
