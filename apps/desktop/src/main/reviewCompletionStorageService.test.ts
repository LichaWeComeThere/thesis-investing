import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  calculateMbsScore,
  completeLivingThesisReviewWorkflowStep,
  LIVING_THESIS_REVIEW_WORKFLOW_STEPS,
  startLivingThesisReviewWorkflow,
  updateLivingThesisReviewReason,
  updateLivingThesisReviewScoreDraft,
  type LivingThesis,
  type LivingThesisReviewScoreDraft,
  type LivingThesisReviewSession,
  type LivingThesisReviewWorkflow,
  type ManualBusinessScoreInput
} from '@thesis-investing/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrations, runMigrations } from '../storage/schema';
import { createSqliteDatabase, createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { createReviewSessionStorageService } from './reviewSessionStorageService';

const createdAt = '2026-09-11T10:00:00.000Z';
const startedAt = '2026-09-11T11:00:00.000Z';
const savedAt = '2026-09-11T11:01:00.000Z';
const completedAt = '2026-09-11T12:34:56.789Z';
const afterCompletion = '2026-09-11T13:00:00.000Z';
const scoreInput: ManualBusinessScoreInput = {
  businessQuality: 8, moat: 7, management: 6, balanceSheet: 9,
  growth: 5, valuation: 4, risk: 0, notes: '  Retention improved; valuation is still demanding.  '
};
const storages = new Set<SqliteStorage>();
const folders: string[] = [];

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
  return {
    id, version: 1, ticker: 'EXM', entityName: 'Example Research', title: 'Recurring revenue',
    summary: 'Retention supports the original thesis.', lifecycle: 'active', conviction: 'medium',
    riskLevel: 'medium', createdAt, updatedAt: createdAt,
    risks: [{ id: `risk-${id}`, thesisId: id, title: 'Customer concentration',
      severity: 'high', status: 'open', createdAt, updatedAt: createdAt }],
    catalysts: [{ id: `catalyst-${id}`, thesisId: id, title: 'Product launch',
      status: 'open', createdAt, updatedAt: createdAt }]
  };
}

/** Confirm all six sections through the public helpers, including the final preview. */
function ready(
  workflow: LivingThesisReviewWorkflow,
  scoreDraft: LivingThesisReviewScoreDraft = { kind: 'score', input: scoreInput },
  changeThesis = true
): LivingThesisReviewWorkflow {
  let next = value(updateLivingThesisReviewReason(workflow, 'Quarterly evidence check'));
  next = value(updateLivingThesisReviewScoreDraft(next, scoreDraft));
  if (changeThesis) {
    next = { ...next, notes: 'The launch and retention report informed this review.', draft: {
      ...next.draft, summary: 'New retention evidence supports the thesis.', conviction: 'high',
      risks: [
        { ...next.draft.risks[0], detail: 'Diversification reduced concentration.', status: 'resolved' },
        { id: `new-risk-${workflow.baseline.id}`, thesisId: workflow.baseline.id,
          title: 'Pricing pressure', severity: 'medium', status: 'open', createdAt: startedAt, updatedAt: startedAt }
      ]
    } };
  }
  for (const step of LIVING_THESIS_REVIEW_WORKFLOW_STEPS.slice(0, -1)) {
    next = value(completeLivingThesisReviewWorkflowStep(next, step.id));
  }
  expect(next.activeStep).toBe('complete_review');
  expect(next.completedSteps).toHaveLength(6);
  return next;
}

async function filename() {
  const directory = await mkdtemp(join(tmpdir(), 'review-completion-'));
  folders.push(directory);
  return join(directory, 'research.sqlite');
}

async function open(path: string) {
  const storage = await createSqliteStorage({ filename: path });
  storages.add(storage);
  return storage;
}

function service(storage: SqliteStorage, prefix = 'record') {
  let id = 0;
  let tick = 0;
  const times = [startedAt, savedAt, completedAt];
  return createReviewSessionStorageService(async () => storage, {
    createId: () => `${prefix}-${++id}`,
    now: () => times[tick++] ?? new Date(Date.parse(afterCompletion) + tick * 1000).toISOString()
  });
}

async function fixture(scoreDraft?: LivingThesisReviewScoreDraft, changeThesis = true) {
  const path = await filename();
  const storage = await open(path);
  const parent = value(storage.repositories.livingTheses.create(thesis()));
  const reviews = service(storage);
  const started = value(await reviews.start(parent.id));
  const workflow = ready(started.workflow, scoreDraft, changeThesis);
  const saved = value(await reviews.saveDraft(started.id, workflow, started.version));
  return { path, storage, parent, reviews, workflow, saved };
}

