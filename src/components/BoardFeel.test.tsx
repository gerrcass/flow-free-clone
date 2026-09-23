/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import Board from './Board';
import Hud from './Hud';
import WinOverlay from './WinOverlay';
import { createInitialState } from '../game/reducer';
import type { Level } from '../game/types';
import { PALETTE } from '../game/theme';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const root = process.cwd();
const readFile = (rel: string) => readFileSync(join(root, rel), 'utf8');

/** Two-Color 3x3 Board: R connects across the top row, G stays open. */
const LEVEL: Level = {
  size: 3,
  colors: [
    {
      id: 'R',
      endpoints: [
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ],
    },
    {
      id: 'G',
      endpoints: [
        { row: 2, col: 0 },
        { row: 2, col: 2 },
      ],
    },
  ],
};

function stateWithPipes() {
  const state = createInitialState(LEVEL);
  return {
    ...state,
    pipes: {
      R: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      G: [{ row: 2, col: 0 }],
    },
  };
}

describe('HUD per-Color dots (#13)', () => {
  it('lists one dot per Color with connected state beside fill percent', () => {
    render(
      <Hud
        fillPercent={44}
        par={9}
        stars={0}
        colors={[
          { id: 'R', connected: true },
          { id: 'G', connected: false },
        ]}
      />,
    );
    const hud = screen.getByRole('status', { name: /Filled 44 percent/i });
    expect(hud.textContent).toContain('Filled 44%');
    const dots = screen.getByRole('list', { name: /Colors/i });
    expect(dots.textContent).toContain('R');
    expect(dots.textContent).toContain('G');
    const red = screen.getByRole('listitem', { name: 'R connected' });
    const green = screen.getByRole('listitem', { name: 'G not connected' });
    // The Color id and status survive even where aria-label on the item
    // is ignored: neither may hide inside aria-hidden content.
    for (const [item, id, status] of [
      [red, 'R', 'connected'],
      [green, 'G', 'not connected'],
    ] as const) {
      expect(within(item).getByText(id).getAttribute('aria-hidden')).toBeNull();
      expect(within(item).getByText(status).getAttribute('aria-hidden')).toBeNull();
    }
  });
});

describe('Board connected Pipes + Endpoint rings (#13)', () => {
  it('keeps grid roles while marking connected vs open Pipes', () => {
    const { container } = render(
      <Board state={stateWithPipes()} dispatch={() => {}} />,
    );
    expect(screen.getByRole('grid', { name: '3 by 3 Board' })).toBeTruthy();
    expect(screen.getAllByRole('gridcell').length).toBe(9);
    const connected = container.querySelectorAll('.pipe-connected');
    const open = container.querySelectorAll('.pipe-open');
    expect(connected.length).toBe(3);
    expect(open.length).toBe(1);
  });

  it('rings connected Endpoints differently from open ones', () => {
    const { container } = render(
      <Board state={stateWithPipes()} dispatch={() => {}} />,
    );
    const rings = container.querySelectorAll('.endpoint-connected');
    expect(rings.length).toBe(2);
    const openRings = container.querySelectorAll('.endpoint-open');
    expect(openRings.length).toBe(2);
    const css = readFile('src/components/Board.css');
    expect(css).toContain('.endpoint-connected');
    expect(css).toContain('.pipe-connected');
  });

  it('paints Pipes and Endpoints with the retuned palette in the DOM', () => {
    const { container } = render(
      <Board state={stateWithPipes()} dispatch={() => {}} />,
    );
    // Independent literals (not recomputed from PALETTE): the R Pipe must
    // carry the retuned #f2557a, not the old #ef476f.
    const pipe = container.querySelector('.pipe-connected') as HTMLElement;
    expect(pipe.style.backgroundColor).toBe('rgb(242, 85, 122)');
    const ring = container.querySelector('.endpoint-connected') as HTMLElement;
    expect(ring.style.backgroundColor).toBe('rgb(242, 85, 122)');
    const openPipe = container.querySelector('.pipe-open') as HTMLElement;
    expect(openPipe.style.backgroundColor).toBe('rgb(6, 214, 160)');
  });
});

