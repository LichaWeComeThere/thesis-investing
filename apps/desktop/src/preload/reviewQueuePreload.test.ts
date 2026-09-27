import { describe, expect, it, vi } from 'vitest';
import { reviewQueueStorageChannels } from '../shared/reviewQueueStorage';
import { createReviewQueuePreloadApi } from './reviewQueuePreload';

describe('createReviewQueuePreloadApi', () => {
  it('exposes only the queue read channel with the supplied date', async () => {
    const result = { ok: false as const, errors: ['Read unavailable.'] };
    const invoke = vi.fn(async () => result);
    const api = createReviewQueuePreloadApi(invoke);

    expect(await api.get('2026-09-27')).toBe(result);
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith(reviewQueueStorageChannels.get, '2026-09-27');
    expect(Object.keys(api)).toEqual(['get']);
  });
});
