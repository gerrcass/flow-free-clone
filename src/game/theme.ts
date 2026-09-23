/** Distinct clean-room branding (no assets copied from the original game). */
export const GAME_NAME = 'Hue Trails';

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
