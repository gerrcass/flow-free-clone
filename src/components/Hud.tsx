import { formatStars } from '../game/challenge';
import { PALETTE } from '../game/theme';

export interface HudColorStatus {
  id: string;
  connected: boolean;
}

interface HudProps {
  fillPercent: number;
  par: number | null;
  stars: number;
  colors?: HudColorStatus[];
}

/**
 * In-Level HUD (#13, #14): fill percent stays the primary signal, with the
 * solver-derived Par, the earned star slot, and one dot per Color carrying
 * its connected state beside it. Dots render as a list so assistive tech
 * meets "R connected" / "G not connected" items, not color-only glyphs.
 */
export default function Hud({ fillPercent, par, stars, colors = [] }: HudProps) {
  return (
    <div className="hud">
      <p
        role="status"
        aria-label={`Filled ${fillPercent} percent, Par ${par ?? 'unknown'}, ${stars} of 3 stars`}
      >
        Filled {fillPercent}% · Par {par ?? '–'} ·{' '}
        <span aria-hidden="true">{formatStars(stars)}</span>
      </p>
      {colors.length > 0 && (
        <ul className="hud-colors" aria-label="Colors">
          {colors.map((color) => (
            <li
              key={color.id}
              aria-label={`${color.id} ${color.connected ? 'connected' : 'not connected'}`}
              className={color.connected ? 'hud-dot hud-dot-connected' : 'hud-dot'}
            >
              <span
                aria-hidden="true"
                className="hud-dot-swatch"
                style={{ backgroundColor: PALETTE[color.id] ?? '#999' }}
              />
              <span aria-hidden="true">{color.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
