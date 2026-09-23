import type { Level } from './types';

/**
 * Structurally valid but unsolvable 2x2 Board (diagonal Endpoints block
 * each other): passes share-hash structural decode, fails the Solver
 * seam. Shared by the share unit and component suites (#16).
 */
export const UNSOLVABLE_LEVEL: Level = {
  size: 2,
  colors: [
    { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 1, col: 1 }] },
    { id: 'G', endpoints: [{ row: 0, col: 1 }, { row: 1, col: 0 }] },
  ],
};

/** Hardcoded 5x5 fixture Level (ticket #1). Real Pack data lands with #2. */
export const FIXTURE_LEVEL: Level = {
  size: 5,
  colors: [
    { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 0, col: 4 }] },
    { id: 'G', endpoints: [{ row: 1, col: 0 }, { row: 1, col: 4 }] },
    { id: 'B', endpoints: [{ row: 2, col: 0 }, { row: 2, col: 4 }] },
    { id: 'Y', endpoints: [{ row: 3, col: 0 }, { row: 3, col: 4 }] },
    { id: 'P', endpoints: [{ row: 4, col: 0 }, { row: 4, col: 4 }] },
  ],
};
