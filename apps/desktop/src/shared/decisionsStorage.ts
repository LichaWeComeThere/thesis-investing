import type { LivingThesisDecision } from '@thesis-investing/core';

export const decisionsStorageChannels = {
  list: 'decisions:list',
  listCompletedReviews: 'decisions:list-completed-reviews',
  create: 'decisions:create'
} as const;

export type DecisionWriteInput = {
  title: string;
  rationale: string;
  reviewSessionId?: string;
};

export type CompletedDecisionReview = {
  id: string;
  reviewReason: string;
  completedAt: string;
};

export type DecisionStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: readonly string[] };

export type DecisionsStorageApi = {
  list(thesisId: string): Promise<DecisionStorageResult<LivingThesisDecision[]>>;
  listCompletedReviews(thesisId: string): Promise<DecisionStorageResult<CompletedDecisionReview[]>>;
  create(thesisId: string, input: DecisionWriteInput, requestId: string): Promise<DecisionStorageResult<LivingThesisDecision>>;
};
