import {
  buildLivingThesisReviewQueue,
  getLivingThesisChildReferences,
  getLivingThesisReviewSessionChildReferences,
  isValidIsoDate,
  type LivingThesisHistory,
  type LivingThesisReviewQueue,
  type LivingThesisReviewSession
} from '@thesis-investing/core';
import type { ReviewQueueStorageResult } from '../shared/reviewQueueStorage';
import { reviewChildOwnershipErrors, reviewSessionParentErrors } from '../storage/reviewSessionIntegrity';
import type { SqliteStorage } from '../storage/sqlite';
import { readThesisHistory } from './thesisHistoryStorageService';

/** A fresh derived view of saved records. No queue state is persisted. */
export function createReviewQueueStorageService(
  createStorage: () => Promise<SqliteStorage>,
  options: { now?: () => string } = {}
) {
  const now = options.now ?? (() => new Date().toISOString());
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
    async get(today: string): Promise<ReviewQueueStorageResult<LivingThesisReviewQueue>> {
      if (typeof today !== 'string' || !isValidIsoDate(today)) {
        return failure('Today must be a valid local calendar date in YYYY-MM-DD format.');
      }
      try {
        const storage = await getStorage();
        return storage.runInTransaction(() => {
          const repositories = storage.repositories;
          const theses = repositories.livingTheses.list();
          const parents = new Map(theses.map((thesis) => [thesis.id, thesis]));
          const sessions = repositories.reviewSessions.list();
          // Read even excluded theses and detect orphan history, so corruption cannot
          // disappear into an apparently empty queue or a partial successful result.
          const relatedRecords = [
            ...sessions, ...repositories.thesisRevisions.list(), ...repositories.thesisDecisions.list()
          ];
          if (relatedRecords.some((record) => !parents.has(record.thesisId))) return invalidQueue();
          if (reviewChildOwnershipErrors([
            ...theses.flatMap(getLivingThesisChildReferences),
            ...sessions.flatMap(getLivingThesisReviewSessionChildReferences)
          ]).length) return invalidQueue();
          const activeByThesis = new Map<string, LivingThesisReviewSession>();
          for (const session of sessions) {
            if (session.workflow.status !== 'in_progress') continue;
            const parent = parents.get(session.thesisId)!;
            if (activeByThesis.has(session.thesisId) || reviewSessionParentErrors(session, parent).length) {
              return invalidQueue();
            }
            activeByThesis.set(session.thesisId, session);
          }
          const entries: { history: LivingThesisHistory; activeSession?: LivingThesisReviewSession }[] = [];
          for (const thesis of theses) {
            const history = readThesisHistory(storage, thesis.id);
            if (!history.ok) return invalidQueue();
            const activeSession = activeByThesis.get(thesis.id);
            entries.push({ history: history.value, ...(activeSession ? { activeSession } : {}) });
          }
          return buildLivingThesisReviewQueue({ entries, referenceTime: now(), today });
        });
      } catch {
        return failure('The review queue could not be loaded. Try again.');
      }
    }
  };
}

function invalidQueue(): ReviewQueueStorageResult<LivingThesisReviewQueue> {
  return failure('Saved review records could not be verified. Try loading the review queue again.');
}

function failure(message: string): { ok: false; errors: readonly string[] } {
  return { ok: false, errors: [message] };
}
