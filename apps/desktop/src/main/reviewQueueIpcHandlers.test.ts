import { describe, expect, it, vi } from 'vitest';
import type { LivingThesisReviewQueue } from '@thesis-investing/core';
import { createReviewQueueIpcHandlers } from './reviewQueueIpcHandlers';
import { createReviewQueuePreloadApi } from '../preload/reviewQueuePreload';
import { reviewQueueStorageChannels as channels } from '../shared/reviewQueueStorage';
import type { ReviewQueueStorageResult } from '../shared/reviewQueueStorage';

function setup() {
  const queue: LivingThesisReviewQueue = {
    algorithmVersion: 1,
    assessedAt: '2026-09-27T10:00:00.000Z',
    referenceDate: '2026-09-27',
    items: [],
    eligibleThesisCount: 0,
    excludedThesisCount: 0
  };
  const service = {
    get: vi.fn<(today: string) => Promise<ReviewQueueStorageResult<LivingThesisReviewQueue>>>(async () => ({
      ok: true,
      value: queue
    })),
    close: vi.fn(async () => undefined)
  };
  const handlers = createReviewQueueIpcHandlers(service);
  const invoke = vi.fn(async (channel: string, ...args: unknown[]) => {
    if (channel === channels.get) return handlers.get(args[0], ...args.slice(1));
    throw new Error('Unrecognized queue channel');
  });
  return { queue, service, handlers, invoke, api: createReviewQueuePreloadApi(invoke) };
}

describe('review queue IPC boundary', () => {
  it('routes one calendar date through the read-only bridge', async () => {
    const { queue, service, handlers, invoke, api } = setup();

    expect(await api.get('2026-09-27')).toEqual({ ok: true, value: queue });
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith('review-queue:get', '2026-09-27');
    expect(service.get).toHaveBeenCalledOnce();
    expect(service.get).toHaveBeenCalledWith('2026-09-27');
    expect(Object.keys(handlers)).toEqual(['get']);
    expect(Object.keys(api)).toEqual(['get']);
    expect(service.close).not.toHaveBeenCalled();
  });

  it('rejects malformed dates and additional renderer inputs before storage access', async () => {
    const { handlers, service } = setup();
    for (const invalid of [
      undefined, null, {}, [], 3, true, '', ' ', '2026-9-27',
      '2026-09-27T00:00:00.000Z', '2026-02-30', '2025-02-29',
      '2026-13-01', ' 2026-09-27', '2026-09-27 '
    ]) {
      expect((await handlers.get(invalid)).ok).toBe(false);
    }
    expect((await handlers.get('2026-09-27', { items: [], priority: 100 })).ok).toBe(false);
    expect((await handlers.get('2026-09-27', undefined)).ok).toBe(false);
    expect(service.get).not.toHaveBeenCalled();
    expect((await handlers.get('2024-02-29')).ok).toBe(true);
    expect(service.get).toHaveBeenCalledOnce();
    expect(service.get).toHaveBeenCalledWith('2024-02-29');
  });

  it('preserves service failures and allows a later refresh', async () => {
    const { api, service, queue } = setup();
    const unavailable = { ok: false as const, errors: ['Queue is temporarily unavailable.'] };
    service.get.mockResolvedValueOnce(unavailable);

    expect(await api.get('2026-09-27')).toEqual(unavailable);
    expect(await api.get('2026-09-27')).toEqual({ ok: true, value: queue });
    expect(service.get).toHaveBeenCalledTimes(2);
  });
});
