/**
 * @vitest-environment jsdom
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { PACKS, displayDifficulty } from '../game/pack';
import {
  PROGRESS_V2_KEY,
  emptyPackProgress,
  type PackProgress,
} from '../game/progress';
import { DISPLAY_FONT_FAMILY, DISPLAY_FONT_FILE, GAME_NAME } from '../game/theme';

const root = process.cwd();
const readFile = (rel: string) => readFileSync(join(root, rel), 'utf8');

/** Parsed App.css stylesheet: rule-level assertions instead of string matching. */
function appStyleSheet(): CSSStyleSheet {
  const style = document.createElement('style');
  style.textContent = readFile('src/App.css');
  document.head.appendChild(style);
  const sheet = style.sheet;
  if (!sheet) throw new Error('App.css did not parse into a stylesheet');
  return sheet;
}

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

const firstComplete = (n: number, total = 10) =>
  Array.from({ length: total }, (_, i) => i < n);

describe('Welcome routing (#15)', () => {
  it('boots to the Welcome Screen, not Level select', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: GAME_NAME })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Mode' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Packs' })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('greys Continue for a fresh player: the affordance shows, Play moves', () => {
    render(<App />);
    const continueButton = screen.getByRole('button', {
      name: 'Continue: no saved progress yet',
    });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(continueButton);
    expect(screen.queryByRole('grid')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: `Play ${GAME_NAME}` }));
    expect(screen.getByRole('tablist')).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('sends Play to Level select while Continue jumps straight into the Board', () => {
    seedProgress({ starter: firstComplete(2) });
    render(<App />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue Starter Level 3' }),
    );
    expect(screen.getByRole('grid')).toBeTruthy();
    expect(
      screen.getByRole('region', { name: 'Starter Level 3' }),
    ).toBeTruthy();
  });

  it('resumes the highest unlocked Pack/Level: furthest progress wins', () => {
    seedProgress({ starter: firstComplete(2), classic: firstComplete(1) });
    render(<App />);
    const continueButton = screen.getByRole('button', {
      name: 'Continue Classic Level 2',
    });
    fireEvent.click(continueButton);
    expect(
      screen.getByRole('region', { name: 'Classic Level 2' }),
    ).toBeTruthy();
  });

  it('advances Continue past a fully-complete Pack', () => {
    seedProgress({ starter: firstComplete(10) });
    render(<App />);
    expect(
      screen.getByRole('button', { name: 'Continue Classic Level 1' }),
    ).toBeTruthy();
  });

  it('greys Continue when every Pack is complete: nothing left to resume', () => {
    seedProgress({ starter: firstComplete(10), classic: firstComplete(10), expert: firstComplete(10) });
    render(<App />);
    const continueButton = screen.getByRole('button', {
      name: 'Continue: everything complete',
    });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(continueButton);
    expect(screen.queryByRole('grid')).toBeNull();
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
          name: `${pack.name} Pack, ${displayDifficulty(pack.difficulty)} Difficulty, 0 of 10 complete`,
        }),
      ).toBeTruthy();
    }
    fireEvent.click(
      screen.getByRole('button', { name: /Classic Pack, Classic Difficulty/ }),
    );
    const tab = screen.getByRole('tab', { name: /Classic Pack/ });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(
      screen.getByRole('tabpanel', { name: /Classic Pack/ }),
    ).toBeTruthy();
  });

  it('carries the settings toggles; hero motion is CSS-only plus reduced-motion', () => {
    render(<App />);
    expect(
      screen.getByRole('checkbox', { name: 'Sound' }) as HTMLInputElement,
    ).toHaveProperty('checked', true);
    expect(
      screen.getByRole('checkbox', { name: 'Win animation' }),
    ).toBeTruthy();

    // CSS-only rise, no toggle involved: parsed stylesheet rules (not
    // string matching) carry the keyframes, and prefers-reduced-motion
    // disables the hero unconditionally.
    const sheet = appStyleSheet();
    const texts = Array.from(sheet.cssRules, (rule) => rule.cssText);
    expect(
      texts.some(
        (text) =>
          text.includes('welcome-rise') &&
          (text.includes('@keyframes') || text.includes('translateY')),
      ),
    ).toBe(true);
    const reduced = Array.from(sheet.cssRules).find(
      (rule) =>
        rule.type === CSSRule.MEDIA_RULE &&
        (rule as CSSMediaRule).media.mediaText.includes(
          'prefers-reduced-motion',
        ),
    ) as CSSMediaRule | undefined;
    expect(reduced).toBeTruthy();
    const heroRule = Array.from(reduced?.cssRules ?? []).find(
      (rule) =>
        rule.type === CSSRule.STYLE_RULE &&
        (rule as CSSStyleRule).selectorText.includes('.welcome-hero'),
    ) as CSSStyleRule | undefined;
    expect(heroRule?.style.getPropertyValue('animation')).toContain('none');
  });

  it('reads Pack entry in the rounded display face', () => {
    const sheet = appStyleSheet();
    const packRule = Array.from(sheet.cssRules).find(
      (rule) =>
        rule.type === CSSRule.STYLE_RULE &&
        (rule as CSSStyleRule).selectorText === '.welcome-packs button',
    ) as CSSStyleRule | undefined;
    expect(
      packRule?.style.getPropertyValue('font-family'),
    ).toContain('var(--heading)');
  });

  it('reads Pack entry in the rounded display face', () => {
    const css = readFile('src/App.css');
    expect(css).toMatch(/\.welcome-packs button[\s\S]*font-family: var\(--heading\)/);
  });
});

