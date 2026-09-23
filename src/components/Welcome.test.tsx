import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { PACKS } from '../game/pack';
import { createDefaultSettings, emptyPackProgress } from '../game/progress';
import { DISPLAY_FONT_FAMILY, DISPLAY_FONT_URL, GAME_NAME } from '../game/theme';
import Welcome from './Welcome';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const noop = () => {};

function welcomeHtml(progress = emptyPackProgress(PACKS)) {
  return renderToStaticMarkup(
    <Welcome
      packs={PACKS}
      progress={progress}
      settings={createDefaultSettings()}
      onSettingsChange={noop}
      onPlay={noop}
      onContinue={noop}
      onEnterPack={noop}
    />,
  );
}

describe('Welcome routing (#15)', () => {
  it('boots to the Welcome Screen, not Level select', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain(`<h1>${GAME_NAME}</h1>`);
    expect(html).toContain('aria-label="Mode"');
    expect(html).toContain('aria-label="Packs"');
    expect(html).not.toContain('role="tablist"');
  });

  it('shows Play for a fresh player and Continue resuming the highest unlocked Level', () => {
    expect(welcomeHtml()).toContain(`aria-label="Play ${GAME_NAME}"`);
    expect(welcomeHtml()).not.toContain('Continue:');

    const progress = emptyPackProgress(PACKS);
    progress.starter = [true, true, ...Array(8).fill(false)];
    const returning = welcomeHtml(progress);
    expect(returning).toContain('Continue: Starter Level 3');
    expect(returning).toContain('aria-label="Continue Starter Level 3"');
  });

  it('advances Continue past a fully-complete Pack', () => {
    const progress = emptyPackProgress(PACKS);
    progress.starter = Array(10).fill(true);
    const html = welcomeHtml(progress);
    expect(html).toContain('aria-label="Continue Classic Level 1"');
  });
});

describe('Welcome Mode card and Pack entry (#15)', () => {
  it('offers active Free Play and a disabled Time Trial with no logic', () => {
    const html = welcomeHtml();
    expect(html).toContain('aria-label="Free Play Mode, active, no timer"');
    expect(html).toContain('aria-label="Time Trial Mode, coming in version 3"');
    // Disabled in markup: no pointer path into Time Trial exists.
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Time Trial Mode/);
  });

  it('enters every Pack with Difficulty and progress in its label', () => {
    const html = welcomeHtml();
    for (const pack of PACKS) {
      expect(html).toContain(
        `aria-label="${pack.name} Pack, ${pack.difficulty} Difficulty, 0 of 10 complete"`,
      );
    }
  });

  it('carries the settings toggles and gates hero motion on the animation toggle', () => {
    const html = welcomeHtml();
    expect(html).toContain('<legend>Settings</legend>');
    expect(html).toContain('Sound');
    expect(html).toContain('Win animation');
    expect(html).toContain('welcome-hero welcome-animated');

    const still = renderToStaticMarkup(
      <Welcome
        packs={PACKS}
        progress={emptyPackProgress(PACKS)}
        settings={{ sound: true, animation: false }}
        onSettingsChange={noop}
        onPlay={noop}
        onContinue={noop}
        onEnterPack={noop}
      />,
    );
    expect(still).toContain('class="welcome-hero"');
    expect(still).not.toContain('welcome-animated');

    const css = read('src/App.css');
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.welcome-animated[\s\S]*animation: none/,
    );
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
});
