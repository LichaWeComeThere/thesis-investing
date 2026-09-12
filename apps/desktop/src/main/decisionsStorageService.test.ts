import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  completeLivingThesisReviewWorkflowStep,
  LIVING_THESIS_REVIEW_WORKFLOW_STEPS,
  updateLivingThesisReviewReason,
  updateLivingThesisReviewScoreDraft,
  type LivingThesis
} from '@thesis-investing/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrations, runMigrations } from '../storage/schema';
import { createSqliteDatabase, createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { createSqliteRepositories } from '../storage/sqliteRepositories';
import { runSqliteTransaction } from '../storage/sqliteTransactions';
import { createDecisionsStorageService } from './decisionsStorageService';
import { createReviewSessionStorageService } from './reviewSessionStorageService';

const createdAt = '2026-09-12T09:00:00.000Z';
const reviewedAt = '2026-09-12T10:00:00.000Z';
const decidedAt = '2026-09-12T11:00:00.000Z';
const laterAt = '2026-09-12T12:00:00.000Z';
const input = { title: 'Revisit retention next quarter', rationale: 'The current renewal report leaves an open question.' };
const storages = new Set<SqliteStorage>();
const folders: string[] = [];
const uuid = (number: number) => `a0000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

afterEach(async () => {
  vi.restoreAllMocks();
  for (const storage of storages) storage.close();
  storages.clear();
  for (const directory of folders.splice(0)) await rm(directory, { recursive: true });
});

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

function thesis(id = 'thesis'): LivingThesis {
  return { id, version: 1, entityName: 'Example Research', title: 'Recurring revenue',
    summary: 'Retention supports the original thesis.', lifecycle: 'active', conviction: 'medium',
    riskLevel: 'medium', createdAt, updatedAt: createdAt, risks: [], catalysts: [] };
}

async function filename() {
  const directory = await mkdtemp(join(tmpdir(), 'thesis-decisions-'));
  folders.push(directory);
  return join(directory, 'research.sqlite');
}

async function open(path: string) {
  const storage = await createSqliteStorage({ filename: path });
  storages.add(storage);
  return storage;
}

function reviews(storage: SqliteStorage, prefix = 'review') {
  let id = 0;
  return createReviewSessionStorageService(async () => storage, {
    now: () => reviewedAt, createId: () => `${prefix}-${++id}`
  });
}

async function completeReview(storage: SqliteStorage, parentId: string, prefix = 'review') {
  const service = reviews(storage, prefix);
  const started = value(await service.start(parentId));
  let workflow = value(updateLivingThesisReviewReason(started.workflow, `Quarterly evidence check for ${parentId}`));
  workflow = value(updateLivingThesisReviewScoreDraft(workflow, { kind: 'score', input: {
    businessQuality: 8, moat: 7, management: 6, balanceSheet: 9, growth: 5, valuation: 4, risk: 0
  } }));
  for (const step of LIVING_THESIS_REVIEW_WORKFLOW_STEPS.slice(0, -1)) {
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, step.id));
  }
  const draft = value(await service.saveDraft(started.id, workflow, started.version));
  return value(await service.complete(draft.id, draft.workflow, draft.version));
}

async function fixture() {
  const path = await filename();
  const storage = await open(path);
  value(storage.repositories.livingTheses.create(thesis()));
  const completed = await completeReview(storage, 'thesis');
  const service = createDecisionsStorageService(async () => storage, { now: () => decidedAt });
  return { path, storage, completed, service };
}

function researchSnapshot(storage: SqliteStorage) {
  return {
    theses: storage.repositories.livingTheses.list(),
    sessions: storage.repositories.reviewSessions.list(),
    revisions: storage.repositories.thesisRevisions.list(),
    scores: storage.repositories.mbsScoreSnapshots.list()
  };
}

describe('Decision Log against file SQLite', () => {
  it('persists notes and review conclusions across restart without rewriting thesis versions, reviews, history, or scores', async () => {
    const { path, storage, completed, service } = await fixture();
    const research = researchSnapshot(storage);
    const note = value(await service.create('thesis', {
      title: `  ${input.title}  `, rationale: `\n${input.rationale}\n`
    }, uuid(1)));
    const conclusion = value(await service.create('thesis', { ...input, reviewSessionId: completed.session.id }, uuid(2)));
    expect(note).toEqual({ id: `decision_${uuid(1)}`, thesisId: 'thesis', schemaVersion: 1,
      kind: 'research_note', ...input, createdAt: decidedAt });
    expect(conclusion).toEqual({ ...note, id: `decision_${uuid(2)}`, kind: 'review_conclusion',
      reviewSessionId: completed.session.id });
    expect(value(await service.list('thesis'))).toEqual([note, conclusion]);
    expect(research.scores).toHaveLength(1);
    expect(researchSnapshot(storage)).toEqual(research);
    await service.close();
    storages.delete(storage);
    const reopened = await open(path);
    expect(reopened.repositories.thesisDecisions.list('thesis')).toEqual([note, conclusion]);
    expect(researchSnapshot(reopened)).toEqual(research);
    const restarted = createDecisionsStorageService(async () => reopened, { now: () => laterAt });
    expect(value(await restarted.create('thesis', input, uuid(1)))).toEqual(note);
  });

  it('offers only completed reviews from the selected thesis and rejects invalid links or dates without writing', async () => {
    const { storage, completed, service } = await fixture();
    value(storage.repositories.livingTheses.create(thesis('other')));
    const other = await completeReview(storage, 'other', 'other-review');
    const reviewService = reviews(storage, 'unfinished');
    const ended = value(await reviewService.start('thesis'));
    const abandoned = value(await reviewService.abandon(ended.id, ended.version));
    const active = value(await reviewService.start('thesis'));
    const research = researchSnapshot(storage);
    expect(value(await service.listCompletedReviews('thesis'))).toEqual([{
      id: completed.session.id, reviewReason: completed.session.workflow.reviewReason, completedAt: reviewedAt
    }]);
    for (const [index, reviewSessionId] of [other.session.id, abandoned.id, active.id, 'missing', ''].entries()) {
      expect((await service.create('thesis', { ...input, reviewSessionId }, uuid(index + 1))).ok).toBe(false);
    }
    const beforeParent = createDecisionsStorageService(async () => storage, { now: () => '2026-09-12T08:00:00.000Z' });
    expect((await beforeParent.create('thesis', input, uuid(6))).ok).toBe(false);
    const beforeReview = createDecisionsStorageService(async () => storage, { now: () => createdAt });
    expect((await beforeReview.create('thesis', { ...input, reviewSessionId: completed.session.id }, uuid(7))).ok).toBe(false);
    expect((await service.create('missing', input, uuid(8))).ok).toBe(false);
    expect((await service.list('missing')).ok).toBe(false);
    expect((await service.listCompletedReviews('missing')).ok).toBe(false);
    expect(storage.repositories.thesisDecisions.list()).toEqual([]);
    expect(researchSnapshot(storage)).toEqual(research);
    // Equality is supported when a decision is recorded at the exact completion time.
    const sameInstant = createDecisionsStorageService(async () => storage, { now: () => reviewedAt });
    expect((await sameInstant.create('thesis', { ...input, reviewSessionId: completed.session.id }, uuid(9))).ok).toBe(true);
  });

  it('returns the original entry and date on exact UUID retries and refuses changed payloads or parents', async () => {
    const { storage, completed } = await fixture();
    value(storage.repositories.livingTheses.create(thesis('other')));
    const now = vi.fn(() => decidedAt);
    const service = createDecisionsStorageService(async () => storage, { now });
    const saved = value(await service.create('thesis', input, uuid(1).toUpperCase()));
    now.mockReturnValue(laterAt);
    expect(value(await service.create('thesis', input, uuid(1)))).toEqual(saved);
    expect(value(await service.create('thesis', { ...input, title: ` ${input.title} ` }, uuid(1)))).toEqual(saved);
    for (const changed of [{ ...input, title: 'Changed decision' }, { ...input, rationale: 'Changed reason' },
      { ...input, reviewSessionId: completed.session.id }]) {
      expect((await service.create('thesis', changed, uuid(1))).ok).toBe(false);
    }
    expect((await service.create('other', input, uuid(1))).ok).toBe(false);
    expect(now).toHaveBeenCalledOnce();
    expect(storage.repositories.thesisDecisions.list()).toEqual([saved]);
  });

  it('serializes duplicate UUID requests across two connections, preserving exactly one entry', async () => {
    const { path, storage, service } = await fixture();
    const second = await open(path);
    const other = createDecisionsStorageService(async () => second, { now: () => laterAt });
    const results = await Promise.all([
      service.create('thesis', input, uuid(1)), other.create('thesis', input, uuid(1))
    ]);
    expect(value(results[0])).toEqual(value(results[1]));
    expect(storage.repositories.thesisDecisions.list()).toEqual([value(results[0])]);
    expect(second.repositories.thesisDecisions.list()).toEqual([value(results[0])]);
    const competing = await Promise.all([
      service.create('thesis', { ...input, title: 'First choice' }, uuid(2)),
      other.create('thesis', { ...input, title: 'Different choice' }, uuid(2))
    ]);
    expect(competing.filter((result) => result.ok)).toHaveLength(1);
    expect(competing.filter((result) => !result.ok)).toHaveLength(1);
    expect(storage.repositories.thesisDecisions.list()).toHaveLength(2);
  });

  it('sorts newest first with stable ID ties, scopes lists, and permits documentary notes on archived theses', async () => {
    const { storage, service } = await fixture();
    const archived = { ...thesis('archived'), lifecycle: 'archived' as const, archivedAt: reviewedAt, updatedAt: reviewedAt };
    value(storage.repositories.livingTheses.create(archived));
    const early = value(await service.create('thesis', input, uuid(3)));
    const later = createDecisionsStorageService(async () => storage, { now: () => laterAt });
    const tiedSecond = value(await later.create('thesis', { ...input, title: 'Second ID' }, uuid(2)));
    const tiedFirst = value(await later.create('thesis', { ...input, title: 'First ID' }, uuid(1)));
    const archiveNote = value(await later.create(archived.id, input, uuid(4)));
    expect(value(await service.list('thesis'))).toEqual([tiedFirst, tiedSecond, early]);
    expect(value(await service.list('archived'))).toEqual([archiveNote]);
    expect(value(await service.listCompletedReviews('archived'))).toEqual([]);
    expect(storage.repositories.thesisDecisions.list()).toEqual([tiedFirst, tiedSecond, archiveNote, early]);
    expect(storage.repositories.livingTheses.getById(archived.id)).toEqual(archived);
  });

  it.each(['return failure', 'throw'] as const)('rolls back an actual SQL insert when the repository subsequently reports %s, then retries the same UUID', async (mode) => {
    const { storage, service } = await fixture();
    const before = researchSnapshot(storage);
    const original = storage.repositories.thesisDecisions.create.bind(storage.repositories.thesisDecisions);
    const injected = vi.spyOn(storage.repositories.thesisDecisions, 'create').mockImplementation((decision) => {
      expect(original(decision).ok).toBe(true);
      expect(storage.repositories.thesisDecisions.getById(decision.id)).toBeDefined();
      if (mode === 'throw') throw new Error('/private/user/research.sqlite: injected failure');
      return { ok: false, errors: ['Injected decision save failure'] };
    });
    const failed = await service.create('thesis', input, uuid(1));
    expect(failed.ok).toBe(false);
    expect(JSON.stringify(failed)).not.toContain('/private/user');
    expect(injected).toHaveBeenCalledOnce();
    expect(storage.repositories.thesisDecisions.list()).toEqual([]);
    expect(researchSnapshot(storage)).toEqual(before);
    injected.mockRestore();
    const retried = value(await service.create('thesis', input, uuid(1)));
    expect(storage.repositories.thesisDecisions.list()).toEqual([retried]);
    expect(researchSnapshot(storage)).toEqual(before);
  });

  it('protects saved decisions and parent/review relationships through direct SQL as well as repositories', async () => {
    const { path, storage, completed, service } = await fixture();
    const saved = value(await service.create('thesis', { ...input, reviewSessionId: completed.session.id }, uuid(1)));
    value(storage.repositories.livingTheses.create(thesis('other')));
    const active = value(await reviews(storage, 'draft').start('other'));
    expect(storage.repositories.thesisDecisions.create(saved).ok).toBe(false);
    const database = await createSqliteDatabase({ filename: path });
    try {
      expect(() => database.prepare('UPDATE living_thesis_decisions SET title = ? WHERE id = ?')
        .run('Rewrite history', saved.id)).toThrow('Saved decisions are immutable');
      expect(() => database.prepare('DELETE FROM living_thesis_decisions WHERE id = ?')
        .run(saved.id)).toThrow('Saved decisions are immutable');
      const insert = database.prepare(`INSERT INTO living_thesis_decisions
        (id, thesis_id, schema_version, kind, title, rationale, review_session_id, created_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?)`);
      expect(() => insert.run('foreign-review', 'other', 'review_conclusion', input.title, input.rationale,
        completed.session.id, decidedAt)).toThrow('Decision requires a completed review from the same thesis');
      expect(() => insert.run('unfinished-review', 'other', 'review_conclusion', input.title, input.rationale,
        active.id, decidedAt)).toThrow('Decision requires a completed review from the same thesis');
      expect(() => insert.run('early-review', 'thesis', 'review_conclusion', input.title, input.rationale,
        completed.session.id, createdAt)).toThrow('Decision requires a completed review from the same thesis');
      expect(() => insert.run('early-parent', 'thesis', 'research_note', input.title, input.rationale,
        null, '2026-09-12T08:00:00.000Z')).toThrow('Decision requires its thesis and a valid date');
    } finally { database.close(); }
    expect(storage.repositories.thesisDecisions.list()).toEqual([saved]);
  });

  it('upgrades a genuine schema 6 database without changing completed history, scores, or unfinished and abandoned drafts', async () => {
    const path = await filename();
    const database = await createSqliteDatabase({ filename: path });
    database.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL)');
    for (const migration of migrations.filter(({ version }) => version <= 6)) {
      database.exec(migration.sql);
      database.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(migration.version, migration.name);
    }
    const legacy: SqliteStorage = { repositories: createSqliteRepositories(database), close: () => database.close(),
      runInTransaction: (operation) => runSqliteTransaction(database, operation) };
    storages.add(legacy);
    value(legacy.repositories.livingTheses.create(thesis()));
    const completed = await completeReview(legacy, 'thesis');
    const reviewService = reviews(legacy, 'legacy-draft');
    const ended = value(await reviewService.start('thesis'));
    value(await reviewService.abandon(ended.id, ended.version));
    const active = value(await reviewService.start('thesis'));
    value(await reviewService.saveDraft(active.id, { ...active.workflow, notes: 'Unfinished notes to preserve' }, active.version));
    const before = researchSnapshot(legacy);
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'living_thesis_decisions'").get())
      .toBeUndefined();
    legacy.close();
    storages.delete(legacy);
    const upgraded = await open(path);
    expect(researchSnapshot(upgraded)).toEqual(before);
    expect(upgraded.repositories.thesisDecisions.list()).toEqual([]);
    const check = await createSqliteDatabase({ filename: path });
    try {
      runMigrations(check);
      expect(check.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version))
        .toEqual([1, 2, 3, 4, 5, 6, 7]);
    } finally { check.close(); }
    const service = createDecisionsStorageService(async () => upgraded, { now: () => decidedAt });
    const decision = value(await service.create('thesis', { ...input, reviewSessionId: completed.session.id }, uuid(1)));
    expect(upgraded.repositories.thesisDecisions.list()).toEqual([decision]);
    expect(researchSnapshot(upgraded)).toEqual(before);
  });

  it('rejects malformed requests and retries storage initialization after an unavailable database', async () => {
    const { storage } = await fixture();
    const connect = vi.fn(async () => storage);
    const service = createDecisionsStorageService(connect, { now: () => decidedAt });
    for (const requestId of ['', 'request-id', uuid(1).replace('-4000-', '-1000-')]) {
      expect((await service.create('thesis', input, requestId)).ok).toBe(false);
    }
    for (const body of [null, [], { ...input, createdAt }, { ...input, kind: 'research_note' }]) {
      expect((await service.create('thesis', body, uuid(1))).ok).toBe(false);
    }
    expect((await service.list(' ')).ok).toBe(false);
    expect((await service.listCompletedReviews('')).ok).toBe(false);
    expect(connect).not.toHaveBeenCalled();
    connect.mockRejectedValueOnce(new Error('/private/database unavailable'));
    const failed = await service.create('thesis', input, uuid(1));
    expect(failed.ok).toBe(false);
    expect(JSON.stringify(failed)).not.toContain('/private');
    const saved = value(await service.create('thesis', input, uuid(1)));
    expect(connect).toHaveBeenCalledTimes(2);
    expect(storage.repositories.thesisDecisions.list()).toEqual([saved]);
  });
});
