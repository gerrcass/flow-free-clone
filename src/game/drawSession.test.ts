import { describe, expect, it } from 'vitest';
import { createInitialState, reducer } from './reducer';
import { DrawSession } from './drawSession';
import { FIXTURE_LEVEL } from './fixture';

/** UI-level contract: Board must defer destructive `start` until first move. */
describe('DrawSession (Board press/move/release contract)', () => {
  it('tap Endpoint without moving clears that Color', () => {
    let s = createInitialState(FIXTURE_LEVEL);
    s = reducer(s, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 2 } });
    s = reducer(s, { type: 'end' });

    const session = new DrawSession();
    // Pressing the Endpoint must not emit anything destructive yet.
    expect(session.down('R', { row: 0, col: 0 })).toEqual([]);
    // Release on the Endpoint without entering another Cell is a tap.
    const upActions = session.up('R');
    expect(upActions).toEqual([{ type: 'clear', colorId: 'R' }, { type: 'end' }]);

    for (const a of upActions) s = reducer(s, a);
    expect(s.pipes['R']).toEqual([]);
  });

  it('press Endpoint then cancel off-Board is a no-op (keeps existing Pipe)', () => {
    let s = createInitialState(FIXTURE_LEVEL);
    s = reducer(s, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 2 } });
    s = reducer(s, { type: 'end' });
    const before = s.pipes['R'];

    const session = new DrawSession();
    expect(session.down('R', { row: 0, col: 0 })).toEqual([]);
    // Abort off-Board before entering another Cell: no destructive `start`.
    expect(session.cancel()).toEqual([]);

    // No actions dispatched, so reducer state is untouched.
    expect(s.pipes['R']).toEqual(before);
  });

  it('press, move, then cancel keeps the partial Pipe and ends the draw', () => {
    const s0 = createInitialState(FIXTURE_LEVEL);
    const session = new DrawSession();
    expect(session.down('R', { row: 0, col: 0 })).toEqual([]);
    const moveActions = session.enter({ row: 0, col: 1 });
    expect(moveActions).toEqual([
      { type: 'start', colorId: 'R', at: { row: 0, col: 0 } },
      { type: 'extend', at: { row: 0, col: 1 } },
    ]);
    expect(session.cancel()).toEqual([{ type: 'end' }]);

    let s = s0;
    for (const a of [...moveActions, { type: 'end' } as const]) s = reducer(s, a);
    expect(s.pipes['R']).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('drag then release does not clear', () => {
    const session = new DrawSession();
    session.down('R', { row: 0, col: 0 });
    session.enter({ row: 0, col: 1 });
    expect(session.up('G')).toEqual([{ type: 'end' }]);
  });

  it('press and release elsewhere without moving is a no-op, not a tap', () => {
    const session = new DrawSession();
    session.down('R', { row: 0, col: 0 });
    expect(session.up('G')).toEqual([]);
    const slipped = new DrawSession();
    slipped.down('R', { row: 0, col: 0 });
    expect(slipped.up(null)).toEqual([]);
  });

  it('jitter on the press Cell is not a move: release still taps', () => {
    let s = createInitialState(FIXTURE_LEVEL);
    s = reducer(s, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    s = reducer(s, { type: 'end' });

    const session = new DrawSession();
    session.down('R', { row: 0, col: 0 });
    // Touch hit-test re-firing on the press Cell, or a same-Cell enter.
    expect(session.moveTo({ row: 0, col: 0 })).toEqual([]);
    expect(session.enter({ row: 0, col: 0 })).toEqual([]);
    const upActions = session.up('R');
    expect(upActions).toEqual([{ type: 'clear', colorId: 'R' }, { type: 'end' }]);

    for (const a of upActions) s = reducer(s, a);
    expect(s.pipes['R']).toEqual([]);
  });

  it('jump to a non-adjacent Cell keeps the pending press (no truncation)', () => {
    let s = createInitialState(FIXTURE_LEVEL);
    s = reducer(s, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 2 } });
    s = reducer(s, { type: 'end' });
    const before = s.pipes['R'];

    const session = new DrawSession();
    session.down('R', { row: 0, col: 0 });
    // Diagonal / far jump: must not flush the destructive `start`.
    expect(session.enter({ row: 1, col: 1 })).toEqual([]);
    expect(session.cancel()).toEqual([]);
    expect(s.pipes['R']).toEqual(before);

    // The pending press survives: a later adjacent move still draws.
    const session2 = new DrawSession();
    session2.down('R', { row: 0, col: 0 });
    expect(session2.enter({ row: 1, col: 1 })).toEqual([]);
    expect(session2.enter({ row: 0, col: 1 })).toEqual([
      { type: 'start', colorId: 'R', at: { row: 0, col: 0 } },
      { type: 'extend', at: { row: 0, col: 1 } },
    ]);
  });
});
