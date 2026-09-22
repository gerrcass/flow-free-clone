import { describe, expect, it } from 'vitest';
import { createInitialState, reducer } from './reducer';
import { FIXTURE_LEVEL } from './fixture';

describe('Pipe-editing reducer (rule 1: drag from Endpoint orthogonally)', () => {
  it('starts a Pipe at a Color Endpoint and extends to an orthogonally adjacent Cell', () => {
    const s0 = createInitialState(FIXTURE_LEVEL);
    const s1 = reducer(s0, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    const s2 = reducer(s1, { type: 'extend', at: { row: 0, col: 1 } });
    expect(s2.pipes['R']).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('ignores non-orthogonal (diagonal) steps', () => {
    const s0 = createInitialState(FIXTURE_LEVEL);
    const s1 = reducer(s0, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    const s2 = reducer(s1, { type: 'extend', at: { row: 1, col: 1 } });
    expect(s2.pipes['R']).toEqual([{ row: 0, col: 0 }]);
  });

  it('ignores start cells that are not that Color Endpoint', () => {
    const s0 = createInitialState(FIXTURE_LEVEL);
    const s1 = reducer(s0, { type: 'start', colorId: 'R', at: { row: 2, col: 2 } });
    expect(s1.activeColor).toBeNull();
    expect(s1.pipes['R']).toEqual([]);
  });
});

describe('Pipe-editing reducer (rule 2: cut rival Pipes)', () => {
  it('drawing through a rival Pipe takes the Cell and cuts the rival back', () => {
    let s = createInitialState(FIXTURE_LEVEL);
    s = reducer(s, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 2 } });
    s = reducer(s, { type: 'end' });
    s = reducer(s, { type: 'start', colorId: 'G', at: { row: 1, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 1, col: 1 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    expect(s.pipes['G']).toEqual([
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 0, col: 1 },
    ]);
    expect(s.pipes['R']).toEqual([{ row: 0, col: 0 }]);
  });

  it('never covers a rival Endpoint', () => {
    let s = createInitialState(FIXTURE_LEVEL);
    s = reducer(s, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    s = reducer(s, { type: 'end' });
    s = reducer(s, { type: 'start', colorId: 'G', at: { row: 1, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 1, col: 1 } });
    const before = s;
    s = reducer(s, { type: 'extend', at: { row: 0, col: 0 } });
    expect(s.pipes['G']).toEqual(before.pipes['G']);
    expect(s.pipes['R']).toEqual(before.pipes['R']);
  });
});

describe('Pipe-editing reducer (rule 3: drag back erases own tail)', () => {
  it('stepping back to the previous Cell pops the tail', () => {
    let s = createInitialState(FIXTURE_LEVEL);
    s = reducer(s, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 2 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    expect(s.pipes['R']).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });
});

describe('Pipe-editing reducer (rule 4: tap Endpoint clears its Color)', () => {
  it('clears the whole Pipe for that Color', () => {
    let s = createInitialState(FIXTURE_LEVEL);
    s = reducer(s, { type: 'start', colorId: 'R', at: { row: 0, col: 0 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 1 } });
    s = reducer(s, { type: 'extend', at: { row: 0, col: 2 } });
    s = reducer(s, { type: 'clear', colorId: 'R' });
    expect(s.pipes['R']).toEqual([]);
  });
});
