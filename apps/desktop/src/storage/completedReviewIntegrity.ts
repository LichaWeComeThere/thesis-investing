import { isDeepStrictEqual } from 'node:util';
import {
  buildLivingThesisReviewAfter, calculateMbsScore, validateMbsScoreSnapshot,
  type LivingThesis, type LivingThesisReviewSession, type LivingThesisRevision,
  type MbsScoreSnapshot
} from '@thesis-investing/core';
import { sameReviewBaseline } from './reviewSessionIntegrity';

/** Shared by completion, history restore, and backup validation after shape parsing. */
export function completedReviewIntegrityErrors(
  session: LivingThesisReviewSession,
  revision: LivingThesisRevision,
  parent: LivingThesis,
  snapshot?: MbsScoreSnapshot
): string[] {
  const errors: string[] = [];
  if (session.workflow.status !== 'completed' || session.revisionId !== revision.id ||
      revision.reviewSessionId !== session.id || revision.thesisId !== session.thesisId ||
      parent.id !== session.thesisId || session.completedAt !== revision.createdAt ||
      session.scoreSnapshotId !== revision.scoreSnapshotId) {
    errors.push('Completed review and revision references must agree.');
  }
  if (!sameReviewBaseline(revision.before, session.workflow.baseline)) {
    errors.push('The revision must retain the completed review baseline.');
  }
  const after = buildLivingThesisReviewAfter(session.workflow, revision.createdAt);
  if (!after.ok || !sameReviewBaseline(after.value, revision.after)) {
    errors.push('The revision result must match the completed review changes.');
  }
  if (revision.after.version > parent.version ||
      (revision.after.version === parent.version && !sameReviewBaseline(revision.after, parent))) {
    errors.push('Revision history must match its saved parent version or an earlier version.');
  }
  const choice = session.workflow.scoreDraft;
  if (choice.kind === 'score') {
    if (!snapshot || snapshot.id !== session.scoreSnapshotId || snapshot.thesisId !== parent.id ||
        snapshot.createdAt !== session.completedAt) {
      errors.push('A scored review requires its linked score snapshot with the same completion time.');
    } else {
      const score = calculateMbsScore(choice.input);
      errors.push(...validateMbsScoreSnapshot(snapshot).errors);
      if (score.rating === 'incomplete' ||
          !isDeepStrictEqual(JSON.parse(JSON.stringify(snapshot.input)), JSON.parse(JSON.stringify(choice.input))) ||
          snapshot.score !== score.score || snapshot.maxScore !== score.maxScore ||
          snapshot.percentage !== score.percentage || snapshot.rating !== score.rating ||
          snapshot.completedCriteria !== score.completedCriteria ||
          snapshot.ticker !== revision.after.ticker || snapshot.companyName !== revision.after.entityName ||
          snapshot.notes !== (choice.input.notes?.trim() || undefined)) {
        errors.push('The linked score snapshot must match the completed review ratings and thesis.');
      }
    }
  } else if (choice.kind !== 'skip' || snapshot || session.scoreSnapshotId || revision.scoreSnapshotId) {
    errors.push('A review without a new score cannot reference a score snapshot.');
  }
  return errors;
}
