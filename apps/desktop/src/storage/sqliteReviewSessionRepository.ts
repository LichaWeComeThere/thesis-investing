import type { DatabaseSync } from 'node:sqlite';
import { isInSqliteTransaction, runSqliteTransaction } from './sqliteTransactions';
import {
  getLivingThesisChildReferences,
  getLivingThesisReviewSessionChildReferences,
  parseLivingThesisReviewSession,
  type LivingThesisReviewSession
} from '@thesis-investing/core';
import type { LivingThesisRepository, LivingThesisReviewSessionRepository, RepositoryResult } from './repositories';
import {
  readReviewSessionRow, readStoredReviewChildReferences, reviewChildOwnershipErrors,
  reviewSessionParentErrors, sameReviewBaseline
} from './reviewSessionIntegrity';

class ReviewSessionError extends Error {}

export function createSqliteReviewSessionRepository(
  database: DatabaseSync,
  theses: LivingThesisRepository
): LivingThesisReviewSessionRepository {
  function getById(id: string) {
    const row = database.prepare('SELECT * FROM living_thesis_review_sessions WHERE id = ?').get(id);
    return row ? readReviewSessionRow(row) : undefined;
  }
  function getInProgressByThesisId(thesisId: string) {
    const row = database.prepare("SELECT * FROM living_thesis_review_sessions WHERE thesis_id = ? AND status = 'in_progress'").get(thesisId);
    return row ? readReviewSessionRow(row) : undefined;
  }
  function checkRelations(session: LivingThesisReviewSession) {
    const parent = theses.getById(session.thesisId);
    if (!parent) throw new ReviewSessionError('The review parent was not found.');
    const errors = [
      ...reviewSessionParentErrors(session, parent),
      ...reviewChildOwnershipErrors([
        ...theses.list().flatMap(getLivingThesisChildReferences),
        ...readStoredReviewChildReferences(database),
        ...getLivingThesisReviewSessionChildReferences(session)
      ])
    ];
    if (errors.length) throw new ReviewSessionError(errors.join(' '));
    const active = getInProgressByThesisId(session.thesisId);
    if (session.workflow.status === 'in_progress' && active && active.id !== session.id) {
      throw new ReviewSessionError('An in-progress review already exists for this thesis. Resume it or abandon it first.');
    }
    return parent;
  }
  function insert(input: LivingThesisReviewSession, restore: boolean): RepositoryResult<LivingThesisReviewSession> {
    const parsed = parseLivingThesisReviewSession(input);
    if (!parsed.ok) return { ok: false, errors: [...parsed.errors] };
    const session = parsed.value;
    return transaction(database, restore, () => {
      if (getById(session.id)) throw new ReviewSessionError('A review session with this ID already exists.');
      const parent = checkRelations(session);
      if (!restore && (session.version !== 1 || session.workflow.status !== 'in_progress' ||
          !sameReviewBaseline(session.workflow.baseline, parent))) {
        throw new ReviewSessionError('A new review must start at version 1 from the current saved thesis.');
      }
      database.prepare(`INSERT INTO living_thesis_review_sessions
        (id, thesis_id, schema_version, version, status, started_at, updated_at, abandoned_at, completed_at, revision_id, score_snapshot_id, workflow_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(session.id, session.thesisId, session.schemaVersion, session.version, session.workflow.status,
          session.startedAt, session.updatedAt, session.abandonedAt ?? null, session.completedAt ?? null,
          session.revisionId ?? null, session.scoreSnapshotId ?? null, JSON.stringify(session.workflow));
      return session;
    });
  }
  function updateSession(input: LivingThesisReviewSession, expectedVersion: number, completing: boolean): RepositoryResult<LivingThesisReviewSession> {
      if (completing && !isInSqliteTransaction(database)) return { ok: false, errors: ['Completion requires its enclosing transaction.'] };
      if ((input.workflow.status === 'completed') !== completing) return { ok: false, errors: ['Use the completion operation to finish a review.'] };
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
        return { ok: false, errors: ['Expected review version must be a positive safe integer.'] };
      }
      if (input.version !== expectedVersion) {
        return { ok: false, errors: ['Review version conflict. Reload the saved draft before trying again.'] };
      }
      const parsed = parseLivingThesisReviewSession({ ...input, version: expectedVersion + 1 });
      if (!parsed.ok) return { ok: false, errors: [...parsed.errors] };
      const session = parsed.value;
      return transaction(database, false, () => {
        const current = getById(session.id);
        if (!current) throw new ReviewSessionError('The review session was not found.');
        if (current.version !== expectedVersion) throw new ReviewSessionError('Review version conflict. Reload the saved draft before trying again.');
        if (current.workflow.status !== 'in_progress') throw new ReviewSessionError('An ended review cannot be edited.');
        if (session.thesisId !== current.thesisId || session.startedAt !== current.startedAt ||
            (session.schemaVersion !== current.schemaVersion && !(completing && current.schemaVersion === 1 && session.schemaVersion === 2)) || !sameReviewBaseline(session.workflow.baseline, current.workflow.baseline)) {
          throw new ReviewSessionError('Review identity, start time, schema, and baseline cannot be changed.');
        }
        if (session.updatedAt < current.updatedAt) throw new ReviewSessionError('Review update time cannot move backwards.');
        checkRelations(session);
        // Retain the exact original snapshot even if an equivalent reordered copy was supplied.
        const saved = { ...session, workflow: { ...session.workflow, baseline: current.workflow.baseline } };
        const result = database.prepare(`UPDATE living_thesis_review_sessions SET
          version = ?, schema_version = ?, status = ?, updated_at = ?, abandoned_at = ?, completed_at = ?, revision_id = ?, score_snapshot_id = ?, workflow_json = ?
          WHERE id = ? AND version = ?`)
          .run(saved.version, saved.schemaVersion, saved.workflow.status, saved.updatedAt, saved.abandonedAt ?? null,
            saved.completedAt ?? null, saved.revisionId ?? null, saved.scoreSnapshotId ?? null,
            JSON.stringify(saved.workflow), saved.id, expectedVersion);
        if (Number(result.changes) !== 1) throw new ReviewSessionError('Review version conflict.');
        return saved;
      });
    }
  return {
    create: (session) => insert(session, false),
    restore: (session) => insert(session, true),
    getById,
    getInProgressByThesisId,
    list(thesisId) {
      const rows = thesisId === undefined
        ? database.prepare('SELECT * FROM living_thesis_review_sessions ORDER BY updated_at DESC, id ASC').all()
        : database.prepare('SELECT * FROM living_thesis_review_sessions WHERE thesis_id = ? ORDER BY updated_at DESC, id ASC').all(thesisId);
      return rows.map(readReviewSessionRow);
    },
    update: (session, version) => updateSession(session, version, false),
    complete: (session, version) => updateSession(session, version, true)
  };
}

function transaction<T>(database: DatabaseSync, restore: boolean, operation: () => T): RepositoryResult<T> {
  try {
    return { ok: true, value: runSqliteTransaction(database, operation, restore) };
  } catch (error) {
    return { ok: false, errors: [error instanceof ReviewSessionError ? error.message : 'Could not save the review session. Try again.'] };
  }
}
