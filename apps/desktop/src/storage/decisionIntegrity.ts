import type { LivingThesis, LivingThesisDecision, LivingThesisReviewSession } from '@thesis-investing/core';

/** Relation checks shared by repository writes and backup validation. Shapes are parsed first. */
export function decisionIntegrityErrors(
  decision: LivingThesisDecision,
  parent: LivingThesis,
  review?: LivingThesisReviewSession
): string[] {
  const errors: string[] = [];
  if (decision.thesisId !== parent.id) errors.push('The decision must belong to its saved thesis.');
  if (decision.createdAt < parent.createdAt) errors.push('The decision date cannot precede its thesis.');
  if (decision.reviewSessionId !== undefined) {
    if (!review || review.id !== decision.reviewSessionId || review.thesisId !== decision.thesisId ||
        review.workflow.status !== 'completed' || !review.completedAt) {
      errors.push('Link a completed review from this thesis.');
    } else if (decision.createdAt < review.completedAt) {
      errors.push('The decision date cannot precede its linked review.');
    }
  }
  return errors;
}
