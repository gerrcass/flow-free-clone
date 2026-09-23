import { formatStars } from '../game/challenge';

interface HudProps {
  fillPercent: number;
  par: number | null;
  stars: number;
}

/**
 * In-Level HUD (#14): fill percent stays the primary signal, with the
 * solver-derived Par and the earned star slot beside it.
 */
export default function Hud({ fillPercent, par, stars }: HudProps) {
  return (
    <p
      className="hud"
      role="status"
      aria-label={`Filled ${fillPercent} percent, Par ${par ?? 'unknown'}, ${stars} of 3 stars`}
    >
      Filled {fillPercent}% · Par {par ?? '–'} ·{' '}
      <span aria-hidden="true">{formatStars(stars)}</span>
    </p>
  );
}
