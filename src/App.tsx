import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Board from './components/Board';
import Hud from './components/Hud';
import LevelSelect from './components/LevelSelect';
import SettingsControls from './components/SettingsControls';
import Welcome from './components/Welcome';
import WinOverlay from './components/WinOverlay';
import { computePar, starsForPar } from './game/challenge';
import { PACKS, findPackById } from './game/pack';
import {
  completeLevel,
  createDefaultSettings,
  emptyPackStars,
  loadPackProgress,
  loadPackStars,
  loadSettings,
  recordStars,
  resetProgress,
  savePackProgress,
  saveSettings,
} from './game/progress';
import type { ContinueTarget, PackProgress, PackStars, Settings } from './game/progress';
import { createInitialState, reducer } from './game/reducer';
import { playWinSound } from './game/sound';
import { fillRatio, isConnected, isSolved } from './game/win';
import './App.css';

type Route =
  | { name: 'welcome' }
  | { name: 'level-select'; packId?: string }
  | { name: 'level'; selection: ContinueTarget };

function PlayLevel({
  selection,
  earnedStars,
  settings,
  onWin,
  onExit,
  onNext,
}: {
  selection: ContinueTarget;
  earnedStars: number;
  settings: Settings;
  onWin: (selection: ContinueTarget, earned: number) => void;
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
  // Per-Color HUD dots (#13) share the win-check seam with Board
  // connected styling, so dots, Pipes, and solved state never disagree.
  const colorStatuses = useMemo(
    () =>
      state.level.colors.map((c) => ({
        id: c.id,
        connected: isConnected(state.level, c.id, state.pipes),
      })),
    [state],
  );
  // Solver-derived Par and stars for this Level (#14): a single solver
  // run per Level, memoized for the Level's lifetime (~ms on shipped
  // Boards). PACKS is module-static, so pack id + index pin the Level.
  const par = useMemo(
    () => computePar(pack.levels[selection.index]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack.id, selection.index],
  );
  const starsAvailable = par === null ? null : starsForPar(par);
  const hasNext = selection.index + 1 < pack.levels.length;
  // PlayLevel remounts per Level, so this ref tracks the unsolved→solved
  // transition within one Level only.
  const wasSolved = useRef(false);

  useEffect(() => {
    if (solved) onWin(selection, starsAvailable ?? 0);
  }, [solved, selection, starsAvailable, onWin]);

  useEffect(() => {
    // Fire only on the solving transition: flipping the sound toggle
    // on an already-solved Board must not replay the chime.
    if (solved && !wasSolved.current) playWinSound({ enabled: settings.sound });
    wasSolved.current = solved;
  }, [solved, settings.sound]);

  return (
    <section aria-label={`${pack.name} Level ${levelNumber}`}>
      <Hud fillPercent={Math.round(fill * 100)} par={par} stars={earnedStars} colors={colorStatuses} />
      <Board state={state} dispatch={dispatch} />
      {solved && (
        <WinOverlay
          packName={pack.name}
          levelNumber={levelNumber}
          starsEarned={starsAvailable ?? 0}
          hasNext={hasNext}
          animated={settings.animation}
          onNext={onNext}
          onExit={onExit}
        />
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

function readStars(): PackStars {
  if (typeof localStorage === 'undefined') return emptyPackStars(PACKS);
  return loadPackStars(localStorage, PACKS);
}

function readSettings() {
  if (typeof localStorage === 'undefined') return createDefaultSettings();
  return loadSettings(localStorage);
}

function App() {
  const [route, setRoute] = useState<Route>({ name: 'welcome' });
  const [completed, setCompleted] = useState<PackProgress>(readProgress);
  const [stars, setStars] = useState<PackStars>(readStars);
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    savePackProgress(localStorage, completed, stars);
  }, [completed, stars]);

  useEffect(() => {
    saveSettings(localStorage, settings);
  }, [settings]);

  const handleWin = (target: ContinueTarget, earned: number) => {
    setCompleted((prev) => {
      const arr = prev[target.packId] ?? [];
      if (arr[target.index] === true) return prev;
      return { ...prev, [target.packId]: completeLevel(arr, target.index) };
    });
    setStars((prev) => recordStars(prev, target, earned));
  };

  const handleReset = () => {
    resetProgress(localStorage);
    setCompleted(loadPackProgress(localStorage, PACKS));
    setStars(loadPackStars(localStorage, PACKS));
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
          earnedStars={stars[route.selection.packId]?.[route.selection.index] ?? 0}
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
