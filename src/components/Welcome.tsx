import { displayDifficulty, findPackById } from '../game/pack';
import type { Pack } from '../game/pack';
import { findContinueTarget, packProgressCount } from '../game/progress';
import type { ContinueTarget, PackProgress, Settings } from '../game/progress';
import { GAME_NAME } from '../game/theme';
import SettingsControls from './SettingsControls';

interface WelcomeProps {
  packs: Pack[];
  progress: PackProgress;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  /** Browse Packs and Levels in Level select. */
  onPlay: () => void;
  onContinue: (target: ContinueTarget) => void;
  onEnterPack: (packId: string) => void;
}

/**
 * Pre-game Welcome Screen (#15, ADR 0006): brand hero, Continue resuming
 * the earliest unfinished Level in Pack order, Mode display (Free Play
 * active, Time Trial reserved for v3 with no logic behind it), and Pack
 * entry into Level select. Toggles live here too so accessibility settings
 * carry through from the first moment.
 */
export default function Welcome({
  packs,
  progress,
  settings,
  onSettingsChange,
  onPlay,
  onContinue,
  onEnterPack,
}: WelcomeProps) {
  // Earliest unfinished Level in Pack order, or null when everything is
  // complete: then Play (browse/replay) is the only affordance.
  const target = findContinueTarget(progress, packs);
  const targetPack = target ? findPackById(packs, target.packId) : undefined;

  return (
    <div className="welcome">
      {/* Static hero on purpose (#15): gating its rise on the win-overlay
        toggle conflated two settings, so the hero carries no motion and
        reduced-motion holds trivially here. */}
      <header className="welcome-hero">
        <h1>{GAME_NAME}</h1>
        <p className="tagline">Connect every Color, fill every Cell. Free Play, no timer.</p>
      </header>

      {target && targetPack && (
        <button
          type="button"
          onClick={() => onContinue(target)}
          aria-label={`Continue ${targetPack.name} Level ${target.index + 1}`}
        >
          Continue: {targetPack.name} Level {target.index + 1}
        </button>
      )}
      <button type="button" onClick={onPlay} aria-label={`Play ${GAME_NAME}`}>
        Play
      </button>

      <section aria-label="Mode">
        <h2>Mode</h2>
        <p aria-label="Free Play Mode, active, no timer">Free Play · active</p>
        <button
          type="button"
          disabled
          aria-label="Time Trial Mode, coming in version 3"
        >
          Time Trial · coming in v3
        </button>
      </section>

      <nav aria-label="Packs">
        <h2>Packs</h2>
        <ul className="welcome-packs">
          {packs.map((pack) => {
            const { done, total } = packProgressCount(progress, pack.id);
            const difficulty = displayDifficulty(pack.difficulty);
            return (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => onEnterPack(pack.id)}
                  aria-label={`${pack.name} Pack, ${difficulty} Difficulty, ${done} of ${total} complete`}
                >
                  {pack.name} · {difficulty} · {done}/{total}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <SettingsControls settings={settings} onChange={onSettingsChange} />
    </div>
  );
}
