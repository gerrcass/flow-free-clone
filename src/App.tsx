import { useMemo, useReducer } from 'react';
import Board from './components/Board';
import { createInitialState, reducer } from './game/reducer';
import { FIXTURE_LEVEL } from './game/fixture';
import { fillRatio, isSolved } from './game/win';
import './App.css';

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(FIXTURE_LEVEL),
  );
  const solved = useMemo(() => isSolved(state.level, state.pipes), [state]);
  const fill = useMemo(() => fillRatio(state.level, state.pipes), [state]);

  return (
    <main className="app">
      <h1>Flow Free Clone</h1>
      <p className="hud" aria-live="polite">
        Filled {Math.round(fill * 100)}%
        {solved && ' — Solved!'}
      </p>
      <Board state={state} dispatch={dispatch} />
      {solved && (
        <p className="win" role="status">
          Board complete: every Cell filled and every Color connected.
        </p>
      )}
    </main>
  );
}

export default App;
