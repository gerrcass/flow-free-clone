import { formatStars } from '../game/challenge';

interface WinOverlayProps {
  packName: string;
  levelNumber: number;
  starsEarned: number;
  hasNext: boolean;
  animated: boolean;
  onNext: () => void;
  onExit: () => void;
}

/**
 * Win overlay (#13, #14): restyled card with stars earned against Par,
 * Next Level and Level select actions. The win message keeps the
 * fill-plus-connect contract wording. The `animated` toggle gates the
 * pop/glow classes; prefers-reduced-motion kills them unconditionally
 * in App.css.
 */
export default function WinOverlay({
  packName,
  levelNumber,
  starsEarned,
  hasNext,
  animated,
  onNext,
  onExit,
}: WinOverlayProps) {
  return (
    <div
      className={animated ? 'win-overlay win-animated' : 'win-overlay'}
      role="dialog"
      aria-label={`${packName} Level ${levelNumber} complete`}
    >
      <div className="win-card">
        <p className="win" role="status">
          {packName} Level {levelNumber} complete: every Cell filled and every
          Color connected.
        </p>
        <p
          className="win-stars"
          aria-label={`Earned ${starsEarned} of 3 stars`}
        >
          Earned {starsEarned} of 3 stars{' '}
          <span aria-hidden="true">{formatStars(starsEarned)}</span>
        </p>
        <div className="win-actions">
          {hasNext ? (
            <button type="button" onClick={onNext}>
              Next Level
            </button>
          ) : (
            <p>Pack complete — every Level solved.</p>
          )}
          <button type="button" onClick={onExit}>
            Level select
          </button>
        </div>
      </div>
    </div>
  );
}