describe('Welcome type system and brand (#15)', () => {
  const shellDoc = () =>
    new DOMParser().parseFromString(readFile('index.html'), 'text/html');

  it('preloads the self-hosted display face with a system fallback and no CDN fetch', () => {
    // DOM-parsed shell: the preload link, icon, and manifest carry
    // document-relative hrefs — never root-absolute — so subpath hosting
    // holds without relying on build rebasing alone.
    const head = shellDoc().head;
    const preload = head.querySelector(
      'link[rel="preload"][as="font"][type="font/woff2"]',
    );
    expect(preload?.getAttribute('href')).toBe(`./${DISPLAY_FONT_FILE}`);
    expect(preload?.hasAttribute('crossorigin')).toBe(true);
    for (const href of [
      head.querySelector('link[rel="icon"]')?.getAttribute('href'),
      head.querySelector('link[rel="manifest"]')?.getAttribute('href'),
      preload?.getAttribute('href'),
    ]) {
      expect(href).toBeTruthy();
      expect(href?.startsWith('/')).toBe(false);
    }
    expect(shellDoc().title).toBe(`${GAME_NAME} — Free Play pipe puzzle`);
    expect(existsSync(join(root, 'public', DISPLAY_FONT_FILE))).toBe(true);

    // The face itself lives in the inline <style> so its URL resolves
    // against the document, not a stylesheet directory.
    const style = head.querySelector('style')?.textContent ?? '';
    expect(style).toContain(`font-family: '${DISPLAY_FONT_FAMILY}'`);
    expect(style).toContain(`url('./${DISPLAY_FONT_FILE}')`);
    expect(style).toContain('font-display: swap');

    const css = readFile('src/index.css');
    expect(css).toContain(`'${DISPLAY_FONT_FAMILY}'`);
    expect(css).toMatch(/--heading:[\s\S]*system-ui/);
    // Offline guarantee: no runtime CDN font fetch anywhere in the shell.
    for (const file of ['index.html', 'src/index.css', 'src/App.css']) {
      expect(readFile(file)).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    }
  });

  it('carries the Pipe Trails wordmark through title and manifest', () => {
    expect(GAME_NAME).toBe('Pipe Trails');
    expect(readFile('index.html')).toContain(`<title>${GAME_NAME} — Free Play pipe puzzle</title>`);
    const manifest = JSON.parse(readFile('public/manifest.webmanifest')) as {
      name: string;
      short_name: string;
    };
    expect(manifest.name).toContain(GAME_NAME);
    expect(manifest.short_name).toBe(GAME_NAME);
  });

  it('precaches the display face in the offline worker with subpath-safe paths', () => {
    const sw = readFile('public/sw.js');
    expect(sw).toContain('fonts/baloo-2-latin.woff2');
    expect(sw).not.toContain('"/fonts/');
    expect(sw).not.toContain('"/index.html"');
    expect(readFile('vite.config.ts')).toContain("base: './'");
  });
});
