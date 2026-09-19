import {
  buildLivingThesisHistory,
  type LivingThesisHistory,
  type LivingThesisReviewSession,
  type LivingThesisRevision,
  type MbsScoreSnapshot
} from '@thesis-investing/core';
import { completedReviewIntegrityErrors } from '../storage/completedReviewIntegrity';
import { decisionIntegrityErrors } from '../storage/decisionIntegrity';
import type { RepositoryResult } from '../storage/repositories';
import type { SqliteStorage } from '../storage/sqlite';

const isId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const invalidHistory = () => failure('Saved history could not be verified. Try loading it again.');

/** Reads existing records together. Never guesses a formal score link from a ticker or legacy thesisId. */
export function createThesisHistoryStorageService(createStorage: () => Promise<SqliteStorage>) {
  let storagePromise: Promise<SqliteStorage> | undefined;
  function getStorage() {
    storagePromise ??= createStorage().catch((error: unknown) => { storagePromise = undefined; throw error; });
    return storagePromise;
  }

  return {
    async close(): Promise<void> {
      if (!storagePromise) return;
      try { (await storagePromise).close(); } finally { storagePromise = undefined; }
    },
    async get(thesisId: string): Promise<RepositoryResult<LivingThesisHistory>> {
      if (!isId(thesisId)) return failure('Select a saved thesis to see its history.');
      try {
        const storage = await getStorage();
        return storage.runInTransaction(() => {
          const repositories = storage.repositories;
          const thesis = repositories.livingTheses.getById(thesisId);
          if (!thesis) return failure('The saved thesis was not found.');

          const sessions = repositories.reviewSessions.list(thesisId);
          const revisions = repositories.thesisRevisions.list(thesisId);
          const decisions = repositories.thesisDecisions.list(thesisId);
          const revisionsById = new Map(revisions.map((revision) => [revision.id, revision]));
          const completedReviews: Array<{
            session: LivingThesisReviewSession;
            revision: LivingThesisRevision;
            scoreSnapshot?: MbsScoreSnapshot;
          }> = [];
          const seenRevisions = new Set<string>();
          const seenScores = new Set<string>();

          for (const session of sessions) {
            if (session.workflow.status !== 'completed') continue;
            const revision = session.revisionId ? revisionsById.get(session.revisionId) : undefined;
            if (!revision || seenRevisions.has(revision.id)) return invalidHistory();
            const scoreSnapshot = session.scoreSnapshotId
              ? repositories.mbsScoreSnapshots.getById(session.scoreSnapshotId) : undefined;
            if (completedReviewIntegrityErrors(session, revision, thesis, scoreSnapshot).length > 0 ||
                (scoreSnapshot && seenScores.has(scoreSnapshot.id))) return invalidHistory();
            seenRevisions.add(revision.id);
            if (scoreSnapshot) seenScores.add(scoreSnapshot.id);
            completedReviews.push({ session, revision, ...(scoreSnapshot ? { scoreSnapshot } : {}) });
          }
          // An orphan revision is a broken relationship, not a missing timeline event.
          if (seenRevisions.size !== revisions.length) return invalidHistory();
          const completedById = new Map(completedReviews.map(({ session }) => [session.id, session]));
          for (const decision of decisions) {
            const linkedReview = decision.reviewSessionId ? completedById.get(decision.reviewSessionId) : undefined;
            if (decisionIntegrityErrors(decision, thesis, linkedReview).length > 0) return invalidHistory();
          }
          return { ok: true, value: buildLivingThesisHistory({ thesis, completedReviews, decisions }) };
        });
      } catch {
        return failure('History could not be loaded. Try again.');
      }
    }
  };
}

function failure(message: string): RepositoryResult<LivingThesisHistory> {
  return { ok: false, errors: [message] };
}
