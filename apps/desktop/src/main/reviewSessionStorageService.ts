import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  abandonLivingThesisReviewWorkflow,
  buildLivingThesisReviewAfter,
  calculateMbsScore,
  completeLivingThesisReviewWorkflow,
  LIVING_THESIS_REVIEW_SESSION_SCHEMA_VERSION,
  parseLivingThesisReviewSession,
  startLivingThesisReviewWorkflow,
  type LivingThesisReviewSession,
  type LivingThesisRevision,
  type MbsScoreSnapshot
} from '@thesis-investing/core';
import type { RepositoryResult } from '../storage/repositories';
import type { SqliteStorage } from '../storage/sqlite';

import type { CompletedReviewSession, ResumedReviewSession } from '../shared/reviewSessionsStorage';
import { sameReviewBaseline } from '../storage/reviewSessionIntegrity';
export type { ResumedReviewSession } from '../shared/reviewSessionsStorage';

class CompletionError extends Error {}

/** Draft saves stay separate from the all-or-nothing completion transaction. */
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
          id: createId(), thesisId, schemaVersion: LIVING_THESIS_REVIEW_SESSION_SCHEMA_VERSION, version: 1,
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
    async complete(id: string, workflow: unknown, expectedVersion: number): Promise<RepositoryResult<CompletedReviewSession>> {
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return failure('Expected review version must be a positive safe integer.');
      try {
        const storage = await getStorage();
        return storage.runInTransaction(() => {
          const current = storage.repositories.reviewSessions.getById(id);
          if (!current) throw new CompletionError('The review session was not found.');
          if (current.workflow.status === 'abandoned') throw new CompletionError('This review has ended and cannot be completed.');
          // Parse the submitted draft with owned metadata. Terminal fields never come from IPC.
          const candidate = requireValue(parseLivingThesisReviewSession({
            ...current, workflow, abandonedAt: undefined, completedAt: undefined,
            revisionId: undefined, scoreSnapshotId: undefined
          }));
          if (candidate.workflow.status !== 'in_progress') throw new CompletionError('Only an unfinished review can be completed.');
          if (!sameReviewBaseline(candidate.workflow.baseline, current.workflow.baseline)) {
            throw new CompletionError('The original review baseline cannot be replaced. Reopen the saved draft.');
          }
          const submitted = { ...candidate.workflow, baseline: current.workflow.baseline };
          const parent = storage.repositories.livingTheses.getById(current.thesisId);
          if (!parent) throw new CompletionError('The saved thesis was not found.');

          if (current.workflow.status === 'completed') {
            // A lost response can be retried without creating a second revision or score.
            const retried = requireValue(completeLivingThesisReviewWorkflow(submitted, current.workflow.baseline));
            if (expectedVersion + 1 !== current.version ||
                !sameJson(retried, current.workflow)) {
              throw new CompletionError('This review is already complete. Its saved result cannot be changed.');
            }
            const revision = current.revisionId ? storage.repositories.thesisRevisions.getById(current.revisionId) : undefined;
            const scoreSnapshot = current.scoreSnapshotId ? storage.repositories.mbsScoreSnapshots.getById(current.scoreSnapshotId) : undefined;
            if (!revision || (current.scoreSnapshotId && !scoreSnapshot)) throw new CompletionError('The completed review history could not be loaded.');
            return { ok: true as const, value: { session: current, thesis: parent, revision, ...(scoreSnapshot ? { scoreSnapshot } : {}) } };
          }
          if (current.version !== expectedVersion) {
            throw new CompletionError('Review version conflict. Open the saved draft before completing. Your edits are still here.');
          }
          const completedWorkflow = requireValue(completeLivingThesisReviewWorkflow(submitted, parent));
          const timestamp = now();
          if (timestamp < current.updatedAt) throw new CompletionError('Completion time cannot precede the last draft save. Try again.');
          const after = requireValue(buildLivingThesisReviewAfter(completedWorkflow, timestamp));
          const revisionId = createId();
          let scoreSnapshot: MbsScoreSnapshot | undefined;
          if (completedWorkflow.scoreDraft.kind === 'score') {
            const input = completedWorkflow.scoreDraft.input;
            const score = calculateMbsScore(input);
            if (score.rating === 'incomplete') throw new CompletionError('Finish every business rating before completing the review.');
            scoreSnapshot = requireValue(storage.repositories.mbsScoreSnapshots.create({
              id: createId(), thesisId: after.id, ticker: after.ticker, companyName: after.entityName,
              score: score.score, maxScore: score.maxScore, percentage: score.percentage,
              rating: score.rating, completedCriteria: score.completedCriteria,
              input: { ...input }, notes: input.notes?.trim() || undefined, createdAt: timestamp
            }));
          }
          const thesis = requireValue(storage.repositories.livingTheses.update(
            { ...after, version: parent.version }, parent.version
          ));
          const session = requireValue(storage.repositories.reviewSessions.complete({
            ...current, schemaVersion: LIVING_THESIS_REVIEW_SESSION_SCHEMA_VERSION,
            workflow: completedWorkflow, completedAt: timestamp, updatedAt: timestamp,
            revisionId, ...(scoreSnapshot ? { scoreSnapshotId: scoreSnapshot.id } : {})
          }, expectedVersion));
          const revision: LivingThesisRevision = requireValue(storage.repositories.thesisRevisions.create({
            id: revisionId, thesisId: thesis.id, reviewSessionId: session.id, schemaVersion: 1,
            createdAt: timestamp, before: current.workflow.baseline, after: thesis,
            ...(scoreSnapshot ? { scoreSnapshotId: scoreSnapshot.id } : {})
          }));
          return { ok: true as const, value: { session, thesis, revision, ...(scoreSnapshot ? { scoreSnapshot } : {}) } };
        });
      } catch (error) {
        return failure(error instanceof CompletionError ? error.message : 'The review could not be completed. Your saved draft is intact. Try again.');
      }
    },
    resume(id: string): Promise<RepositoryResult<ResumedReviewSession>> {
      return run((storage) => storage.runInTransaction(() => {
        const session = storage.repositories.reviewSessions.getById(id);
        if (!session) return failure('The review session was not found.');
        if (session.workflow.status !== 'in_progress') return failure('This review has ended and cannot be resumed.');
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

function requireValue<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new CompletionError(result.errors.join(' '));
  return result.value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(JSON.parse(JSON.stringify(left)), JSON.parse(JSON.stringify(right)));
}