function snapshot(storage: SqliteStorage) {
  return {
    theses: storage.repositories.livingTheses.list(),
    sessions: storage.repositories.reviewSessions.list(),
    revisions: storage.repositories.thesisRevisions.list(),
    scores: storage.repositories.mbsScoreSnapshots.list()
  };
}

describe('atomic review completion against file SQLite', () => {
  it('saves the thesis, completed session, exact score, and history together and recovers them after restart', async () => {
    const { path, storage, parent, reviews, workflow, saved } = await fixture();
    const result = value(await reviews.complete(saved.id, workflow, saved.version));
    const calculated = calculateMbsScore(scoreInput);
    expect(result.session).toMatchObject({ id: 'record-1', schemaVersion: 2, version: 3,
      startedAt, updatedAt: completedAt, completedAt, revisionId: 'record-2', scoreSnapshotId: 'record-3',
      workflow: { status: 'completed', completedSteps: LIVING_THESIS_REVIEW_WORKFLOW_STEPS.map((step) => step.id) } });
    expect(result.thesis).toMatchObject({ id: parent.id, version: 2, createdAt, updatedAt: completedAt,
      summary: workflow.draft.summary, conviction: 'high' });
    expect(result.thesis.risks).toEqual([
      { ...parent.risks[0], detail: 'Diversification reduced concentration.', status: 'resolved', updatedAt: completedAt },
      { ...workflow.draft.risks[1], createdAt: completedAt, updatedAt: completedAt }
    ]);
    expect(result.thesis.catalysts).toEqual(parent.catalysts);
    expect(result.revision).toEqual({ id: 'record-2', thesisId: parent.id, reviewSessionId: saved.id,
      schemaVersion: 1, createdAt: completedAt, before: parent, after: result.thesis, scoreSnapshotId: 'record-3' });
    expect(result.scoreSnapshot).toEqual({ id: 'record-3', thesisId: parent.id, ticker: parent.ticker,
      companyName: parent.entityName, score: calculated.score, maxScore: calculated.maxScore,
      percentage: calculated.percentage, rating: calculated.rating, completedCriteria: 7,
      input: scoreInput, notes: scoreInput.notes!.trim(), createdAt: completedAt });
    expect(storage.repositories.reviewSessions.getInProgressByThesisId(parent.id)).toBeUndefined();
    expect(value(await reviews.getActive(parent.id))).toBeNull();
    const persisted = snapshot(storage);
    await reviews.close();
    storages.delete(storage);
    const reopened = await open(path);
    expect(snapshot(reopened)).toEqual(persisted);
    const next = value(await service(reopened, 'next').start(parent.id));
    expect(next.workflow.baseline).toEqual(result.thesis);
    expect(next.workflow.status).toBe('in_progress');
    expect(reopened.repositories.thesisRevisions.list(parent.id)).toEqual([result.revision]);
  });

  it('records an explicit no-score review and a no-change thesis review without inventing ratings', async () => {
    const { storage, parent, reviews, workflow, saved } = await fixture({ kind: 'skip' }, false);
    const result = value(await reviews.complete(saved.id, workflow, saved.version));
    expect(result.thesis).toEqual({ ...parent, version: 2, updatedAt: completedAt });
    expect(result.session).toMatchObject({ version: 3, workflow: { status: 'completed', scoreDraft: { kind: 'skip' } } });
    expect(result.scoreSnapshot).toBeUndefined();
    expect(result.session.scoreSnapshotId).toBeUndefined();
    expect(result.revision.scoreSnapshotId).toBeUndefined();
    expect(result.revision.before).toEqual(parent);
    expect(result.revision.after).toEqual(result.thesis);
    expect(storage.repositories.mbsScoreSnapshots.list()).toEqual([]);
    expect(storage.repositories.thesisRevisions.list()).toEqual([result.revision]);
  });

  it('retries a lost completion response with the original IDs and returns the current thesis after later Board edits', async () => {
    const { storage, reviews, workflow, saved } = await fixture();
    const completed = value(await reviews.complete(saved.id, workflow, saved.version));
    expect(value(await reviews.complete(saved.id, workflow, saved.version))).toEqual(completed);
    const edited = value(storage.repositories.livingTheses.update({ ...completed.thesis,
      summary: 'A later Board edit must remain intact.', updatedAt: afterCompletion }, completed.thesis.version));
    const retry = value(await reviews.complete(saved.id, workflow, saved.version));
    expect(retry).toEqual({ ...completed, thesis: edited });
    expect(storage.repositories.thesisRevisions.list()).toEqual([completed.revision]);
    expect(storage.repositories.mbsScoreSnapshots.list()).toEqual([completed.scoreSnapshot]);
    expect(storage.repositories.reviewSessions.list()).toEqual([completed.session]);
    const before = snapshot(storage);
    for (const altered of [
      { ...workflow, notes: 'Altered after completion' },
      { ...workflow, draft: { ...workflow.draft, summary: 'Rewritten completed research' } },
      { ...workflow, scoreDraft: { kind: 'skip' } }
    ]) {
      expect(await reviews.complete(saved.id, altered, saved.version)).toMatchObject({ ok: false });
    }
    expect((await reviews.complete(saved.id, workflow, completed.session.version)).ok).toBe(false);
    expect(snapshot(storage)).toEqual(before);
  });

  it.each(['snapshot', 'thesis', 'session', 'revision'] as const)(
    'rolls back every SQL write when %s returns failure after writing, then allows retry', async (stage) => {
      const { storage, reviews, workflow, saved } = await fixture();
      const before = snapshot(storage);
      const injected = injectFailureAfterWrite(storage, stage, false);
      expect(await reviews.complete(saved.id, workflow, saved.version)).toMatchObject({ ok: false,
        errors: [expect.stringContaining('Injected completion failure')] });
      expect(injected).toHaveBeenCalledOnce();
      expect(snapshot(storage)).toEqual(before);
      expect(value(await reviews.resume(saved.id)).session).toEqual(saved);
      injected.mockRestore();
      const retried = value(await reviews.complete(saved.id, workflow, saved.version));
      expect(retried.session.workflow.status).toBe('completed');
      expect(storage.repositories.thesisRevisions.list()).toEqual([retried.revision]);
      expect(storage.repositories.mbsScoreSnapshots.list()).toEqual([retried.scoreSnapshot]);
    }
  );

  it.each(['snapshot', 'thesis', 'session', 'revision'] as const)(
    'rolls back every SQL write when %s throws after writing, then allows retry', async (stage) => {
      const { storage, reviews, workflow, saved } = await fixture();
      const before = snapshot(storage);
      const injected = injectFailureAfterWrite(storage, stage, true);
      expect(await reviews.complete(saved.id, workflow, saved.version)).toEqual({ ok: false,
        errors: ['The review could not be completed. Your saved draft is intact. Try again.'] });
      expect(injected).toHaveBeenCalledOnce();
      expect(snapshot(storage)).toEqual(before);
      injected.mockRestore();
      expect((await reviews.complete(saved.id, workflow, saved.version)).ok).toBe(true);
      expect(storage.repositories.thesisRevisions.list()).toHaveLength(1);
      expect(storage.repositories.mbsScoreSnapshots.list()).toHaveLength(1);
    }
  );

  it('rejects a stale parent version from another connection without overwriting that thesis or consuming its draft', async () => {
    const { path, storage, parent, reviews, workflow, saved } = await fixture();
    const second = await open(path);
    const winner = value(second.repositories.livingTheses.update({ ...parent,
      title: 'Updated in another window', updatedAt: savedAt }, parent.version));
    const before = snapshot(second);
    expect(await reviews.complete(saved.id, workflow, saved.version)).toMatchObject({ ok: false,
      errors: [expect.stringContaining('saved thesis changed')] });
    expect(snapshot(storage)).toEqual(before);
    expect(value(await reviews.resume(saved.id))).toEqual({ session: saved, currentThesis: winner, baselineStatus: 'changed' });
  });

  it('rejects a competing session version from another connection and permits completion of the winning draft', async () => {
    const { path, storage, parent, reviews, workflow, saved } = await fixture();
    const second = await open(path);
    const other = createReviewSessionStorageService(async () => second, { now: () => afterCompletion, createId: () => 'unused' });
    const winner = value(await other.saveDraft(saved.id, { ...workflow, notes: 'The newer window saved this note.' }, saved.version));
    const before = snapshot(second);
    expect(await reviews.complete(saved.id, workflow, saved.version)).toMatchObject({ ok: false,
      errors: [expect.stringContaining('Review version conflict')] });
    expect(snapshot(storage)).toEqual(before);
    expect(storage.repositories.livingTheses.getById(parent.id)).toEqual(parent);
    const completing = createReviewSessionStorageService(async () => storage, {
      now: () => afterCompletion, createId: (() => { let id = 0; return () => `winner-${++id}`; })()
    });
    const result = value(await completing.complete(winner.id, winner.workflow, winner.version));
    expect(result.session.workflow.notes).toBe(winner.workflow.notes);
    expect(second.repositories.thesisRevisions.list()).toEqual([result.revision]);
  });

  it('rejects forged baselines, premature confirmation, malformed content, and incomplete ratings without any writes', async () => {
    const { storage, reviews, workflow, saved } = await fixture();
    const before = snapshot(storage);
    const premature = { ...workflow, activeStep: 'preview_changes', completedSteps: workflow.completedSteps.slice(0, -1) };
    const cases: unknown[] = [null, {},
      { ...workflow, baseline: { ...workflow.baseline, summary: 'Forged original evidence' } },
      { ...workflow, baseline: { ...workflow.baseline, version: 2 } },
      premature,
      { ...workflow, draft: { ...workflow.draft, summary: '' } },
      { ...workflow, scoreDraft: { kind: 'pending' } },
      { ...workflow, scoreDraft: { kind: 'score', input: { moat: 7 } } },
      { ...workflow, draft: { ...workflow.draft, risks: [] } },
      { ...workflow, status: 'completed', completedSteps: [...workflow.completedSteps, 'complete_review'] }
    ];
    for (const candidate of cases) {
      expect((await reviews.complete(saved.id, candidate, saved.version)).ok).toBe(false);
      expect(snapshot(storage)).toEqual(before);
    }
    for (const version of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect((await reviews.complete(saved.id, workflow, version)).ok).toBe(false);
    }
    expect(snapshot(storage)).toEqual(before);
  });

  it('rolls back an already-created score when a new child collides with a draft-only ID belonging to another thesis', async () => {
    const { storage, reviews, workflow, saved } = await fixture();
    const otherParent = value(storage.repositories.livingTheses.create(thesis('other')));
    const other = service(storage, 'other');
    const otherSession = value(await other.start(otherParent.id));
    value(await other.saveDraft(otherSession.id, { ...otherSession.workflow, draft: {
      ...otherSession.workflow.draft,
      catalysts: [...otherSession.workflow.draft.catalysts, {
        id: 'reserved-by-other-draft', thesisId: otherParent.id, title: 'Draft milestone',
        status: 'open', createdAt: startedAt, updatedAt: startedAt
      }]
    } }, otherSession.version));
    const submitted = { ...workflow, draft: { ...workflow.draft, risks: [workflow.draft.risks[0], {
      ...workflow.draft.risks[1], id: 'reserved-by-other-draft'
    }] } };
    const before = snapshot(storage);
    const scoreWrites = vi.spyOn(storage.repositories.mbsScoreSnapshots, 'create');
    expect((await reviews.complete(saved.id, submitted, saved.version)).ok).toBe(false);
    expect(scoreWrites).toHaveBeenCalledOnce();
    expect(snapshot(storage)).toEqual(before);
    expect(value(await reviews.resume(saved.id)).session).toEqual(saved);
  });

  it('keeps completed reviews and revisions immutable through repositories and direct database writes', async () => {
    const { path, storage, reviews, workflow, saved } = await fixture();
    const completed = value(await reviews.complete(saved.id, workflow, saved.version));
    const before = snapshot(storage);
    expect((await reviews.resume(saved.id)).ok).toBe(false);
    expect((await reviews.abandon(saved.id, completed.session.version)).ok).toBe(false);
    expect((await reviews.saveDraft(saved.id, workflow, completed.session.version)).ok).toBe(false);
    expect(storage.repositories.reviewSessions.update(completed.session, completed.session.version).ok).toBe(false);
    expect(storage.repositories.thesisRevisions.create(completed.revision).ok).toBe(false);
    expect(storage.repositories.thesisRevisions.create({ ...completed.revision, id: 'duplicate-history' }).ok).toBe(false);
    const database = await createSqliteDatabase({ filename: path });
    try {
      expect(() => database.prepare('UPDATE living_thesis_review_sessions SET version = version + 1 WHERE id = ?')
        .run(saved.id)).toThrow('Ended reviews are immutable');
      expect(() => database.prepare('DELETE FROM living_thesis_review_sessions WHERE id = ?')
        .run(saved.id)).toThrow('Ended reviews are immutable');
      expect(() => database.prepare('UPDATE living_thesis_revisions SET created_at = ? WHERE id = ?')
        .run(afterCompletion, completed.revision.id)).toThrow('Thesis revisions are immutable');
      expect(() => database.prepare('DELETE FROM living_thesis_revisions WHERE id = ?')
        .run(completed.revision.id)).toThrow('Thesis revisions are immutable');
    } finally { database.close(); }
    expect(snapshot(storage)).toEqual(before);
  });

  it('migrates a real version 5 database without changing schema 1 drafts or abandoned records, then completes a legacy draft as schema 2', async () => {
    const path = await filename();
    const parent: LivingThesis = { ...thesis(), risks: [], catalysts: [] };
    const workflow = value(updateLivingThesisReviewReason(value(startLivingThesisReviewWorkflow(parent)), 'Original legacy draft'));
    const legacy: LivingThesisReviewSession = { id: 'legacy-draft', thesisId: parent.id, schemaVersion: 1,
      version: 4, startedAt, updatedAt: savedAt, workflow };
    const abandoned: LivingThesisReviewSession = { ...legacy, id: 'legacy-abandoned',
      workflow: { ...workflow, status: 'abandoned' }, abandonedAt: savedAt };
    const database = await createSqliteDatabase({ filename: path });
    try {
      database.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL)');
      for (const migration of migrations.filter(({ version }) => version <= 5)) {
        database.exec(migration.sql);
        database.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(migration.version, migration.name);
      }
      database.prepare(`INSERT INTO living_theses
        (id, version, ticker, entity_name, title, summary, lifecycle, conviction, risk_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(parent.id, parent.version, parent.ticker!, parent.entityName, parent.title, parent.summary,
          parent.lifecycle, parent.conviction, parent.riskLevel, parent.createdAt, parent.updatedAt);
      for (const session of [legacy, abandoned]) {
        database.prepare(`INSERT INTO living_thesis_review_sessions
          (id, thesis_id, schema_version, version, status, started_at, updated_at, abandoned_at, workflow_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(session.id, session.thesisId, session.schemaVersion, session.version, session.workflow.status,
            session.startedAt, session.updatedAt, session.abandonedAt ?? null, JSON.stringify(session.workflow));
      }
      runMigrations(database);
      runMigrations(database);
      expect(database.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version))
        .toEqual([1, 2, 3, 4, 5, 6, 7]);
    } finally { database.close(); }
    const storage = await open(path);
    expect(storage.repositories.reviewSessions.getById(legacy.id)).toEqual(legacy);
    expect(storage.repositories.reviewSessions.getById(abandoned.id)).toEqual(abandoned);
    expect(storage.repositories.livingTheses.getById(parent.id)).toEqual(parent);
    const reviews = createReviewSessionStorageService(async () => storage, {
      now: () => completedAt, createId: () => 'legacy-revision'
    });
    const result = value(await reviews.complete(legacy.id, ready(legacy.workflow, { kind: 'skip' }, false), legacy.version));
    expect(result.session).toMatchObject({ schemaVersion: 2, version: 5, startedAt, completedAt,
      revisionId: 'legacy-revision', workflow: { status: 'completed' } });
    expect(storage.repositories.reviewSessions.getById(abandoned.id)).toEqual(abandoned);
    expect(storage.repositories.reviewSessions.getInProgressByThesisId(parent.id)).toBeUndefined();
    expect((await reviews.complete(abandoned.id, ready(legacy.workflow, { kind: 'skip' }, false), abandoned.version)).ok).toBe(false);
  });
});

