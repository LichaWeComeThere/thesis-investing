import { parseLivingThesisDecision, type LivingThesisDecision } from '@thesis-investing/core';
import type { RepositoryResult } from '../storage/repositories';
import type { SqliteStorage } from '../storage/sqlite';

export type CompletedDecisionReviewOption = { id: string; reviewReason: string; completedAt: string };
const isId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const requestPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class DecisionWriteError extends Error {}

/** Decisions document reasoning. They never change the thesis or completed review. */
export function createDecisionsStorageService(
  createStorage: () => Promise<SqliteStorage>,
  options: { now?: () => string } = {}
) {
  const now = options.now ?? (() => new Date().toISOString());
  let storagePromise: Promise<SqliteStorage> | undefined;
  function getStorage() {
    storagePromise ??= createStorage().catch((error: unknown) => { storagePromise = undefined; throw error; });
    return storagePromise;
  }
  async function run<T>(operation: (storage: SqliteStorage) => RepositoryResult<T>): Promise<RepositoryResult<T>> {
    try { return operation(await getStorage()); }
    catch (error) { return failure(error instanceof DecisionWriteError ? error.message : 'Decision storage is unavailable. Your text is still here. Try again.'); }
  }
  return {
    async close() {
      if (!storagePromise) return;
      try { (await storagePromise).close(); } finally { storagePromise = undefined; }
    },
    list(thesisId: string): Promise<RepositoryResult<LivingThesisDecision[]>> {
      if (!isId(thesisId)) return Promise.resolve(failure('Select a saved thesis.'));
      return run((storage) => storage.repositories.livingTheses.getById(thesisId)
        ? { ok: true, value: storage.repositories.thesisDecisions.list(thesisId) }
        : failure('The saved thesis was not found.'));
    },
    listCompletedReviews(thesisId: string): Promise<RepositoryResult<CompletedDecisionReviewOption[]>> {
      if (!isId(thesisId)) return Promise.resolve(failure('Select a saved thesis.'));
      return run((storage) => {
        if (!storage.repositories.livingTheses.getById(thesisId)) return failure('The saved thesis was not found.');
        return { ok: true, value: storage.repositories.reviewSessions.list(thesisId)
          .filter((review) => review.workflow.status === 'completed' && review.completedAt)
          .map((review) => ({ id: review.id, reviewReason: review.workflow.reviewReason, completedAt: review.completedAt! })) };
      });
    },
    create(thesisId: string, input: unknown, requestId: string): Promise<RepositoryResult<LivingThesisDecision>> {
      if (!isId(thesisId) || typeof requestId !== 'string' || !requestPattern.test(requestId) ||
          !isRecord(input) || Object.keys(input).some((key) => !['title', 'rationale', 'reviewSessionId'].includes(key))) {
        return Promise.resolve(failure('The decision request is invalid. Reopen the form and try again.'));
      }
      return run((storage) => storage.runInTransaction(() => {
        // The UI keeps this UUID for an exact retry, including a lost IPC response.
        const id = `decision_${requestId.toLowerCase()}`;
        const existing = storage.repositories.thesisDecisions.getById(id);
        const parsed = parseLivingThesisDecision({
          id, thesisId, schemaVersion: 1, kind: input.reviewSessionId === undefined ? 'research_note' : 'review_conclusion',
          title: input.title, rationale: input.rationale, reviewSessionId: input.reviewSessionId,
          createdAt: existing?.createdAt ?? now()
        });
        if (!parsed.ok) return { ok: false, errors: [...parsed.errors] };
        const decision = parsed.value;
        if (existing) {
          return existing.thesisId === decision.thesisId && existing.title === decision.title &&
            existing.rationale === decision.rationale && existing.reviewSessionId === decision.reviewSessionId
            ? { ok: true, value: existing }
            : failure('This save request already recorded a different decision. Open a new decision to add another entry.');
        }
        const saved = storage.repositories.thesisDecisions.create(decision);
        if (!saved.ok) throw new DecisionWriteError(saved.errors.join(' '));
        return saved;
      }));
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function failure<T>(message: string): RepositoryResult<T> { return { ok: false, errors: [message] }; }
