/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { FIXTURE_LEVEL, UNSOLVABLE_LEVEL } from '../game/fixture';
import { PACKS } from '../game/pack';
import {
  emptyPackProgress,
  emptyPackStars,
  loadPackProgress,
  loadPackStars,
} from '../game/progress';
import { GAME_NAME } from '../game/theme';
import {
  buildShareHash,
  copyShareLink,
  parseShareHash,
  shareUrlFor,
} from '../game/share';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = '';
  vi.unstubAllGlobals();
});

function openAppWithHash(hash: string) {
  window.location.hash = hash;
  render(<App />);
}

describe('share-via-URL in the App shell (#16)', () => {
  it('loads the identical shared Board from the URL hash with no account', () => {
    openAppWithHash(buildShareHash(FIXTURE_LEVEL));
    expect(screen.getByRole('grid')).toBeTruthy();
    expect(
      screen.getByRole('region', { name: 'Shared Level' }),
    ).toBeTruthy();
    // Solved-state copy is the fill-plus-connect contract, shared edition.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows invalid-link handling for garbage hashes', () => {
    openAppWithHash('#level=!!!');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/invalid or unsolvable/i)).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/invalid or unsolvable/i)).toBeNull();
  });

  it('rejects a structurally valid but unsolvable shared Board', () => {
    openAppWithHash(buildShareHash(UNSOLVABLE_LEVEL));
    expect(screen.getByText(/invalid or unsolvable/i)).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
  });



  it('copies a round-tripping share URL from a Pack Level', async () => {
    const writeText = vi.fn(async (_text: string) => {});
    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: { writeText },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: `Play ${GAME_NAME}` }));
    const levelButtons = screen.getAllByRole('button', { name: 'Starter Level 1' });
    const inLevelSelect = levelButtons.find((button) =>
      button.classList.contains('level-button'),
    );
    if (!inLevelSelect) throw new Error('Starter Level 1 button not found');
    fireEvent.click(inLevelSelect);
    fireEvent.click(screen.getByRole('button', { name: 'Share Level' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toContain('#level=');
    expect(parseShareHash(url.slice(url.indexOf('#')))).toEqual(
      PACKS[0].levels[0],
    );
    expect(
      await screen.findByRole('button', { name: 'Link copied' }),
    ).toBeTruthy();
  });

  it('builds hash-only share URLs that never need the network', () => {
    const url = shareUrlFor(FIXTURE_LEVEL);
    expect(url).toContain('#level=');
    const fragment = url.slice(url.indexOf('#'));
    expect(fragment).not.toContain('http');
    expect(parseShareHash(fragment)).toEqual(FIXTURE_LEVEL);
  });

  it('resolves the URL even when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: undefined });
    const url = await copyShareLink(FIXTURE_LEVEL);
    expect(url).toContain('#level=');
  });

  it('loads the shared Board with the network disabled (offline after first load)', () => {
    // The shell is already cached at this point; proving the shared route
    // itself needs no network: every fetch throws, yet the verified Board
    // still renders.
    vi.stubGlobal('fetch', () => {
      throw new Error('offline');
    });
    openAppWithHash(buildShareHash(FIXTURE_LEVEL));
    expect(screen.getByRole('grid')).toBeTruthy();
    expect(
      screen.getByRole('region', { name: 'Shared Level' }),
    ).toBeTruthy();
  });
});

describe('shared Levels leave the persisted store alone (#16)', () => {
  it('opens a shared Board without recording Pack completion or stars', () => {
    openAppWithHash(buildShareHash(FIXTURE_LEVEL));
    expect(screen.getByRole('grid')).toBeTruthy();
    expect(loadPackProgress(localStorage, PACKS)).toEqual(
      emptyPackProgress(PACKS),
    );
    expect(loadPackStars(localStorage, PACKS)).toEqual(emptyPackStars(PACKS));
  });

  it('reset still clears the v2 per-Pack store after shared play', () => {
    openAppWithHash(buildShareHash(FIXTURE_LEVEL));
    fireEvent.click(screen.getByRole('button', { name: 'Welcome Screen' }));
    fireEvent.click(screen.getByRole('button', { name: `Play ${GAME_NAME}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    expect(loadPackProgress(localStorage, PACKS)).toEqual(
      emptyPackProgress(PACKS),
    );
    expect(loadPackStars(localStorage, PACKS)).toEqual(emptyPackStars(PACKS));
  });

  it('reset clears the share hash and the invalid-link banner', () => {
    openAppWithHash('#level=!!!');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(window.location.hash).toBe('#level=!!!');
    fireEvent.click(screen.getByRole('button', { name: `Play ${GAME_NAME}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('reset from a valid shared Board exits to Welcome with a clean store', () => {
    openAppWithHash(buildShareHash(FIXTURE_LEVEL));
    expect(screen.getByRole('grid')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    expect(screen.queryByRole('grid')).toBeNull();
    expect(window.location.hash).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(loadPackProgress(localStorage, PACKS)).toEqual(
      emptyPackProgress(PACKS),
    );
    expect(loadPackStars(localStorage, PACKS)).toEqual(emptyPackStars(PACKS));
  });
});
