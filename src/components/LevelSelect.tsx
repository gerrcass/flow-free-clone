import { PACK } from '../game/pack';
import { groupBySize, isUnlocked } from '../game/progress';

interface LevelSelectProps {
  completed: boolean[];
  onSelect: (index: number) => void;
}

export default function LevelSelect({ completed, onSelect }: LevelSelectProps) {
  const groups = groupBySize(PACK);
  return (
    <div className="level-select">
      {groups.map((group) => (
        <section key={group.size} aria-label={`${group.size} by ${group.size} Levels`}>
          <h2>
            {group.size} × {group.size}
          </h2>
          <ol className="level-grid">
            {group.indices.map((index) => {
              const done = completed[index] === true;
              const unlocked = isUnlocked(completed, index);
              const label = `Level ${index + 1}${done ? ', completed' : ''}${unlocked ? '' : ', locked'}`;
              return (
                <li key={index}>
                  <button
                    type="button"
                    className="level-button"
                    disabled={!unlocked}
                    onClick={() => onSelect(index)}
                    aria-label={label}
                  >
                    <span aria-hidden="true">{index + 1}</span>
                    {done && (
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
      ))}
    </div>
  );
}
