/**
 * @vitest-environment jsdom
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { PACKS } from '../game/pack';
import {
  PROGRESS_V2_KEY,
  emptyPackProgress,
  type PackProgress,
} from '../game/progress';
import { DISPLAY_FONT_FAMILY, DISPLAY_FONT_URL, GAME_NAME } from '../game/theme';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function seedProgress(overrides: Partial<PackProgress>) {
  const completed = { ...emptyPackProgress(PACKS), ...overrides };
  localStorage.setItem(
    PROGRESS_V2_KEY,
    JSON.stringify({ version: 2, completed }),
  );
}

const done = (n: number, total = 10) =>
  Array.from({ length: total }, (_, i) => i < n);

describe('Welcome routing (#15)', () => {
  it('boots to the Welcome Screen, not Level select', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: GAME_NAME })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Mode' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Packs' })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('offers a fresh player both Continue into Starter Level 1 and Play to browse', () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue Starter Level 1' }),
    );
    expect(screen.getByRole('grid')).toBeTruthy();
    expect(
      screen.getByRole('region', { name: 'Starter Level 1' }),
    ).toBeTruthy();
  });

  it('sends Play to Level select while Continue jumps straight into the Board', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: `Play ${GAME_NAME}` }));
    expect(screen.getByRole('tablist')).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('resumes the earliest unfinished Level and never jumps past it', () => {
    seedProgress({ starter: done(2), classic: done(1) });
    render(<App />);
    const cont = screen.getByRole('button', { name: 'Continue Starter Level 3' });
    fireEvent.click(cont);
    expect(
      screen.getByRole('region', { name: 'Starter Level 3' }),
    ).toBeTruthy();
  });

  it('advances Continue past a fully-complete Pack', () => {
    seedProgress({ starter: done(10) });
    render(<App />);
    expect(
      screen.getByRole('button', { name: 'Continue Classic Level 1' }),
    ).toBeTruthy();
  });

  it('shows Play alone when every Pack is complete: nothing left to resume', () => {
    seedProgress({ starter: done(10), classic: done(10), expert: done(10) });
    render(<App />);
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    expect(
      screen.getByRole('button', { name: `Play ${GAME_NAME}` }),
    ).toBeTruthy();
  });
});

describe('Welcome Mode card and Pack entry (#15)', () => {
  it('displays active Free Play and an inert, disabled Time Trial', () => {
    render(<App />);
    // Free Play is display copy, not navigation: no button behind it.
    expect(screen.queryByRole('button', { name: /Free Play/ })).toBeNull();
    expect(
      screen.getByLabelText('Free Play Mode, active, no timer').textContent,
    ).toContain('Free Play · active');

    const trial = screen.getByRole('button', {
      name: 'Time Trial Mode, coming in version 3',
    });
    expect(trial.textContent).toContain('coming in v3');
    expect((trial as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(trial);
    // No logic behind it: still on the Welcome Screen.
    expect(screen.getByRole('heading', { name: GAME_NAME })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('enters every Pack with Difficulty and progress, landing on its tab', () => {
    render(<App />);
    for (const pack of PACKS) {
      expect(
        screen.getByRole('button', {
          name: `${pack.name} Pack, ${pack.difficulty} Difficulty, 0 of 10 complete`,
        }),
      ).toBeTruthy();
    }
    fireEvent.click(
      screen.getByRole('button', { name: /Classic Pack, classic Difficulty/ }),
    );
    const tab = screen.getByRole('tab', { name: /Classic Pack/ });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(
      screen.getByRole('tabpanel', { name: /Classic Pack/ }),
    ).toBeTruthy();
  });

  it('carries the settings toggles and gates hero motion on the animation toggle', () => {
    render(<App />);
    expect(
      screen.getByRole('checkbox', { name: 'Sound' }) as HTMLInputElement,
    ).toHaveProperty('checked', true);
    const hero = document.querySelector('.welcome-hero');
    expect(hero?.className).toContain('welcome-animated');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Animation' }));
    expect(document.querySelector('.welcome-hero')?.className).not.toContain(
      'welcome-animated',
    );

    const css = read('src/App.css');
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.welcome-animated[\s\S]*animation: none/,
    );
  });

  it('reads Pack entry in the rounded display face', () => {
    const css = read('src/App.css');
    expect(css).toMatch(/\.welcome-packs button[\s\S]*font-family: var\(--heading\)/);
  });
});

describe('Welcome type system and brand (#15)', () => {
  it('preloads the self-hosted display face with a system fallback and no CDN fetch', () => {
    const html = read('index.html');
    expect(html).toContain(`href="${DISPLAY_FONT_URL}"`);
    expect(html).toMatch(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/);
    expect(html).toMatch(/<link[^>]*type="font\/woff2"[^>]*crossorigin[^>]*>/);
    expect(existsSync(join(root, 'public', DISPLAY_FONT_URL))).toBe(true);

    const css = read('src/index.css');
    expect(css).toContain(`font-family: '${DISPLAY_FONT_FAMILY}'`);
    expect(css).toContain(DISPLAY_FONT_URL);
    expect(css).toContain('font-display: swap');
    // Top-level on purpose: nesting the face inside a color-scheme query
    // would silently drop the display face in the other scheme.
    expect(css.indexOf('@font-face')).toBeLessThan(css.indexOf('@media'));
    expect(css).toMatch(/--heading:[\s\S]*system-ui/);
    // Offline guarantee: no runtime CDN font fetch anywhere in the shell.
    for (const file of ['index.html', 'src/index.css', 'src/App.css']) {
      expect(read(file)).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    }
  });

  it('carries the Pipe Trails wordmark through title and manifest', () => {
    expect(GAME_NAME).toBe('Pipe Trails');
    expect(read('index.html')).toContain(`<title>${GAME_NAME} — Free Play pipe puzzle</title>`);
    const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
      name: string;
      short_name: string;
    };
    expect(manifest.name).toContain(GAME_NAME);
    expect(manifest.short_name).toBe(GAME_NAME);
  });

  it('precaches the display face in the offline worker with subpath-safe paths', () => {
    const sw = read('public/sw.js');
    expect(sw).toContain('fonts/baloo-2-latin.woff2');
    expect(sw).not.toContain('"/fonts/');
    expect(sw).not.toContain('"/index.html"');
    expect(read('vite.config.ts')).toContain("base: './'");
  });
});
