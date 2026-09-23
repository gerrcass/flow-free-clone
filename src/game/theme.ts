/** Pipe Trails brand wordmark (v2 direction per ADR 0006). */
export const GAME_NAME = 'Pipe Trails';

/**
 * Self-hosted rounded display face for headings and the wordmark (#15).
 * Baloo 2 (SIL OFL 1.1) variable latin subset vendored at
 * `public/fonts/baloo-2-latin.woff2`, preloaded from `index.html`;
 * no runtime CDN font fetch, so the offline shell never flashes
 * invisible text. Body and HUD stay on the system stack.
 * The path is base-relative (no leading slash) so it holds under
 * subpath static hosting; `index.html` uses `./`-prefixed document-
 * relative form, CSS uses root-absolute form rebased by Vite's
 * relative base, and the worker uses scope-relative form.
 */
export const DISPLAY_FONT_FAMILY = 'Pipe Trails Display';
export const DISPLAY_FONT_FILE = 'fonts/baloo-2-latin.woff2';

/**
 * Retuned 8-Color palette keyed by Pack Color id (#13).
 * Every Color holds >=4:1 contrast against the dark Cell fill (#262933)
 * with >=25° hue distance between any two Colors; identities unchanged
 * from the original set, brightened where the old values dipped (B, P,
 * O, M, R) so open Pipes stay legible next to the white Endpoint rings.
 * Not sampled from any existing game.
 */
export const PALETTE: Record<string, string> = {
  R: '#f2557a',
  G: '#06d6a0',
  B: '#5b9bff',
  Y: '#ffe66d',
  P: '#b388ff',
  O: '#f97f2e',
  C: '#a3e635',
  M: '#e052f5',
};
