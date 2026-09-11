import type { ReviewSessionsStorageApi } from '../../shared/reviewSessionsStorage';

export function getDefaultReviewSessionsStorageClient(): ReviewSessionsStorageApi | null {
  return typeof window === 'undefined' ? null : window.thesisInvesting?.reviewSessions ?? null;
}
