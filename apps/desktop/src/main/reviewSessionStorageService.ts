import { randomUUID } from 'node:crypto';
import {
  abandonLivingThesisReviewWorkflow,
  parseLivingThesisReviewSession,
  startLivingThesisReviewWorkflow,
  type LivingThesisReviewSession
} from '@thesis-investing/core';
import type { RepositoryResult } from '../storage/repositories';
import type { SqliteStorage } from '../storage/sqlite';

import type { ResumedReviewSession } from '../shared/reviewSessionsStorage';
export type { ResumedReviewSession } from '../shared/reviewSessionsStorage';

/** Draft operations never modify the saved thesis or complete the review. */
export function createReviewSessionStorageService(
  createStorage: () => Promise<SqliteStorage>,
  options: { createId?: () => string; now?: () => string } = {}
) {
  const createId = options.createId ?? randomUUID;
  const now = options.now ?? (() => new Date().toISOString());
  let storagePromise: Promise<SqliteStorage> | undefined;
  function getStorage() {
    storagePromise ??= createStorage().catch((error: unknown) => { storagePromise = undefined; throw error; });
    return storagePromise;
  }
  async function run<T>(operation: (storage: SqliteStorage) => RepositoryResult<T>): Promise<RepositoryResult<T>> {
    try { return operation(await getStorage()); }
    catch { return failure('Review storage is unavailable. Try again.'); }
  }
  return {
    getActive(thesisId: string): Promise<RepositoryResult<ResumedReviewSession | null>> {
      return run((storage) => storage.runInTransaction(() => {
        const currentThesis = storage.repositories.livingTheses.getById(thesisId);
        if (!currentThesis) return failure('The Living Thesis was not found.');
        const session = storage.repositories.reviewSessions.getInProgressByThesisId(thesisId);
        return { ok: true, value: session ? {
          session, currentThesis,
          baselineStatus: currentThesis.lifecycle === 'archived' ? 'archived'
            : currentThesis.version === session.workflow.baseline.version ? 'current' : 'changed'
        } : null };
      }));
    },
    async close() {
      if (!storagePromise) return;
      try { (await storagePromise).close(); } finally { storagePromise = undefined; }
    },
    start(thesisId: string): Promise<RepositoryResult<LivingThesisReviewSession>> {
      return run((storage) => {
        const thesis = storage.repositories.livingTheses.getById(thesisId);
        if (!thesis) return failure('The Living Thesis was not found.');
        const workflow = startLivingThesisReviewWorkflow(thesis);
        if (!workflow.ok) return { ok: false, errors: [...workflow.errors] };
        const timestamp = now();
        return storage.repositories.reviewSessions.create({
          id: createId(), thesisId, schemaVersion: 1, version: 1,
          startedAt: timestamp, updatedAt: timestamp, workflow: workflow.value
        });
      });
    },
    saveDraft(id: string, workflow: unknown, expectedVersion: number): Promise<RepositoryResult<LivingThesisReviewSession>> {
      return run((storage) => {
        const current = storage.repositories.reviewSessions.getById(id);
        if (!current) return failure('The review session was not found.');
        const parsed = parseLivingThesisReviewSession({ ...current, workflow, updatedAt: now() });
        if (!parsed.ok) return { ok: false, errors: [...parsed.errors] };
        if (parsed.value.workflow.status !== 'in_progress') return failure('Only an in-progress review can be saved as a draft.');
        return storage.repositories.reviewSessions.update(parsed.value, expectedVersion);
      });
    },
    resume(id: string): Promise<RepositoryResult<ResumedReviewSession>> {
      return run((storage) => storage.runInTransaction(() => {
        const session = storage.repositories.reviewSessions.getById(id);
        if (!session) return failure('The review session was not found.');
        if (session.workflow.status !== 'in_progress') return failure('An abandoned review cannot be resumed.');
        const currentThesis = storage.repositories.livingTheses.getById(session.thesisId);
        if (!currentThesis) return failure('The Living Thesis was not found.');
        return { ok: true, value: {
          session, currentThesis,
          baselineStatus: currentThesis.lifecycle === 'archived' ? 'archived'
            : currentThesis.version === session.workflow.baseline.version ? 'current' : 'changed'
        } };
      }));
    },
    abandon(id: string, expectedVersion: number): Promise<RepositoryResult<LivingThesisReviewSession>> {
      return run((storage) => {
        const current = storage.repositories.reviewSessions.getById(id);
        if (!current) return failure('The review session was not found.');
        const workflow = abandonLivingThesisReviewWorkflow(current.workflow);
        if (!workflow.ok) return { ok: false, errors: [...workflow.errors] };
        const timestamp = now();
        return storage.repositories.reviewSessions.update({
          ...current, workflow: workflow.value, updatedAt: timestamp, abandonedAt: timestamp
        }, expectedVersion);
      });
    }
  };
}

function failure(errors: string): { ok: false; errors: string[] } {
  return { ok: false, errors: [errors] };
}
