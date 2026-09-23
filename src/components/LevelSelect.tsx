import { useState } from 'react';
import type { Pack } from '../game/pack';
import {
  isUnlockedInPack,
  packProgressCount,
  type PackProgress,
} from '../game/progress';

interface LevelSelectProps {
  packs: Pack[];
  progress: PackProgress;
  onSelect: (packId: string, index: number) => void;
}

export default function LevelSelect({ packs, progress, onSelect }: LevelSelectProps) {
  const [activePackId, setActivePackId] = useState(packs[0]?.id ?? '');
  const active = packs.find((p) => p.id === activePackId) ?? packs[0];
  if (!active) return null;
  const completed = progress[active.id] ?? [];
  const { done, total } = packProgressCount(progress, active.id);

  return (
    <div className="level-select">
      <div role="tablist" aria-label="Packs">
        {packs.map((pack) => {
          const count = packProgressCount(progress, pack.id);
          const selected = pack.id === active.id;
          return (
            <button
              key={pack.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${pack.name} Pack, ${pack.difficulty} Difficulty, ${count.done} of ${count.total} complete`}
              onClick={() => setActivePackId(pack.id)}
            >
              {pack.name} · {count.done}/{count.total}
            </button>
          );
        })}
      </div>
      <section
        role="tabpanel"
        aria-label={`${active.name} Pack, ${active.difficulty} Difficulty, ${done} of ${total} complete`}
      >
        <h2>
          {active.name} <span aria-label={`${active.difficulty} Difficulty`}>· {active.difficulty}</span>
        </h2>
        <p aria-live="polite">
          {done} of {total} complete
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