describe('palette legible on dark Cells (#13)', () => {
  const IDS = ['R', 'G', 'B', 'Y', 'P', 'O', 'C', 'M'];

  it('keeps every Color at >=4:1 contrast against the Cell fill', () => {
    const luminance = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const f = (c: number) =>
        c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const cellBg = luminance('#262933');
    for (const id of IDS) {
      const l = luminance(PALETTE[id]);
      const ratio =
        (Math.max(l, cellBg) + 0.05) / (Math.min(l, cellBg) + 0.05);
      expect(ratio).toBeGreaterThanOrEqual(4);
    }
  });

  it('keeps every Color pair hue-separated so neighbors stay distinct', () => {
    const hueOf = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return 0;
      const d = max - min;
      let h = 0;
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      return h < 0 ? h + 360 : h;
    };
    let minDistance = 180;
    for (let i = 0; i < IDS.length; i++) {
      for (let j = i + 1; j < IDS.length; j++) {
        const a = hueOf(PALETTE[IDS[i]]);
        const b = hueOf(PALETTE[IDS[j]]);
        const distance = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
        minDistance = Math.min(minDistance, distance);
      }
    }
    expect(minDistance).toBeGreaterThanOrEqual(20);
  });
});

describe('win overlay restyle (#13)', () => {
  it('shows stars, actions, and a restyled card honoring the animation toggle', () => {
    const { container, rerender } = render(
      <WinOverlay
        packName="Starter"
        levelNumber={1}
        starsEarned={2}
        hasNext
        animated
        onNext={() => {}}
        onExit={() => {}}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Starter Level 1 complete' }),
    ).toBeTruthy();
    expect(screen.getByText('Earned 2 of 3 stars')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next Level' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Level select' })).toBeTruthy();
    expect(
      container.querySelector('.win-overlay.win-animated'),
    ).toBeTruthy();
    expect(container.querySelector('.win-card')).toBeTruthy();

    rerender(
      <WinOverlay
        packName="Starter"
        levelNumber={1}
        starsEarned={2}
        hasNext
        animated={false}
        onNext={() => {}}
        onExit={() => {}}
      />,
    );
    expect(
      container.querySelector('.win-animated'),
    ).toBeNull();
  });

  it('kills win motion under prefers-reduced-motion via parsed stylesheet rules', () => {
    const style = document.createElement('style');
    style.textContent = readFile('src/App.css');
    document.head.appendChild(style);
    const sheet = style.sheet;
    if (!sheet) throw new Error('App.css did not parse into a stylesheet');
    const rules = Array.from(sheet.cssRules);
    const animated = rules.find(
      (candidate) =>
        candidate.type === CSSRule.STYLE_RULE &&
        (candidate as CSSStyleRule).selectorText === '.win-animated',
    ) as CSSStyleRule | undefined;
    expect(animated?.style.getPropertyValue('animation')).toContain('win-pop');
    const reduced = rules.find(
      (candidate) =>
        candidate.type === CSSRule.MEDIA_RULE &&
        (candidate as CSSMediaRule).media.mediaText.includes(
          'prefers-reduced-motion',
        ),
    ) as CSSMediaRule | undefined;
    expect(reduced).toBeTruthy();
    const killed = Array.from(reduced?.cssRules ?? []).filter(
      (candidate) =>
        candidate.type === CSSRule.STYLE_RULE &&
        (candidate as CSSStyleRule).style.getPropertyValue('animation').includes('none'),
    );
    expect(killed.length).toBeGreaterThan(0);
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

describe('toggles respected across surfaces (#13)', () => {
  it('carries the Sound toggle from Welcome into Level select', () => {
    render(<App />);
    const welcomeSound = screen.getByRole('checkbox', {
      name: 'Sound',
    }) as HTMLInputElement;
    expect(welcomeSound.checked).toBe(true);
    fireEvent.click(welcomeSound);
    expect(welcomeSound.checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /Play Pipe Trails/ }));
    const selectSound = screen.getByRole('checkbox', {
      name: 'Sound',
    }) as HTMLInputElement;
    expect(selectSound.checked).toBe(false);
  });
});
