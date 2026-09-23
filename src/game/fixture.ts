import type { Level } from './types';

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
