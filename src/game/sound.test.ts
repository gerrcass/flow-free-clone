import { describe, expect, it, vi } from 'vitest';
import { playWinSound } from './sound';
import type { WinAudioContext } from './sound';

function stubContext() {
  const oscillators: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const stubParam = () => ({ setValueAtTime: () => {} });
  const context = {
    oscillators,
    currentTime: 0,
    destination: {},
    createOscillator: () => {
      const osc = {
        start: vi.fn(),
        stop: vi.fn(),
        connect: () => {},
        type: '',
        frequency: stubParam(),
      };
      oscillators.push(osc);
      return osc;
    },
    createGain: () => ({ connect: () => {}, gain: stubParam() }),
    resume: vi.fn(),
    close: vi.fn(),
  };
  return context as unknown as WinAudioContext & { oscillators: typeof oscillators };
}

describe('playWinSound', () => {
  it('creates no audio when sound is disabled', () => {
    const createContext = vi.fn();
    playWinSound({ enabled: false, createContext });
    expect(createContext).not.toHaveBeenCalled();
  });

  it('never throws when no audio context is available', () => {
    expect(() => playWinSound({ enabled: true, createContext: () => null })).not.toThrow();
    expect(() =>
      playWinSound({
        enabled: true,
        createContext: () => {
          throw new Error('no audio');
        },
      }),
    ).not.toThrow();
  });

  it('schedules and plays a short chime when enabled', () => {
    const context = stubContext();
    const createContext = vi.fn(() => context);
    playWinSound({ enabled: true, createContext });
    expect(createContext).toHaveBeenCalledTimes(1);
    // A rising two-note chime: one oscillator per note, each started/stopped.
    expect(context.oscillators.length).toBe(2);
    for (const osc of context.oscillators) {
      expect(osc.start).toHaveBeenCalledTimes(1);
      expect(osc.stop).toHaveBeenCalledTimes(1);
    }
  });

  it('releases the audio context after the chime finishes', () => {
    vi.useFakeTimers();
    try {
      const context = stubContext();
      playWinSound({ enabled: true, createContext: () => context });
      expect(context.close).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      expect(context.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('waits for resume before scheduling when the context starts suspended', async () => {
    const context = stubContext();
    let resolveResume!: () => void;
    const resumed = new Promise<void>((resolve) => {
      resolveResume = resolve;
    });
    context.resume = vi.fn(() => resumed);
    playWinSound({ enabled: true, createContext: () => context });
    // Scheduling must wait for the suspended clock to run.
    expect(context.oscillators.length).toBe(0);
    resolveResume();
    await resumed;
    // Flush the .then(schedule) microtask.
    await Promise.resolve();
    await Promise.resolve();
    expect(context.oscillators.length).toBe(2);
    for (const osc of context.oscillators) {
      expect(osc.start).toHaveBeenCalledTimes(1);
      expect(osc.stop).toHaveBeenCalledTimes(1);
    }
  });

  it('still schedules the chime when resume rejects', async () => {
    const context = stubContext();
    context.resume = vi.fn(() => Promise.reject(new Error('denied')));
    playWinSound({ enabled: true, createContext: () => context });
    expect(context.oscillators.length).toBe(0);
    // Let the rejection handler run.
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(context.oscillators.length).toBe(2);
  });
});
