import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Board from './components/Board';
import LevelSelect from './components/LevelSelect';
import { PACKS } from './game/pack';
import {
  completeLevel,
  createDefaultSettings,
  loadPackProgress,
  loadSettings,
  resetProgress,
  savePackProgress,
  saveSettings,
} from './game/progress';
import type { PackProgress, Settings } from './game/progress';
import { createInitialState, reducer } from './game/reducer';
import { playWinSound } from './game/sound';
import { GAME_NAME } from './game/theme';
import { fillRatio, isSolved } from './game/win';
import './App.css';

interface Selection {
  packId: string;
  index: number;
}

function PlayLevel({
  selection,
  settings,
  onWin,
  onExit,
  onNext,
}: {
  selection: Selection;
  settings: Settings;
  onWin: (packId: string, index: number) => void;
  onExit: () => void;
  onNext: () => void;
}) {
  const pack = PACKS.find((p) => p.id === selection.packId) ?? PACKS[0];
  const levelNumber = selection.index + 1;
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(pack.levels[selection.index]),
  );
  const solved = useMemo(() => isSolved(state.level, state.pipes), [state]);
  const fill = useMemo(() => fillRatio(state.level, state.pipes), [state]);
  const hasNext = selection.index + 1 < pack.levels.length;
  // PlayLevel remounts per Level, so this ref tracks the unsolved→solved
  // transition within one Level only.
  const wasSolved = useRef(false);

  useEffect(() => {
    if (solved) onWin(pack.id, selection.index);
  }, [solved, pack.id, selection.index, onWin]);

  useEffect(() => {
    // Fire only on the solving transition: flipping the sound toggle
    // on an already-solved Board must not replay the chime.
    if (solved && !wasSolved.current) playWinSound({ enabled: settings.sound });
    wasSolved.current = solved;
  }, [solved, settings.sound]);

  return (
    <section aria-label={`${pack.name} Level ${levelNumber}`}>
      <p className="hud" aria-live="polite">
        Filled {Math.round(fill * 100)}%
      </p>
      <Board state={state} dispatch={dispatch} />
      {solved && (
        <div
          className={settings.animation ? 'win-overlay win-animated' : 'win-overlay'}
          role="dialog"
          aria-label={`${pack.name} Level ${levelNumber} complete`}
        >
          <p className="win" role="status">
            {pack.name} Level {levelNumber} complete: every Cell filled and every
            Color connected.
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

function readProgress(): PackProgress {
  if (typeof localStorage === 'undefined') return loadPackProgress(
    { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    PACKS,
  );
  return loadPackProgress(localStorage, PACKS);
}

function readSettings() {
  if (typeof localStorage === 'undefined') return createDefaultSettings();
  return loadSettings(localStorage);
}

function App() {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [completed, setCompleted] = useState<PackProgress>(readProgress);
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    savePackProgress(localStorage, completed);
  }, [completed]);

  useEffect(() => {
    saveSettings(localStorage, settings);
  }, [settings]);

  const handleWin = (packId: string, index: number) => {
    setCompleted((prev) => {
      const arr = prev[packId] ?? [];
      if (arr[index] === true) return prev;
      return { ...prev, [packId]: completeLevel(arr, index) };
    });
  };

  const handleReset = () => {
    resetProgress(localStorage);
    setCompleted(loadPackProgress(localStorage, PACKS));
    setSettings(createDefaultSettings());
    setSelected(null);
  };

  return (
    <main className="app">
      <h1>{GAME_NAME}</h1>
      <p className="tagline">Connect every Color, fill every Cell. Free Play, no timer.</p>
      {selected === null ? (
        <>
          <LevelSelect
            packs={PACKS}
            progress={completed}
            onSelect={(packId, index) => setSelected({ packId, index })}
          />
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
          key={`${selected.packId}:${selected.index}`}
          selection={selected}
          settings={settings}
          onWin={handleWin}
          onExit={() => setSelected(null)}
          onNext={() => {
            // Winning just completed `selected`, so the next Level in this
            // Pack is unlocked by construction; at the Pack end return to
            // select.
            const pack = PACKS.find((p) => p.id === selected.packId) ?? PACKS[0];
            setSelected(
              selected.index + 1 < pack.levels.length
                ? { packId: pack.id, index: selected.index + 1 }
                : null,
            );
          }}
        />
      )}
    </main>
  );
}

export default App;
