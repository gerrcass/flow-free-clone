import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Board from './components/Board';
import LevelSelect from './components/LevelSelect';
import SettingsControls from './components/SettingsControls';
import Welcome from './components/Welcome';
import { PACKS, findPackById } from './game/pack';
import {
  completeLevel,
  createDefaultSettings,
  loadPackProgress,
  loadSettings,
  resetProgress,
  savePackProgress,
  saveSettings,
} from './game/progress';
import type { ContinueTarget, PackProgress, Settings } from './game/progress';
import { createInitialState, reducer } from './game/reducer';
import { playWinSound } from './game/sound';
import { fillRatio, isSolved } from './game/win';
import './App.css';

type Route =
  | { name: 'welcome' }
  | { name: 'level-select'; packId?: string }
  | { name: 'level'; selection: ContinueTarget };

function PlayLevel({
  selection,
  settings,
  onWin,
  onExit,
  onNext,
}: {
  selection: ContinueTarget;
  settings: Settings;
  onWin: (packId: string, index: number) => void;
  onExit: () => void;
  onNext: () => void;
}) {
  const pack = findPackById(PACKS, selection.packId);
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
  const [route, setRoute] = useState<Route>({ name: 'welcome' });
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
    setRoute({ name: 'welcome' });
  };

  return (
    <main className="app">
      {route.name === 'welcome' && (
        <Welcome
          packs={PACKS}
          progress={completed}
          settings={settings}
          onSettingsChange={setSettings}
          onPlay={() => setRoute({ name: 'level-select' })}
          onContinue={(target) => setRoute({ name: 'level', selection: target })}
          onEnterPack={(packId) => setRoute({ name: 'level-select', packId })}
        />
      )}
      {route.name === 'level-select' && (
        <>
          <LevelSelect
            key={route.packId ?? 'all'}
            packs={PACKS}
            progress={completed}
            initialPackId={route.packId}
            onSelect={(packId, index) =>
              setRoute({ name: 'level', selection: { packId, index } })
            }
          />
          <SettingsControls settings={settings} onChange={setSettings} />
          <button type="button" onClick={() => setRoute({ name: 'welcome' })}>
            Welcome Screen
          </button>{' '}
          <button type="button" onClick={handleReset}>
            Reset progress
          </button>
        </>
      )}
      {route.name === 'level' && (
        <PlayLevel
          key={`${route.selection.packId}:${route.selection.index}`}
          selection={route.selection}
          settings={settings}
          onWin={handleWin}
          onExit={() =>
            setRoute({ name: 'level-select', packId: route.selection.packId })
          }
          onNext={() => {
            // Winning just completed `selection`, so the next Level in this
            // Pack is unlocked by construction; at the Pack end return to
            // select.
            const pack = findPackById(PACKS, route.selection.packId);
            setRoute(
              route.selection.index + 1 < pack.levels.length
                ? {
                    name: 'level',
                    selection: {
                      packId: pack.id,
                      index: route.selection.index + 1,
                    },
                  }
                : { name: 'level-select', packId: pack.id },
            );
          }}
        />
      )}
    </main>
  );
}

export default App;
