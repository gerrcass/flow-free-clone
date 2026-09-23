import { useEffect, useMemo, useReducer, useState } from 'react';
import Board from './components/Board';
import LevelSelect from './components/LevelSelect';
import { PACK } from './game/pack';
import {
  completeLevel,
  createDefaultSettings,
  loadProgress,
  loadSettings,
  resetProgress,
  saveProgress,
  saveSettings,
} from './game/progress';
import { createInitialState, reducer } from './game/reducer';
import { fillRatio, isSolved } from './game/win';
import './App.css';

function PlayLevel({
  index,
  onWin,
  onExit,
  onNext,
}: {
  index: number;
  onWin: (index: number) => void;
  onExit: () => void;
  onNext: () => void;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(PACK[index]),
  );
  const solved = useMemo(() => isSolved(state.level, state.pipes), [state]);
  const fill = useMemo(() => fillRatio(state.level, state.pipes), [state]);
  const hasNext = index + 1 < PACK.length;

  useEffect(() => {
    if (solved) onWin(index);
  }, [solved, index, onWin]);

  return (
    <section aria-label={`Level ${index + 1}`}>
      <p className="hud" aria-live="polite">
        Filled {Math.round(fill * 100)}%
      </p>
      <Board state={state} dispatch={dispatch} />
      {solved && (
        <div className="win-overlay" role="dialog" aria-label={`Level ${index + 1} complete`}>
          <p className="win" role="status">
            Level {index + 1} complete: every Cell filled and every Color connected.
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
      )}
      {!solved && (
        <button type="button" onClick={onExit}>
          Level select
        </button>
      )}
    </section>
  );
}

function readProgress(): boolean[] {
  if (typeof localStorage === 'undefined') return [];
  return loadProgress(localStorage, PACK.length);
}

function readSettings() {
  if (typeof localStorage === 'undefined') return createDefaultSettings();
  return loadSettings(localStorage);
}

function App() {
  const [selected, setSelected] = useState<number | null>(null);
  const [completed, setCompleted] = useState<boolean[]>(readProgress);
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    saveProgress(localStorage, completed);
  }, [completed]);

  useEffect(() => {
    saveSettings(localStorage, settings);
  }, [settings]);

  const handleWin = (index: number) => {
    setCompleted((prev) => {
      if (prev[index] === true) return prev;
      return completeLevel(prev, index);
    });
  };

  const handleReset = () => {
    resetProgress(localStorage);
    setCompleted(loadProgress(localStorage, PACK.length));
    setSettings(createDefaultSettings());
    setSelected(null);
  };

  return (
    <main className="app">
      <h1>Flow Free Clone</h1>
      {selected === null ? (
        <>
          <LevelSelect completed={completed} onSelect={setSelected} />
          <fieldset className="settings">
            <legend>Settings</legend>
            <label>
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => setSettings((s) => ({ ...s, sound: e.target.checked }))}
              />{' '}
              Sound
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.animation}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, animation: e.target.checked }))
                }
              />{' '}
              Win animation
            </label>
          </fieldset>
          <button type="button" onClick={handleReset}>
            Reset progress
          </button>
        </>
      ) : (
        <PlayLevel
          key={selected}
          index={selected}
          onWin={handleWin}
          onExit={() => setSelected(null)}
          onNext={() => {
            // Winning just completed `selected`, so the next Level is
            // unlocked by construction; at the Pack end return to select.
            setSelected(selected + 1 < PACK.length ? selected + 1 : null);
          }}
        />
      )}
    </main>
  );
}

export default App;
