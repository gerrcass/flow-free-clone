/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { PACKS } from '../game/pack';
import {
  PROGRESS_V2_KEY,
  emptyPackProgress,
  emptyPackStars,
} from '../game/progress';
import { GAME_NAME } from '../game/theme';
import Hud from './Hud';
import WinOverlay from './WinOverlay';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Hud star slot (#14)', () => {
  it('keeps the fill percent next to Par and earned stars', () => {
    render(<Hud fillPercent={42} par={25} stars={0} />);
    const hud = screen.getByRole('status', { name: /Filled 42 percent/i });
    expect(hud.textContent).toContain('Filled 42%');
    expect(hud.textContent).toContain('Par 25');
    expect(hud.textContent).toContain('☆☆☆');
  });

  it('announces earned stars out of three', () => {
    render(<Hud fillPercent={100} par={64} stars={3} />);
    expect(
      screen.getByRole('status', { name: /3 of 3 stars/i }),
    ).toBeTruthy();
    expect(screen.getByText('★★★')).toBeTruthy();
  });
});

describe('win overlay stars (#14)', () => {
  it('shows stars earned with Next Level and Level select actions', () => {
    const onNext = vi.fn();
    const onExit = vi.fn();
    render(
      <WinOverlay
        packName="Starter"
        levelNumber={1}
        starsEarned={2}
        hasNext
        animated={false}
        onNext={onNext}
        onExit={onExit}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Starter Level 1 complete' }),
    ).toBeTruthy();
    expect(screen.getByText('Earned 2 of 3 stars')).toBeTruthy();
    expect(screen.getByText('★★☆')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next Level' }));
    expect(onNext).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Level select' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('closes the Pack without a Next Level action on its last Level', () => {
    render(
      <WinOverlay
        packName="Expert"
        levelNumber={10}
        starsEarned={3}
        hasNext={false}
        animated={false}
        onNext={() => {}}
        onExit={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Next Level' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Level select' })).toBeTruthy();
    expect(screen.getByText('Pack complete — every Level solved.')).toBeTruthy();
  });
});

describe('HUD star slot in play (#14)', () => {
  function playStarterLevelOne(levelButtonName: string | RegExp) {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: `Play ${GAME_NAME}` }));
    const levelButtons = screen.getAllByRole('button', { name: levelButtonName });
    const inLevelSelect = levelButtons.find((button) =>
      button.classList.contains('level-button'),
    );
    if (!inLevelSelect) throw new Error('Starter Level 1 button not found');
    fireEvent.click(inLevelSelect);
  }

  it('shows fill percent, Par, and an empty star slot on a fresh Level', () => {
    playStarterLevelOne('Starter Level 1');
    expect(screen.getByRole('grid')).toBeTruthy();
    const hud = screen.getByRole('status', { name: /Filled 0 percent/i });
    expect(hud.textContent).toContain('Filled 0%');
    expect(hud.textContent).toContain('Par 25');
    expect(hud.textContent).toContain('☆☆☆');
  });

  it('shows persisted stars for a completed Level', () => {
    const completed = emptyPackProgress(PACKS);
    completed.starter[0] = true;
    const stars = emptyPackStars(PACKS);
    stars.starter[0] = 1;
    localStorage.setItem(
      PROGRESS_V2_KEY,
      JSON.stringify({ version: 2, completed, stars }),
    );
    playStarterLevelOne('Starter Level 1, completed');
    expect(
      screen.getByRole('status', { name: /1 of 3 stars/i }),
    ).toBeTruthy();
  });
});
