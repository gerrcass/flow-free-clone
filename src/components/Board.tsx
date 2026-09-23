import { useRef } from 'react';
import type { Dispatch, PointerEvent as ReactPointerEvent } from 'react';
import type { BoardState } from '../game/reducer';
import type { BoardAction } from '../game/reducer';
import type { CellPos } from '../game/types';
import { samePos } from '../game/cells';
import { DrawSession } from '../game/drawSession';
import { colorHex } from '../game/theme';
import { isBoardColorConnected } from '../game/win';
import { connectedClass } from './connectedClass';
import './Board.css';

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
  // Deferred-start session: pressing an Endpoint records a pending press;
  // the destructive `start` is only flushed on the first move, so an
  // aborted press (cancel before moving) leaves the existing Pipe intact.
  const session = useRef(new DrawSession());

  const handleDown = (at: CellPos) => {
    const colorId = endpointAt(state, at);
    if (colorId === null) return;
    session.current.down(colorId, at);
  };

  const handleEnter = (at: CellPos) => {
    for (const action of session.current.enter(at)) dispatch(action);
  };

  const handleMove = (e: ReactPointerEvent) => {
    // Touch slides keep implicit pointer capture on the start Cell, so
    // per-Cell enter events never fire: hit-test the Cell under the pointer.
    if (e.pointerType === 'mouse') return;
    const at = cellFromPoint(e.clientX, e.clientY);
    if (at === null) return;
    for (const action of session.current.moveTo(at)) dispatch(action);
  };

  const handleUp = (at: CellPos) => {
    const colorId = endpointAt(state, at);
    for (const action of session.current.up(colorId)) dispatch(action);
  };

  const cancel = () => {
    for (const action of session.current.cancel()) dispatch(action);
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
          // Connected-Pipe styling (#13): a Pipe reads connected only
          // through the win-check seam, so Board color never disagrees
          // with the HUD dots or the solved state.
          const occupantConnected =
            occupant !== null && isBoardColorConnected(state, occupant);
          const endpointConnected =
            endpoint !== null && isBoardColorConnected(state, endpoint);
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
                  className={connectedClass('pipe', occupantConnected)}
                  style={{ backgroundColor: colorHex(occupant) }}
                />
              )}
              {endpoint !== null && (
                <span
                  className={connectedClass('endpoint', endpointConnected)}
                  style={{ backgroundColor: colorHex(endpoint) }}
                />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
