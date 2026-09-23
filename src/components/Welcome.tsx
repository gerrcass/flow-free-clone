import { describePack, findPackById, packAriaLabel } from '../game/pack';
import type { Pack } from '../game/pack';
import { findContinueTarget } from '../game/progress';
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
 * the highest unlocked Pack/Level, Mode display (Free Play
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
  // Highest unlocked Pack/Level, or null when nothing is resumable
  // (fresh player or everything complete). Continue stays visible but
  // greyed then — the affordance mirrors the Time Trial pattern —
  // while Play is always the way forward.
  const target = findContinueTarget(progress, packs);
  const targetPack = target ? findPackById(packs, target.packId) : undefined;
  const allPacksComplete =
    packs.length > 0 &&
    packs.every(
      (pack) => describePack(progress, pack).done === pack.levels.length,
    );

  return (
    <div className="welcome">
      {/* Hero rise is CSS-only (#15): no settings toggle involved, and
        prefers-reduced-motion disables it — see App.css. */}
      <header className="welcome-hero">
        <h1>{GAME_NAME}</h1>
        <p className="tagline">Connect every Color, fill every Cell. Free Play, no timer.</p>
      </header>

      {target && targetPack ? (
        <button
          type="button"
          onClick={() => onContinue(target)}
          aria-label={`Continue ${targetPack.name} Level ${target.index + 1}`}
        >
          Continue: {targetPack.name} Level {target.index + 1}
        </button>
      ) : (
        <button
          type="button"
          disabled
          aria-label={
            allPacksComplete
              ? 'Continue: everything complete'
              : 'Continue: no saved progress yet'
          }
        >
          Continue
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
            const summary = describePack(progress, pack);
            return (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => onEnterPack(pack.id)}
                  aria-label={packAriaLabel(pack, summary)}
                >
                  {pack.name} · {summary.difficulty} · {summary.done}/
                  {summary.total}
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
