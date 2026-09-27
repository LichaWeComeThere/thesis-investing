import type { ReviewQueueStorageApi } from '../../shared/reviewQueueStorage';

export type ReviewQueueStorageClient = ReviewQueueStorageApi;

export function getDefaultReviewQueueStorageClient(): ReviewQueueStorageClient | null {
  return typeof window === 'undefined' ? null : window.thesisInvesting?.reviewQueue ?? null;
}
