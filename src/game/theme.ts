/** Pipe Trails brand wordmark (v2 direction per ADR 0006). */
export const GAME_NAME = 'Pipe Trails';

/**
 * Self-hosted rounded display face for headings and the wordmark (#15).
 * Baloo 2 (SIL OFL 1.1) variable latin subset vendored at
 * `public/fonts/baloo-2-latin.woff2`, preloaded from `index.html`;
 * no runtime CDN font fetch, so the offline shell never flashes
 * invisible text. Body and HUD stay on the system stack.
 */
export const DISPLAY_FONT_FAMILY = 'Pipe Trails Display';
export const DISPLAY_FONT_URL = '/fonts/baloo-2-latin.woff2';
export const DISPLAY_FONT_WEIGHTS = '400 800';

/**
 * Original 8-Color palette keyed by Pack Color id.
 * Chosen for separation on dark Cells (min ~25° hue distance between any
 * two Colors); not sampled from any existing game.
 */
export const PALETTE: Record<string, string> = {
  R: '#ef476f',
  G: '#06d6a0',
  B: '#3a86ff',
  Y: '#ffe66d',
  P: '#9b5de5',
  O: '#f3722c',
  C: '#a3e635',
  M: '#d946ef',
};
