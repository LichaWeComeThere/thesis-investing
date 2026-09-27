import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDefaultReviewQueueStorageClient } from './reviewQueueStorageClient';

afterEach(() => vi.unstubAllGlobals());

describe('getDefaultReviewQueueStorageClient', () => {
  it('returns null when the desktop preload bridge is unavailable', () => {
    vi.stubGlobal('window', undefined);
    expect(getDefaultReviewQueueStorageClient()).toBeNull();
    vi.stubGlobal('window', {});
    expect(getDefaultReviewQueueStorageClient()).toBeNull();
    vi.stubGlobal('window', { thesisInvesting: {} });
    expect(getDefaultReviewQueueStorageClient()).toBeNull();
  });

  it('returns only the read-only queue preload API', () => {
    const reviewQueue = {
      get: vi.fn(async () => ({ ok: false as const, errors: ['Unavailable.'] }))
    };
    vi.stubGlobal('window', {
      thesisInvesting: { reviewQueue, unrelated: { save: vi.fn() } }
    });

    expect(getDefaultReviewQueueStorageClient()).toBe(reviewQueue);
    expect(reviewQueue.get).not.toHaveBeenCalled();
  });
});
