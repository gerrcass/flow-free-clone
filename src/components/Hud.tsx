import { useId } from 'react';
import { formatStars } from '../game/challenge';
import { colorHex, type ColorId } from '../game/theme';
import { connectedClass } from './connectedClass';

export interface HudColorStatus {
  id: ColorId;
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
 * its connected state beside it. Each dot is named by explicit
 * `aria-labelledby` over its own visible id text plus a visually-hidden
 * status word: a single naming source, no `aria-label` on the item, no
 * hidden text, and color is never the only signal.
 */
export default function Hud({ fillPercent, par, stars, colors = [] }: HudProps) {
  const labelBase = useId();
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
          {colors.map((color) => {
            const nameId = `${labelBase}-${color.id}-name`;
            const statusId = `${labelBase}-${color.id}-status`;
            return (
              <li
                key={color.id}
                aria-labelledby={`${nameId} ${statusId}`}
                className={connectedClass('hud-dot', color.connected)}
              >
                <span
                  aria-hidden="true"
                  className="hud-dot-swatch"
                  style={{ backgroundColor: colorHex(color.id) }}
                />
                <span id={nameId}>{color.id}</span>{' '}
                <span id={statusId} className="visually-hidden">
                  {color.connected ? 'connected' : 'not connected'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
