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
 * Win overlay (#14): stars earned against Par, with Next Level and
 * Level select actions. The win message keeps the fill-plus-connect
 * contract wording.
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
      <p className="win" role="status">
        {packName} Level {levelNumber} complete: every Cell filled and every
        Color connected.
      </p>
      <p aria-label={`Earned ${starsEarned} of 3 stars`}>
        Earned {starsEarned} of 3 stars{' '}
        <span aria-hidden="true">{formatStars(starsEarned)}</span>
      </p>
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
  );
}
