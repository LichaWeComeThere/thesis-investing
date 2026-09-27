import { describe, expect, it, vi } from 'vitest';
import { createDataConnectionIpcHandlers } from './dataConnectionIpcHandlers';
import { createDataConnectionPreloadApi, createCompanyDetailsPreloadApi } from '../preload/dataConnectionPreload';
import { dataConnectionChannels as channels } from '../shared/companyDetails';

function setup() {
  const status = { ok: true as const, value: { provider: 'alpha-vantage' as const, configured: false, secureStorageAvailable: true, adapterAvailable: false } };
  const view = { ok: true as const, value: { thesisId: 'thesis', ticker: null, data: null, freshness: 'unavailable' as const } };
  const service = { status: vi.fn(async () => status), remove: vi.fn(async () => status), saveKey: vi.fn(async () => status),
    getCached: vi.fn(async () => view), refresh: vi.fn(async () => view) };
  const getService = vi.fn(() => service);
  const handlers = createDataConnectionIpcHandlers(getService);
  const invoke = vi.fn(async (channel: string, ...args: unknown[]) => {
    switch (channel) {
      case channels.status: return handlers.status(...args);
      case channels.remove: return handlers.remove(...args);
      case channels.saveKey: return handlers.saveKey(args[0], ...args.slice(1));
      case channels.getCached: return handlers.getCached(args[0], ...args.slice(1));
      case channels.refresh: return handlers.refresh(args[0], ...args.slice(1));
      default: throw new Error('Unexpected channel');
    }
  });
  return { service, getService, handlers, invoke, connection: createDataConnectionPreloadApi(invoke), details: createCompanyDetailsPreloadApi(invoke) };
}

describe('optional connection IPC and preload', () => {
  it('exposes only fixed use cases and preserves result targets without credential readback', async () => {
    const { connection, details, invoke } = setup();
    expect(Object.keys(connection)).toEqual(['status', 'saveKey', 'remove']);
    expect(Object.keys(details)).toEqual(['getCached', 'refresh']);
    await connection.status(); await connection.saveKey('synthetic-key'); await connection.remove();
    await details.getCached('thesis'); await details.refresh('thesis');
    expect(invoke.mock.calls).toEqual([[channels.status], [channels.saveKey, 'synthetic-key'], [channels.remove], [channels.getCached, 'thesis'], [channels.refresh, 'thesis']]);
    expect(JSON.stringify(await connection.status())).not.toContain('synthetic-key');
  });
  it('rejects malformed inputs and extra arguments before creating any resources', async () => {
    const { handlers, getService } = setup();
    for (const bad of [undefined, null, true, {}, [], '', ' ', 'two words', '\nkey', 'k'.repeat(257)]) {
      expect(await handlers.saveKey(bad)).toMatchObject({ ok: false, error: { code: 'invalid-request' } });
    }
    for (const bad of [undefined, null, true, {}, [], '', ' ', '\n', 'x'.repeat(201)]) {
      expect((await handlers.getCached(bad)).ok).toBe(false);
      expect((await handlers.refresh(bad)).ok).toBe(false);
    }
    expect((await handlers.status(undefined)).ok).toBe(false);
    expect((await handlers.remove({})).ok).toBe(false);
    expect((await handlers.saveKey('synthetic', undefined)).ok).toBe(false);
    expect((await handlers.getCached('thesis', undefined)).ok).toBe(false);
    expect((await handlers.refresh('thesis', 'https://evil.invalid')).ok).toBe(false);
    expect(getService).not.toHaveBeenCalled();
  });
  it('sanitizes initialization and unexpected asynchronous failures without relaying secret text', async () => {
    const handlers = createDataConnectionIpcHandlers(() => { throw new Error('synthetic-secret/path'); });
    expect(await handlers.status()).toMatchObject({ ok: false, error: { code: 'storage' } });
    expect(JSON.stringify(await handlers.saveKey('synthetic-secret'))).not.toContain('synthetic-secret');
    const { service, connection } = setup();
    service.status.mockRejectedValueOnce(new Error('synthetic-secret'));
    expect(JSON.stringify(await connection.status())).not.toContain('synthetic-secret');
    expect((await connection.status()).ok).toBe(true);
  });
});
