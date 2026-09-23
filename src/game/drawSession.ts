import type { CellPos } from './types';
import type { BoardAction } from './reducer';
import { isAdjacent, samePos } from './cells';

interface PendingPress {
  colorId: string;
  at: CellPos;
}

/**
 * UI-level draw session: defers the destructive `start` until the pointer
 * first enters another Cell, so press-and-cancel stays a no-op.
 *
 * - `down` never emits: it only records the pending Endpoint press.
 * - `enter`/`moveTo` flush the pending press as `start` + `extend`.
 * - `up` on an Endpoint with no prior move emits `clear` + `end` (tap).
 * - `cancel` before any move emits nothing (aborted press is a no-op).
 */
export class DrawSession {
  private drawing = false;
  private moved = false;
  private started = false;
  private pending: PendingPress | null = null;

  down(colorId: string, at: CellPos): BoardAction[] {
    this.drawing = true;
    this.moved = false;
    this.started = false;
    this.pending = { colorId, at: { ...at } };
    return [];
  }

  private flushPending(at: CellPos): BoardAction[] {
    if (!this.drawing) return [];
    const pending = this.pending;
    // Already drawing: every move goes to the reducer, which validates it.
    if (pending === null) {
      this.moved = true;
      return [{ type: 'extend', at }];
    }
    // Jitter on the press Cell is not a move: ignore it so a release still
    // counts as a tap and no destructive `start` is flushed.
    if (samePos(at, pending.at)) return [];
    // A jump to a non-adjacent Cell can never extend the Pipe (the reducer
    // rejects it), so keep the pending press instead of flushing a
    // destructive `start` the `extend` would not survive. Record the gesture
    // so a later release is not mistaken for a tap.
    if (!isAdjacent(pending.at, at)) {
      this.moved = true;
      return [];
    }
    this.moved = true;
    this.pending = null;
    this.started = true;
    return [
      { type: 'start', colorId: pending.colorId, at: pending.at },
      { type: 'extend', at },
    ];
  }

  /** Mouse path: per-Cell enter events. */
  enter(at: CellPos): BoardAction[] {
    return this.flushPending(at);
  }

  /** Touch path: hit-tested Cell under the pointer (enter events don't fire). */
  moveTo(at: CellPos): BoardAction[] {
    return this.flushPending(at);
  }

  up(releaseColorId: string | null): BoardAction[] {
    if (!this.drawing) return [];
    this.drawing = false;
    // Tap = press and release on the same Color Endpoint without entering
    // another Cell. A release elsewhere with no move is a slipped press,
    // not a tap: discard it as a no-op.
    if (!this.moved && this.pending !== null) {
      const { colorId } = this.pending;
      this.pending = null;
      if (releaseColorId !== null && releaseColorId === colorId) {
        return [{ type: 'clear', colorId }, { type: 'end' }];
      }
      return [];
    }
    this.pending = null;
    if (!this.started && !this.moved) return [];
    this.started = false;
    return [{ type: 'end' }];
  }

  cancel(): BoardAction[] {
    if (!this.drawing) return [];
    this.drawing = false;
    this.pending = null;
    if (!this.started) return [];
    this.started = false;
    return [{ type: 'end' }];
  }
}
