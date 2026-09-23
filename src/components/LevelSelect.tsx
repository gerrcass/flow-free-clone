import { useState } from 'react';
import { describePack, findPackById, packAriaLabel } from '../game/pack';
import type { Pack } from '../game/pack';
import { isUnlockedInPack, type PackProgress } from '../game/progress';

interface LevelSelectProps {
  packs: Pack[];
  progress: PackProgress;
  initialPackId?: string;
  onSelect: (packId: string, index: number) => void;
}

export default function LevelSelect({
  packs,
  progress,
  initialPackId,
  onSelect,
}: LevelSelectProps) {
  const [activePackId, setActivePackId] = useState(
    initialPackId ?? packs[0]?.id ?? '',
  );
  const active = findPackById(packs, activePackId);
  if (!active) return null;
  const completed = progress[active.id] ?? [];
  const summary = describePack(progress, active);

  return (
    <div className="level-select">
      <div role="tablist" aria-label="Packs">
        {packs.map((pack) => {
          const summary = describePack(progress, pack);
          const selected = pack.id === active.id;
          return (
            <button
              key={pack.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={packAriaLabel(pack, summary)}
              onClick={() => setActivePackId(pack.id)}
            >
              {pack.name} · {summary.difficulty} Difficulty · {summary.done}/
              {summary.total}
            </button>
          );
        })}
      </div>
      <section role="tabpanel" aria-label={packAriaLabel(active, summary)}>
        <h2>
          {active.name}{' '}
          <span aria-label={`${summary.difficulty} Difficulty`}>
            · {summary.difficulty}
          </span>
        </h2>
        <p aria-live="polite">
          {summary.done} of {summary.total} complete
        </p>
        <ol className="level-grid">
          {active.levels.map((_, index) => {
            const isDone = completed[index] === true;
            const unlocked = isUnlockedInPack(completed, index);
            const label = `${active.name} Level ${index + 1}${isDone ? ', completed' : ''}${unlocked ? '' : ', locked'}`;
            return (
              <li key={index}>
                <button
                  type="button"
                  className="level-button"
                  disabled={!unlocked}
                  onClick={() => onSelect(active.id, index)}
                  aria-label={label}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  {isDone && (
                    <span aria-hidden="true" className="checkmark">
                      {' '}
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
