import type { LivingThesisReviewQueue } from '@thesis-investing/core';

export const reviewQueueStorageChannels = { get: 'review-queue:get' } as const;

export type ReviewQueueStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: readonly string[] };

/** A derived read view; queue priorities have no independent mutation endpoint. */
export type ReviewQueueStorageApi = {
  get(today: string): Promise<ReviewQueueStorageResult<LivingThesisReviewQueue>>;
};
