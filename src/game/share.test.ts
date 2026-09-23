import { describe, expect, it } from 'vitest';
import { FIXTURE_LEVEL } from './fixture';
import { PACK } from './pack';
import {
  buildShareHash,
  decodeLevelPayload,
  encodeLevel,
  loadSharedLevelFromHash,
  parseShareHash,
} from './share';
import type { Level } from './types';

describe('share-via-URL round-trip (#16)', () => {
  it('round-trips the fixture Board through the hash payload', () => {
    const hash = buildShareHash(FIXTURE_LEVEL);
    expect(hash.startsWith('#level=')).toBe(true);
    expect(parseShareHash(hash)).toEqual(FIXTURE_LEVEL);
  });

  it('round-trips every shipped Pack Level to the identical Board', () => {
    for (const level of PACK) {
      expect(parseShareHash(buildShareHash(level))).toEqual(level);
    }
  });

  it('encodes to URL-safe base64 with no padding or reserved chars', () => {
    const payload = encodeLevel(FIXTURE_LEVEL);
    expect(payload).not.toContain('=');
    expect(payload).not.toContain('+');
    expect(payload).not.toContain('/');
    expect(payload).not.toContain('#');
    expect(decodeLevelPayload(payload)).toEqual(FIXTURE_LEVEL);
  });
});

describe('invalid-link handling (#16)', () => {
  it('rejects empty, truncated, and non-base64 hashes', () => {
    expect(parseShareHash('')).toBeNull();
    expect(parseShareHash('#level=')).toBeNull();
    expect(parseShareHash('#level=!!!not-base64!!!')).toBeNull();
    const payload = encodeLevel(FIXTURE_LEVEL);
    expect(parseShareHash(`#level=${payload.slice(0, 4)}`)).toBeNull();
  });

  it('rejects wrong fragments and only reads the level token', () => {
    expect(parseShareHash('#other=abc')).toBeNull();
    const payload = encodeLevel(FIXTURE_LEVEL);
    expect(parseShareHash(`#level=${payload}&foo=bar`)).toEqual(FIXTURE_LEVEL);
  });

  it('rejects out-of-bounds and overlapping Endpoints', () => {
    const badBounds: Level = {
      size: 5,
      colors: [{ id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 5, col: 5 }] }],
    };
    expect(parseShareHash(buildShareHash(badBounds))).toBeNull();
    const overlap: Level = {
      size: 5,
      colors: [
        { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
        { id: 'G', endpoints: [{ row: 0, col: 1 }, { row: 4, col: 4 }] },
      ],
    };
    expect(parseShareHash(buildShareHash(overlap))).toBeNull();
  });

  it('rejects duplicate ids, bad sizes, and tampered payloads', () => {
    const dup: Level = {
      size: 5,
      colors: [
        { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
        { id: 'R', endpoints: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
      ],
    };
    expect(parseShareHash(buildShareHash(dup))).toBeNull();
    expect(decodeLevelPayload(encodeLevel({ size: 1, colors: [] }))).toBeNull();
    expect(decodeLevelPayload(encodeLevel({ size: 10, colors: [] }))).toBeNull();
    // Valid base64 of non-Level JSON decodes structurally invalid.
    expect(decodeLevelPayload('bnVsbA')).toBeNull();
  });
});

describe('solver verification on load (#16)', () => {
  const unsolvable: Level = {
    size: 2,
    colors: [
      { id: 'R', endpoints: [{ row: 0, col: 0 }, { row: 1, col: 1 }] },
      { id: 'G', endpoints: [{ row: 0, col: 1 }, { row: 1, col: 0 }] },
    ],
  };

  it('loads a solvable shared Board', () => {
    expect(loadSharedLevelFromHash(buildShareHash(FIXTURE_LEVEL))).toEqual(
      FIXTURE_LEVEL,
    );
  });

  it('rejects a structurally valid but unsolvable shared Board', () => {
    // Passes structural decode but fails the Solver seam.
    expect(parseShareHash(buildShareHash(unsolvable))).toEqual(unsolvable);
    expect(loadSharedLevelFromHash(buildShareHash(unsolvable))).toBeNull();
  });

  it('rejects garbage hashes without running the solver', () => {
    expect(loadSharedLevelFromHash('#level=!!!')).toBeNull();
    expect(loadSharedLevelFromHash('')).toBeNull();
  });
});
