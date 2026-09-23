import { describe, expect, it } from 'vitest';
import { GAME_NAME, PALETTE } from './theme';

describe('theme', () => {
  it('uses a distinct name, not the original game title', () => {
    expect(GAME_NAME.toLowerCase()).not.toContain('flow free');
    expect(GAME_NAME.trim().length).toBeGreaterThan(0);
  });

  it('provides one valid, distinct hex color per color id', () => {
    const ids = ['R', 'G', 'B', 'Y', 'P', 'O', 'C', 'M'];
    for (const id of ids) {
      expect(PALETTE[id]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    const values = ids.map((id) => PALETTE[id].toLowerCase());
    expect(new Set(values).size).toBe(ids.length);
  });
});
