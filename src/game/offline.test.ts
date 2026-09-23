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
