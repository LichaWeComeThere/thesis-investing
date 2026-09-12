import type { DatabaseSync } from 'node:sqlite';
import { parseLivingThesisDecision, type LivingThesisDecision } from '@thesis-investing/core';
import type {
  LivingThesisDecisionRepository, LivingThesisRepository,
  LivingThesisReviewSessionRepository, RepositoryResult
} from './repositories';
import { decisionIntegrityErrors } from './decisionIntegrity';
import { runSqliteTransaction } from './sqliteTransactions';

class DecisionError extends Error {}

export function createSqliteThesisDecisionRepository(
  database: DatabaseSync,
  theses: LivingThesisRepository,
  sessions: LivingThesisReviewSessionRepository
): LivingThesisDecisionRepository {
  function read(row: Record<string, unknown>): LivingThesisDecision {
    const parsed = parseLivingThesisDecision({
      id: row.id, thesisId: row.thesis_id, schemaVersion: row.schema_version,
      kind: row.kind, title: row.title, rationale: row.rationale,
      reviewSessionId: row.review_session_id ?? undefined, createdAt: row.created_at
    });
    if (!parsed.ok) throw new DecisionError('The saved decision could not be read.');
    return parsed.value;
  }
  function getById(id: string): LivingThesisDecision | undefined {
    const row = database.prepare('SELECT * FROM living_thesis_decisions WHERE id = ?').get(id);
    return row ? read(row) : undefined;
  }
  function insert(input: LivingThesisDecision, restore: boolean): RepositoryResult<LivingThesisDecision> {
    const parsed = parseLivingThesisDecision(input);
    if (!parsed.ok) return { ok: false, errors: [...parsed.errors] };
    const decision = parsed.value;
    try {
      return { ok: true, value: runSqliteTransaction(database, () => {
        const parent = theses.getById(decision.thesisId);
        if (!parent) throw new DecisionError('Select a saved thesis for this decision.');
        if (getById(decision.id)) throw new DecisionError('This decision ID already exists.');
        const review = decision.reviewSessionId ? sessions.getById(decision.reviewSessionId) : undefined;
        const errors = decisionIntegrityErrors(decision, parent, review);
        if (errors.length) throw new DecisionError(errors.join(' '));
        database.prepare(`INSERT INTO living_thesis_decisions
          (id, thesis_id, schema_version, kind, title, rationale, review_session_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
          decision.id, decision.thesisId, decision.schemaVersion, decision.kind,
          decision.title, decision.rationale, decision.reviewSessionId ?? null, decision.createdAt
        );
        return decision;
      }, restore) };
    } catch (error) {
      return { ok: false, errors: [error instanceof DecisionError ? error.message : 'Could not save the decision. Try again.'] };
    }
  }
  return {
    getById,
    list(thesisId) {
      const rows = thesisId === undefined
        ? database.prepare('SELECT * FROM living_thesis_decisions ORDER BY created_at DESC, id ASC').all()
        : database.prepare('SELECT * FROM living_thesis_decisions WHERE thesis_id = ? ORDER BY created_at DESC, id ASC').all(thesisId);
      return rows.map(read);
    },
    create: (decision) => insert(decision, false),
    restore: (decision) => insert(decision, true)
  };
}
