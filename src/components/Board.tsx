import { useRef } from 'react';
import type { Dispatch, PointerEvent as ReactPointerEvent } from 'react';
import type { BoardState } from '../game/reducer';
import type { BoardAction } from '../game/reducer';
import type { CellPos } from '../game/types';
import { samePos } from '../game/cells';
import './Board.css';

/** Temporary fixture palette (distinct branding lands with #4). */
const PALETTE: Record<string, string> = {
  R: '#e5484d',
  G: '#46a758',
  B: '#3e63dd',
  Y: '#e2a336',
  P: '#8e4ec6',
};

interface BoardProps {
  state: BoardState;
  dispatch: Dispatch<BoardAction>;
}

function endpointAt(state: BoardState, at: CellPos): string | null {
  for (const c of state.level.colors) {
    if (c.endpoints.some((e) => samePos(e, at))) return c.id;
  }
  return null;
}

function occupantOf(state: BoardState, at: CellPos): string | null {
  for (const [colorId, pipe] of Object.entries(state.pipes)) {
    if (pipe.some((p) => samePos(p, at))) return colorId;
  }
  return null;
}

function cellFromPoint(x: number, y: number): CellPos | null {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest?.('[data-row][data-col]');
  if (!cell) return null;
  const row = Number(cell.getAttribute('data-row'));
  const col = Number(cell.getAttribute('data-col'));
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { row, col };
}

export default function Board({ state, dispatch }: BoardProps) {
  const { level } = state;
  const drawing = useRef(false);
  const moved = useRef(false);

  const handleDown = (at: CellPos) => {
    const colorId = endpointAt(state, at);
    if (colorId === null) return;
    drawing.current = true;
    moved.current = false;
    dispatch({ type: 'start', colorId, at });
  };

  const handleEnter = (at: CellPos) => {
    if (!drawing.current) return;
    moved.current = true;
    dispatch({ type: 'extend', at });
  };

  const handleMove = (e: ReactPointerEvent) => {
    // Touch slides keep implicit pointer capture on the start Cell, so
    // per-Cell enter events never fire: hit-test the Cell under the pointer.
    if (!drawing.current || e.pointerType === 'mouse') return;
    const at = cellFromPoint(e.clientX, e.clientY);
    if (at === null) return;
    moved.current = true;
    dispatch({ type: 'extend', at });
  };

  const handleUp = (at: CellPos) => {
    if (!drawing.current) return;
    drawing.current = false;
    const colorId = endpointAt(state, at);
    // A press-and-release on an Endpoint without entering another Cell is a
    // tap: clear the whole Pipe. `start` already reset it to a single Cell,
    // so clearing unconditionally restores the empty Pipe.
    if (!moved.current && colorId !== null) {
      dispatch({ type: 'clear', colorId });
    }
    dispatch({ type: 'end' });
  };

  const cancel = () => {
    if (!drawing.current) return;
    drawing.current = false;
    dispatch({ type: 'end' });
  };

  return (
    <div
      className="board"
      style={{ ['--board-size' as string]: level.size }}
      role="grid"
      aria-label={`${level.size} by ${level.size} Board`}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onPointerMove={handleMove}
    >
      {Array.from({ length: level.size }, (_, row) =>
        Array.from({ length: level.size }, (_, col) => {
          const at = { row, col };
          const endpoint = endpointAt(state, at);
          const occupant = occupantOf(state, at);
          return (
            <div
              key={`${row},${col}`}
              className="cell"
              role="gridcell"
              aria-label={
                endpoint
                  ? `${endpoint} Endpoint row ${row + 1} col ${col + 1}`
                  : `Cell row ${row + 1} col ${col + 1}${occupant ? ` Pipe ${occupant}` : ''}`
              }
              data-row={row}
              data-col={col}
              onPointerDown={(e) => {
                e.preventDefault();
                handleDown(at);
              }}
              onPointerEnter={() => handleEnter(at)}
              onPointerUp={() => handleUp(at)}
            >
              {occupant !== null && (
                <span
                  className="pipe"
                  style={{ backgroundColor: PALETTE[occupant] ?? '#999' }}
                />
              )}
              {endpoint !== null && (
                <span
                  className="endpoint"
                  style={{ backgroundColor: PALETTE[endpoint] ?? '#999' }}
                />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
