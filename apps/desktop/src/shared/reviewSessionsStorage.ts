import type { LivingThesis, LivingThesisReviewSession, LivingThesisReviewWorkflow, LivingThesisRevision, MbsScoreSnapshot } from '@thesis-investing/core';

export const reviewSessionsStorageChannels = {
  getActive: 'review-sessions:get-active',
  start: 'review-sessions:start',
  resume: 'review-sessions:resume',
  saveDraft: 'review-sessions:save-draft',
  complete: 'review-sessions:complete'
} as const;

export type ResumedReviewSession = {
  session: LivingThesisReviewSession;
  currentThesis: LivingThesis;
  baselineStatus: 'current' | 'changed' | 'archived';
};

export type CompletedReviewSession = {
  session: LivingThesisReviewSession;
  thesis: LivingThesis;
  revision: LivingThesisRevision;
  scoreSnapshot?: MbsScoreSnapshot;
};

export type ReviewSessionResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: readonly string[] };

export type ReviewSessionsStorageApi = {
  getActive(thesisId: string): Promise<ReviewSessionResult<ResumedReviewSession | null>>;
  start(thesisId: string): Promise<ReviewSessionResult<LivingThesisReviewSession>>;
  resume(id: string): Promise<ReviewSessionResult<ResumedReviewSession>>;
  complete(id: string, workflow: LivingThesisReviewWorkflow, expectedVersion: number): Promise<ReviewSessionResult<CompletedReviewSession>>;
  saveDraft(id: string, workflow: LivingThesisReviewWorkflow, expectedVersion: number): Promise<ReviewSessionResult<LivingThesisReviewSession>>;
};
