import type { CellPos, Level } from './types';
import { isAdjacent, samePos } from './cells';

export { samePos };

export interface BoardState {
  level: Level;
  pipes: Record<string, CellPos[]>;
  activeColor: string | null;
}

export type BoardAction =
  | { type: 'start'; colorId: string; at: CellPos }
  | { type: 'extend'; at: CellPos }
  | { type: 'end' }
  | { type: 'clear'; colorId: string };

function inBounds(level: Level, at: CellPos): boolean {
  return at.row >= 0 && at.row < level.size && at.col >= 0 && at.col < level.size;
}

function endpointOf(level: Level, colorId: string, at: CellPos): boolean {
  const def = level.colors.find((c) => c.id === colorId);
  if (!def) return false;
  return def.endpoints.some((e) => samePos(e, at));
}

function endpointOfOtherColor(level: Level, colorId: string, at: CellPos): boolean {
  return level.colors.some(
    (c) => c.id !== colorId && c.endpoints.some((e) => samePos(e, at)),
  );
}

export function createInitialState(level: Level): BoardState {
  const pipes: Record<string, CellPos[]> = {};
  for (const c of level.colors) pipes[c.id] = [];
  return { level, pipes, activeColor: null };
}

export function reducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'start': {
      if (!inBounds(state.level, action.at)) return state;
      if (!endpointOf(state.level, action.colorId, action.at)) {
        return { ...state, activeColor: null };
      }
      return {
        ...state,
        pipes: { ...state.pipes, [action.colorId]: [{ ...action.at }] },
        activeColor: action.colorId,
      };
    }
    case 'extend': {
      const active = state.activeColor;
      if (active === null) return state;
      if (!inBounds(state.level, action.at)) return state;
      const pipe = state.pipes[active] ?? [];
      const head = pipe[pipe.length - 1];
      if (!head) return state;
      if (!isAdjacent(head, action.at)) return state;
      if (samePos(head, action.at)) return state;
      if (endpointOfOtherColor(state.level, active, action.at)) return state;
      const selfIdx = pipe.findIndex((p) => samePos(p, action.at));
      if (selfIdx !== -1) {
        return {
          ...state,
          pipes: { ...state.pipes, [active]: pipe.slice(0, selfIdx + 1) },
        };
      }
      const nextPipes = { ...state.pipes };
      for (const [colorId, rival] of Object.entries(state.pipes)) {
        if (colorId === active) continue;
        const cutIdx = rival.findIndex((p) => samePos(p, action.at));
        if (cutIdx !== -1) {
          nextPipes[colorId] = rival.slice(0, cutIdx);
        }
      }
      return {
        ...state,
        pipes: { ...nextPipes, [active]: [...pipe, { ...action.at }] },
      };
    }
    case 'end':
      return { ...state, activeColor: null };
    case 'clear': {
      if (!(action.colorId in state.pipes)) return state;
      return {
        ...state,
        pipes: { ...state.pipes, [action.colorId]: [] },
        activeColor: state.activeColor === action.colorId ? null : state.activeColor,
      };
    }
  }
}
