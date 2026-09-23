import { findPackById } from '../game/pack';
import type { Pack } from '../game/pack';
import { findContinueTarget, packProgressCount } from '../game/progress';
import type { PackProgress, Settings } from '../game/progress';
import { GAME_NAME } from '../game/theme';
import SettingsControls from './SettingsControls';

interface WelcomeProps {
  packs: Pack[];
  progress: PackProgress;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  /** Fresh players enter Level select; returning players jump to a Level. */
  onPlay: () => void;
  onContinue: (packId: string, index: number) => void;
  onEnterPack: (packId: string) => void;
}

/**
 * Pre-game Welcome Screen (#15, ADR 0006): brand hero, Continue resuming
 * the highest unlocked Pack/Level, Mode card (Free Play active, Time
 * Trial reserved for v3 with no logic behind it), and Pack entry into
 * Level select. Toggles live here too so accessibility settings carry
 * through from the first moment.
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
  const hasProgress = packs.some(
    (pack) => packProgressCount(progress, pack.id).done > 0,
  );
  const target = hasProgress ? findContinueTarget(progress, packs) : null;
  const targetPack = target ? findPackById(packs, target.packId) : undefined;

  return (
    <div className="welcome">
      <header
        className={settings.animation ? 'welcome-hero welcome-animated' : 'welcome-hero'}
      >
        <h1>{GAME_NAME}</h1>
        <p className="tagline">Connect every Color, fill every Cell. Free Play, no timer.</p>
      </header>

      {target && targetPack ? (
        <button
          type="button"
          onClick={() => onContinue(target.packId, target.index)}
          aria-label={`Continue ${targetPack.name} Level ${target.index + 1}`}
        >
          Continue: {targetPack.name} Level {target.index + 1}
        </button>
      ) : (
        <button type="button" onClick={onPlay} aria-label={`Play ${GAME_NAME}`}>
          Play
        </button>
      )}

      <section aria-label="Mode">
        <h2>Mode</h2>
        <button
          type="button"
          onClick={onPlay}
          aria-label="Free Play Mode, active, no timer"
        >
          Free Play · active
        </button>
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
            return (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => onEnterPack(pack.id)}
                  aria-label={`${pack.name} Pack, ${pack.difficulty} Difficulty, ${done} of ${total} complete`}
                >
                  {pack.name} · {pack.difficulty} · {done}/{total}
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
