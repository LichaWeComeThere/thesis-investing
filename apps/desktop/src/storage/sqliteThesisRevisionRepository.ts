import type { DatabaseSync } from 'node:sqlite';
import { parseLivingThesisRevision, type LivingThesisRevision } from '@thesis-investing/core';
import type {
  LivingThesisRepository, LivingThesisReviewSessionRepository, LivingThesisRevisionRepository,
  MbsScoreSnapshotRepository, RepositoryResult
} from './repositories';
import { completedReviewIntegrityErrors } from './completedReviewIntegrity';
import { runSqliteTransaction } from './sqliteTransactions';

class RevisionError extends Error {}

export function createSqliteThesisRevisionRepository(
  database: DatabaseSync,
  theses: LivingThesisRepository,
  sessions: LivingThesisReviewSessionRepository,
  scores: MbsScoreSnapshotRepository
): LivingThesisRevisionRepository {
  function read(row: Record<string, unknown>): LivingThesisRevision {
    const result = parseLivingThesisRevision({
      id: row.id, thesisId: row.thesis_id, reviewSessionId: row.review_session_id,
      schemaVersion: row.schema_version, createdAt: row.created_at,
      before: JSON.parse(String(row.before_json)), after: JSON.parse(String(row.after_json)),
      scoreSnapshotId: row.score_snapshot_id ?? undefined
    });
    if (!result.ok || result.value.after.version !== row.after_version) throw new RevisionError('Stored thesis history is invalid.');
    return result.value;
  }
  function getById(id: string): LivingThesisRevision | undefined {
    const row = database.prepare('SELECT * FROM living_thesis_revisions WHERE id = ?').get(id);
    return row ? read(row) : undefined;
  }
  function insert(input: LivingThesisRevision, restore: boolean): RepositoryResult<LivingThesisRevision> {
    const parsed = parseLivingThesisRevision(input);
    if (!parsed.ok) return { ok: false, errors: [...parsed.errors] };
    const revision = parsed.value;
    try {
      return { ok: true, value: runSqliteTransaction(database, () => {
        const parent = theses.getById(revision.thesisId);
        const session = sessions.getById(revision.reviewSessionId);
        if (!parent || !session) throw new RevisionError('Thesis history requires its saved thesis and completed review.');
        if (getById(revision.id)) throw new RevisionError('This thesis revision ID already exists.');
        const snapshot = revision.scoreSnapshotId ? scores.getById(revision.scoreSnapshotId) : undefined;
        const errors = completedReviewIntegrityErrors(session, revision, parent, snapshot);
        if (errors.length) throw new RevisionError(errors.join(' '));
        database.prepare(`INSERT INTO living_thesis_revisions
          (id, thesis_id, review_session_id, schema_version, created_at, after_version, before_json, after_json, score_snapshot_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          revision.id, revision.thesisId, revision.reviewSessionId, revision.schemaVersion, revision.createdAt, revision.after.version,
          JSON.stringify(revision.before), JSON.stringify(revision.after), revision.scoreSnapshotId ?? null
        );
        return revision;
      }, restore) };
    } catch (error) {
      return { ok: false, errors: [error instanceof RevisionError ? error.message : 'Could not save thesis history. Try again.'] };
    }
  }
  return {
    getById,
    list(thesisId) {
      const rows = thesisId === undefined
        ? database.prepare('SELECT * FROM living_thesis_revisions ORDER BY created_at DESC, id ASC').all()
        : database.prepare('SELECT * FROM living_thesis_revisions WHERE thesis_id = ? ORDER BY created_at DESC, id ASC').all(thesisId);
      return rows.map(read);
    },
    create: (revision) => insert(revision, false),
    restore: (revision) => insert(revision, true)
  };
}
