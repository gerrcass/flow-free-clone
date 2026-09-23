import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './offline';

describe('registerServiceWorker', () => {
  it('resolves false when no service-worker container is available', async () => {
    await expect(registerServiceWorker({ register: undefined })).resolves.toBe(false);
  });

  it('registers the app-shell worker and resolves true', async () => {
    const registerFn = vi.fn(async (_url: string) => ({ scope: '/' }));
    await expect(registerServiceWorker({ register: { register: registerFn } })).resolves.toBe(
      true,
    );
    expect(registerFn).toHaveBeenCalledTimes(1);
    expect(registerFn.mock.calls[0][0]).toMatch(/sw\.js$/);
  });

  it('resolves false instead of rejecting when registration fails', async () => {
    const registerFn = vi.fn(async (_url: string) => {
      throw new Error('denied');
    });
    await expect(
      registerServiceWorker({ register: { register: registerFn } }),
    ).resolves.toBe(false);
  });

  it('resolves false when register throws synchronously', async () => {
    const registerFn = () => {
      throw new Error('sync boom');
    };
    await expect(
      registerServiceWorker({ register: { register: registerFn } }),
    ).resolves.toBe(false);
  });
});

/**
 * Behavioral exercise of public/sw.js (#16): the worker source is
 * evaluated with stubbed service-worker globals and its install/fetch
 * handlers are driven directly, so the tests prove offline serving
 * instead of matching source text.
 */
describe('offline app shell (#16)', () => {
  const ORIGIN = 'https://example.test';
  const WORKER_URL = `${ORIGIN}/sw.js`;

  interface StubResponse {
    ok: boolean;
    url: string;
    clone(): StubResponse;
  }

  function stubResponse(url: string): StubResponse {
    const res: StubResponse = {
      ok: true,
      url,
      clone: () => stubResponse(url),
    };
    return res;
  }

  /** Cache-API key the way the worker sees it: URLs resolved at the worker. */
  function cacheKey(req: string | { url: string }): string {
    const raw = typeof req === 'string' ? req : req.url;
    return new URL(raw, WORKER_URL).href;
  }

  interface WorkerHarness {
    handlers: Map<string, (event: never) => void>;
    store: Map<string, Map<string, StubResponse>>;
    skipWaiting: () => void;
    fetchImpl: (req: unknown) => Promise<StubResponse>;
  }

  function loadWorker(fetchImpl: WorkerHarness['fetchImpl']): WorkerHarness {
    const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
    const handlers = new Map<string, (event: never) => void>();
    const store = new Map<string, Map<string, StubResponse>>();
    const skipWaiting = vi.fn();
    const selfStub = {
      location: { origin: ORIGIN, href: WORKER_URL },
      skipWaiting,
      clients: { claim: () => Promise.resolve() },
      addEventListener: (type: string, handler: (event: never) => void) => {
        handlers.set(type, handler);
      },
    };
    const cachesStub = {
      open: (name: string) => {
        if (!store.has(name)) store.set(name, new Map());
        const bucket = store.get(name)!;
        return Promise.resolve({
          addAll: (urls: string[]) => {
            for (const url of urls) {
              const key = cacheKey(url);
              bucket.set(key, stubResponse(key));
            }
            return Promise.resolve();
          },
          put: (req: string | { url: string }, res: StubResponse) => {
            bucket.set(cacheKey(req), res);
            return Promise.resolve();
          },
        });
      },
      keys: () => Promise.resolve([...store.keys()]),
      delete: (name: string) => Promise.resolve(store.delete(name)),
      match: (req: string | { url: string }) => {
        for (const bucket of store.values()) {
          const hit = bucket.get(cacheKey(req));
          if (hit) return Promise.resolve(hit);
        }
        return Promise.resolve(undefined);
      },
    };
    const run = new Function('self', 'caches', 'fetch', source) as (
      self: unknown,
      caches: unknown,
      fetch: unknown,
    ) => void;
    run(selfStub, cachesStub, fetchImpl);
    return { handlers, store, skipWaiting, fetchImpl };
  }

  function eventWithWait() {
    let waited: Promise<unknown> = Promise.resolve();
    return {
      waitUntil: (promise: Promise<unknown>) => {
        waited = promise;
      },
      get waited() {
        return waited;
      },
    };
  }

  function fetchEvent(request: { method: string; mode: string; url: string }) {
    let responded: Promise<unknown> = Promise.resolve();
    return {
      request,
      respondWith: (promise: Promise<unknown>) => {
        responded = promise;
      },
      get responded() {
        return responded;
      },
    };
  }

  it('precaches the shell on install so the game boots after first load', async () => {
    const worker = loadWorker(() => Promise.reject(new Error('offline')));
    const install = worker.handlers.get('install');
    expect(install).toBeDefined();
    const event = eventWithWait();
    install!(event as never);
    await event.waited;
    const cached = worker.store.get('pipe-trails-v1');
    expect(cached).toBeDefined();
    for (const asset of [
      './',
      'index.html',
      'manifest.webmanifest',
      'favicon.svg',
      'icons.svg',
    ]) {
      expect(cached!.has(new URL(asset, WORKER_URL).href)).toBe(true);
    }
    expect(worker.skipWaiting).toHaveBeenCalled();
  });

  it('serves the cached shell for a share-link navigation while offline', async () => {
    const worker = loadWorker(() => Promise.reject(new Error('offline')));
    const install = eventWithWait();
    worker.handlers.get('install')!(install as never);
    await install.waited;
    const event = fetchEvent({
      method: 'GET',
      mode: 'navigate',
      url: `${ORIGIN}/#level=abc`,
    });
    worker.handlers.get('fetch')!(event as never);
    const response = (await event.responded) as StubResponse | undefined;
    expect(response?.url).toBe(new URL('index.html', WORKER_URL).href);
  });

  it('serves cached shell assets cache-first while offline', async () => {
    const worker = loadWorker(() => Promise.reject(new Error('offline')));
    const install = eventWithWait();
    worker.handlers.get('install')!(install as never);
    await install.waited;
    const event = fetchEvent({
      method: 'GET',
      mode: 'no-cors',
      url: new URL('favicon.svg', WORKER_URL).href,
    });
    worker.handlers.get('fetch')!(event as never);
    const response = (await event.responded) as StubResponse | undefined;
    expect(response?.url).toBe(new URL('favicon.svg', WORKER_URL).href);
  });
});
