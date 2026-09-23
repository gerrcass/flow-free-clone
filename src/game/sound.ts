/**
 * Subtle synthesized win chime (clean-room: no copied audio assets).
 * Everything is generated with the Web Audio API at play time.
 */

interface WinOscillator {
  type: string;
  frequency: { setValueAtTime(value: number, time: number): void };
  connect(node: unknown): void;
  start(time?: number): void;
  stop(time?: number): void;
}

interface WinGain {
  gain: { setValueAtTime(value: number, time: number): void };
  connect(node: unknown): void;
}

export interface WinAudioContext {
  readonly currentTime: number;
  readonly destination: unknown;
  createOscillator(): WinOscillator;
  createGain(): WinGain;
  resume?(): Promise<void> | void;
  close?(): Promise<void> | void;
}

export interface WinSoundOptions {
  /** Global sound toggle; when false no audio objects are created. */
  enabled: boolean;
  /** Injectable factory (defaults to the browser AudioContext). */
  createContext?: () => WinAudioContext | null;
}

function defaultCreateContext(): WinAudioContext | null {
  try {
    const Ctor =
      typeof window !== 'undefined'
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : undefined;
    return Ctor ? (new Ctor() as unknown as WinAudioContext) : null;
  } catch {
    return null;
  }
}

/** Two rising sine notes (E5 → A5), ~0.35s total. Quiet by design. */
const NOTES = [659.25, 880];
const NOTE_LENGTH = 0.16;
const VOLUME = 0.08;

export function playWinSound(options: WinSoundOptions): void {
  if (!options.enabled) return;
  let context: WinAudioContext | null;
  try {
    context = (options.createContext ?? defaultCreateContext)();
  } catch {
    return;
  }
  if (!context) return;
  const schedule = () => {
    try {
      const ctx = context as WinAudioContext;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(VOLUME, ctx.currentTime);
      gain.connect(ctx.destination);
      NOTES.forEach((frequency, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const at = ctx.currentTime + i * NOTE_LENGTH;
        osc.frequency.setValueAtTime(frequency, at);
        osc.connect(gain);
        osc.start(at);
        osc.stop(at + NOTE_LENGTH);
      });
      // One context is created per win: release it once the chime is done.
      // The close timer starts after scheduling so it can't win a race
      // against notes scheduled on a resumed currentTime.
      const doneAfterMs = (NOTES.length * NOTE_LENGTH + 0.05) * 1000;
      const played = ctx;
      setTimeout(() => {
        try {
          void played.close?.();
        } catch {
          // Ignore: the page may already be gone.
        }
      }, doneAfterMs);
    } catch {
      // Audio is decoration: a failure must never break the win flow.
    }
  };
  try {
    // Autoplay policies may leave a fresh context suspended with a frozen
    // currentTime; schedule only after resume settles so the notes land on
    // a running clock and close() can't win the race.
    let resumed: Promise<void> | void;
    try {
      resumed = context.resume?.();
    } catch {
      schedule();
      return;
    }
    if (resumed && typeof (resumed as Promise<void>).then === 'function') {
      (resumed as Promise<void>).then(schedule, schedule);
      return;
    }
  } catch {
    // Audio is decoration: a failure must never break the win flow.
  }
  schedule();
}
