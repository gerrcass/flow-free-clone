import { describe, expect, it } from 'vitest';
import { GAME_NAME, PALETTE } from './theme';

describe('theme', () => {
  const ids = ['R', 'G', 'B', 'Y', 'P', 'O', 'C', 'M'];

  it('uses a distinct name, not the original game title', () => {
    expect(GAME_NAME.toLowerCase()).not.toContain('flow free');
    expect(GAME_NAME.trim().length).toBeGreaterThan(0);
  });

  it('provides one valid, distinct hex color per color id', () => {
    for (const id of ids) {
      expect(PALETTE[id]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    const values = ids.map((id) => PALETTE[id].toLowerCase());
    expect(new Set(values).size).toBe(ids.length);
  });

  it('keeps every color pair perceptually separated (min hue distance)', () => {
    const hueOf = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return 0;
      const d = max - min;
      let h = 0;
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      return h < 0 ? h + 360 : h;
    };
    let minDistance = 180;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = hueOf(PALETTE[ids[i]]);
        const b = hueOf(PALETTE[ids[j]]);
        const distance = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
        minDistance = Math.min(minDistance, distance);
      }
    }
    // Guards the old R/M and G/C near-collisions: every pair stays ≥20° apart.
    expect(minDistance).toBeGreaterThanOrEqual(20);
  });
});