function injectFailureAfterWrite(
  storage: SqliteStorage,
  stage: 'snapshot' | 'thesis' | 'session' | 'revision',
  throws: boolean
) {
  function fail() {
    if (throws) throw new Error('/private/path.sqlite: injected completion failure');
    return { ok: false as const, errors: ['Injected completion failure'] };
  }
  const repositories = storage.repositories;
  if (stage === 'snapshot') {
    const original = repositories.mbsScoreSnapshots.create.bind(repositories.mbsScoreSnapshots);
    return vi.spyOn(repositories.mbsScoreSnapshots, 'create').mockImplementation((...args) => {
      expect(original(...args).ok).toBe(true);
      return fail();
    });
  }
  if (stage === 'thesis') {
    const original = repositories.livingTheses.update.bind(repositories.livingTheses);
    return vi.spyOn(repositories.livingTheses, 'update').mockImplementation((...args) => {
      expect(original(...args).ok).toBe(true);
      return fail();
    });
  }
  if (stage === 'session') {
    const original = repositories.reviewSessions.complete.bind(repositories.reviewSessions);
    return vi.spyOn(repositories.reviewSessions, 'complete').mockImplementation((...args) => {
      expect(original(...args).ok).toBe(true);
      return fail();
    });
  }
  const original = repositories.thesisRevisions.create.bind(repositories.thesisRevisions);
  return vi.spyOn(repositories.thesisRevisions, 'create').mockImplementation((...args) => {
    expect(original(...args).ok).toBe(true);
    return fail();
  });
}
