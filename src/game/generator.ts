import type { CellPos, Level } from './types';

export const PACK_SEED = 20260922;

/** Color ids in Pack order. Board palette gains O/C/M with #4. */
export const PACK_COLOR_IDS = ['R', 'G', 'B', 'Y', 'P', 'O', 'C', 'M'] as const;

/** [Board size, Color count] ramp for the v1 Pack. */
export const PACK_PLAN: [size: number, colors: number][] = [
  [5, 3], [5, 3], [5, 4], [5, 4], [5, 4], [5, 5], [5, 5], [5, 5],
  [6, 4], [6, 4], [6, 4], [6, 5], [6, 5], [6, 5], [6, 6], [6, 6],
  [7, 4], [7, 5], [7, 5], [7, 5], [7, 6], [7, 6], [7, 6],
  [8, 5], [8, 5], [8, 6], [8, 6], [8, 6], [8, 7], [8, 8],
];

export interface GeneratedLevel {
  level: Level;
  /** Full-Board solution the generator built the Level from. */
  solution: Record<string, CellPos[]>;
}

/** Seeded PRNG so the Pack regenerates bit-for-bit from PACK_SEED. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Band = { kind: 'single' } | { kind: 'double' } | { kind: 'split' };

function shuffled<T>(rng: () => number, items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function straightRow(r: number, size: number): CellPos[] {
  return Array.from({ length: size }, (_, c) => ({ row: r, col: c }));
}

/**
 * Hamiltonian path covering rows r..r+1. S-snakes end on the short-side
 * corners; the comb ends on the top corners (even widths) or a diagonal
 * (odd widths). Same-side/diagonal corners on odd/even widths admit no
 * Hamiltonian path (checkerboard parity), so those pairings are excluded.
 */
function snakeBand(r: number, size: number, variant: number): CellPos[] {
  const top = straightRow(r, size);
  const bottom = straightRow(r + 1, size);
  if (variant === 1) {
    return [...top.reverse(), ...bottom];
  }
  if (variant === 2) {
    const path: CellPos[] = [{ ...top[0] }];
    let c = 0;
    while (c + 1 < size) {
      path.push({ row: r + 1, col: c }, { row: r + 1, col: c + 1 }, { row: r, col: c + 1 });
      c += 1;
      if (c + 1 < size) {
        path.push({ row: r, col: c + 1 });
        c += 1;
      }
    }
    if (size % 2 === 1) path.push({ row: r + 1, col: size - 1 });
    return path;
  }
  if (variant === 3) {
    const mirror = (at: CellPos): CellPos => ({ row: at.row, col: size - 1 - at.col });
    return snakeBand(r, size, 2).map(mirror);
  }
  return [...top, ...bottom.reverse()];
}

function snakeVariants(size: number): number[] {
  return size % 2 === 1 ? [0, 1, 2, 3] : [0, 1, 2];
}

function transposePath(path: CellPos[]): CellPos[] {
  return path.map(({ row, col }) => ({ row: col, col: row }));
}

export function generateLevel(size: number, colorCount: number, seed: number): GeneratedLevel {
  if (colorCount < 2 || colorCount > PACK_COLOR_IDS.length) {
    throw new Error(`colorCount ${colorCount} out of range`);
  }
  const rng = mulberry32(seed);
  let splitRows = Math.min(2, Math.floor(colorCount / 2), Math.floor(rng() * 3));
  let twoRowBands = splitRows + size - colorCount;
  let singleRows = colorCount - 2 * splitRows - twoRowBands;
  while ((singleRows < 0 || twoRowBands < 0) && splitRows > 0) {
    splitRows -= 1;
    twoRowBands = splitRows + size - colorCount;
    singleRows = colorCount - 2 * splitRows - twoRowBands;
  }
  if (singleRows < 0 || twoRowBands < 0) {
    throw new Error(`cannot tile ${size}x${size} with ${colorCount} Colors`);
  }
  const bands = shuffled<Band>(rng, [
    ...Array.from({ length: splitRows }, (): Band => ({ kind: 'split' })),
    ...Array.from({ length: twoRowBands }, (): Band => ({ kind: 'double' })),
    ...Array.from({ length: singleRows }, (): Band => ({ kind: 'single' })),
  ]);
  const transpose = rng() < 0.5;

  const paths: CellPos[][] = [];
  let row = 0;
  for (const band of bands) {
    if (band.kind === 'single') {
      paths.push(straightRow(row, size));
      row += 1;
    } else if (band.kind === 'double') {
      const variants = snakeVariants(size);
      paths.push(snakeBand(row, size, variants[Math.floor(rng() * variants.length)]));
      row += 2;
    } else {
      const k = 1 + Math.floor(rng() * (size - 3));
      paths.push(Array.from({ length: k + 1 }, (_, c) => ({ row, col: c })));
      paths.push(
        Array.from({ length: size - k - 1 }, (_, i) => ({ row, col: k + 1 + i })),
      );
      row += 1;
    }
  }

  const level: Level = { size, colors: [] };
  const solution: Record<string, CellPos[]> = {};
  paths.forEach((raw, i) => {
    const id = PACK_COLOR_IDS[i];
    const path = transpose ? transposePath(raw) : raw;
    level.colors.push({
      id,
      endpoints: [{ ...path[0] }, { ...path[path.length - 1] }],
    });
    solution[id] = path.map((c) => ({ ...c }));
  });
  return { level, solution };
}

export function generatePack(masterSeed: number = PACK_SEED): GeneratedLevel[] {
  return PACK_PLAN.map(([size, colors], i) =>
    generateLevel(size, colors, (masterSeed + i * 7919) >>> 0),
  );
}
