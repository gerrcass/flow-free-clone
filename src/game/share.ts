import { solveLevel } from './solver';
import type { Level } from './types';

export const SHARE_HASH_PREFIX = '#level=';

const MIN_SIZE = 2;
const MAX_SIZE = 9;
const MAX_COLORS = 8;
const ID_PATTERN = /^[A-Za-z0-9]{1,2}$/;

type CompactColor = [id: string, r1: number, c1: number, r2: number, c2: number];

interface CompactLevel {
  s: number;
  c: CompactColor[];
}

function toCompact(level: Level): CompactLevel {
  return {
    s: level.size,
    c: level.colors.map((color) => [
      color.id,
      color.endpoints[0].row,
      color.endpoints[0].col,
      color.endpoints[1].row,
      color.endpoints[1].col,
    ]),
  };
}

/** Browser-safe base64url encode (Buffer in node/tests, btoa in browser). */
function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 =
    typeof globalThis.Buffer !== 'undefined'
      ? globalThis.Buffer.from(binary, 'binary').toString('base64')
      : btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Browser-safe base64url decode to text, or null on bad input. */
function decodeBase64Url(payload: string): string | null {
  if (payload.length === 0 || /[^A-Za-z0-9\-_]/.test(payload)) return null;
  let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 1) return null;
  if (pad !== 0) base64 += '='.repeat(4 - pad);
  try {
    const binary =
      typeof globalThis.Buffer !== 'undefined'
        ? globalThis.Buffer.from(base64, 'base64').toString('binary')
        : atob(base64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function isIntIn(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
  );
}

/**
 * Structural validation only (no solver): size 2-9, 1-8 Colors, unique
 * 1-2 char alphanumeric ids, integer Endpoints in bounds, all Endpoint
 * Cells distinct. Returns the Level, or null for any malformed payload.
 */
function fromCompact(doc: unknown): Level | null {
  if (typeof doc !== 'object' || doc === null) return null;
  const { s, c } = doc as { s?: unknown; c?: unknown };
  if (!isIntIn(s, MIN_SIZE, MAX_SIZE)) return null;
  if (!Array.isArray(c) || c.length < 1 || c.length > MAX_COLORS) return null;
  const seenIds = new Set<string>();
  const seenCells = new Set<string>();
  const colors: Level['colors'] = [];
  for (const entry of c) {
    if (!Array.isArray(entry) || entry.length !== 5) return null;
    const [id, r1, c1, r2, c2] = entry as unknown[];
    if (typeof id !== 'string' || !ID_PATTERN.test(id) || seenIds.has(id)) {
      return null;
    }
    if (
      !isIntIn(r1, 0, s - 1) ||
      !isIntIn(c1, 0, s - 1) ||
      !isIntIn(r2, 0, s - 1) ||
      !isIntIn(c2, 0, s - 1)
    ) {
      return null;
    }
    const keys = [`${r1},${c1}`, `${r2},${c2}`];
    if (keys[0] === keys[1]) return null;
    for (const key of keys) {
      if (seenCells.has(key)) return null;
      seenCells.add(key);
    }
    seenIds.add(id);
    colors.push({
      id,
      endpoints: [
        { row: r1 as number, col: c1 as number },
        { row: r2 as number, col: c2 as number },
      ],
    });
  }
  return { size: s, colors };
}

/** Encode a Level to the URL-safe hash payload (no prefix). */
export function encodeLevel(level: Level): string {
  return encodeBase64Url(JSON.stringify(toCompact(level)));
}

/** Decode a payload to a Level with structural validation, no solving. */
export function decodeLevelPayload(payload: string): Level | null {
  const text = decodeBase64Url(payload);
  if (text === null) return null;
  try {
    return fromCompact(JSON.parse(text));
  } catch {
    return null;
  }
}

/** Full `#level=<payload>` hash for a Level (hash stays client-only). */
export function buildShareHash(level: Level): string {
  return `${SHARE_HASH_PREFIX}${encodeLevel(level)}`;
}

/**
 * Parse a location hash to a structurally valid Level, or null.
 * Reads only the `level` token so trailing params (`&...`) are ignored.
 */
export function parseShareHash(hash: string): Level | null {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  const token = hash.slice(SHARE_HASH_PREFIX.length).split('&')[0] ?? '';
  if (token.length === 0) return null;
  return decodeLevelPayload(token);
}

/** Full shareable URL for a Level: origin + path + hash fragment. */
export function shareUrlFor(level: Level): string {
  const hash = buildShareHash(level);
  try {
    const { origin, pathname, search } = window.location;
    return `${origin}${pathname}${search}${hash}`;
  } catch {
    return hash;
  }
}

/**
 * Copy the share URL; resolves the URL either way. Clipboard failure
 * (permissions, insecure context) is swallowed: the hash itself never
 * needs the network, so the link stays usable.
 */
export async function copyShareLink(level: Level): Promise<string> {
  const url = shareUrlFor(level);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Best-effort only; the URL is still returned for display.
  }
  return url;
}

/**
 * Load a shared Board from a location hash (#16): structural decode plus
 * Solver-seam verification that the Board is completable. Returns the
 * identical Board, or null for invalid links and unsolvable Boards.
 * Verification shares the solver's step budget: pathological Boards past
 * the budget read as unsolvable, the same limit the Pack tools accept.
 */
export function loadSharedLevelFromHash(hash: string): Level | null {
  const level = parseShareHash(hash);
  if (level === null) return null;
  return solveLevel(level) === null ? null : level;
}
