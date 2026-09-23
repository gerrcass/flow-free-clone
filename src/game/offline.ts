/**
 * Offline registration for Free Play story 14: playable after first load.
 * Thin wrapper so the App shell can register `public/sw.js` without
 * touching `navigator` directly; failures never break the game flow.
 */

export interface ServiceWorkerRegistrar {
  register(url: string): Promise<unknown>;
}

export interface RegisterServiceWorkerOptions {
  /** Injectable container; defaults to `navigator.serviceWorker` when present. */
  register?: ServiceWorkerRegistrar | undefined;
  /** Worker URL; defaults to `<BASE_URL>sw.js` (`/sw.js` in dev/test). */
  url?: string;
}

function defaultUrl(): string {
  try {
    const base =
      (import.meta as unknown as { env?: { BASE_URL?: string } })?.env?.BASE_URL ??
      '/';
    return `${base}sw.js`.replace(/\/\//g, '/');
  } catch {
    return '/sw.js';
  }
}

function defaultRegistrar(): ServiceWorkerRegistrar | undefined {
  try {
    const nav =
      typeof globalThis !== 'undefined'
        ? (globalThis as unknown as { navigator?: { serviceWorker?: unknown } })
            .navigator
        : undefined;
    const sw = nav?.serviceWorker as ServiceWorkerRegistrar | undefined;
    return typeof sw?.register === 'function' ? sw : undefined;
  } catch {
    return undefined;
  }
}

/** Register the offline worker; resolves true on success, false otherwise. */
export async function registerServiceWorker(
  options: RegisterServiceWorkerOptions = {},
): Promise<boolean> {
  const registrar = options.register ?? defaultRegistrar();
  if (!registrar) return false;
  const url = options.url ?? defaultUrl();
  try {
    await registrar.register(url);
    return true;
  } catch {
    return false;
  }
}
