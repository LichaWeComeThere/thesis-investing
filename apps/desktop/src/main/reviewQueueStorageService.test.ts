import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  completeLivingThesisReviewWorkflowStep,
  type LivingThesis,
  type LivingThesisReviewWorkflow
} from '@thesis-investing/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSqliteDatabase, createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { buildLocalDataExportDocument } from './localDataStorageService';
import { createReviewSessionStorageService } from './reviewSessionStorageService';
import { createReviewQueueStorageService } from './reviewQueueStorageService';

const createdAt = '2026-09-18T09:00:00.000Z';
const reviewAt = '2026-09-19T10:00:00.000Z';
const editedAt = '2026-09-19T11:00:00.000Z';
const referenceTime = '2026-09-20T00:30:00.000Z';
const today = '2026-09-19';
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

function thesis(id = 'thesis', input: Partial<LivingThesis> = {}): LivingThesis {
  return { id, version: 1, ticker: 'SAME', entityName: `Research ${id}`, title: 'Recurring revenue',
    summary: 'Saved research.', lifecycle: 'active', conviction: 'medium', riskLevel: 'medium',
    createdAt, updatedAt: createdAt, risks: [], catalysts: [], ...input };
}

async function open(filename?: string) {
  const storage = await createSqliteStorage({ filename });
  storages.add(storage);
  return storage;
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'review-queue-'));
  folders.push(directory);
  const filename = join(directory, 'research.sqlite');
  const storage = await open(filename);
  value(storage.repositories.livingTheses.create(thesis('thesis', { nextReviewAt: '2026-09-18' })));
  let id = 0;
  const reviews = createReviewSessionStorageService(async () => storage, {
    now: () => reviewAt, createId: () => `review-${++id}`
  });
  const started = value(await reviews.start('thesis'));
  let workflow: LivingThesisReviewWorkflow = { ...started.workflow, reviewReason: 'Read the report',
    notes: 'Saved observations', scoreDraft: { kind: 'score', input: {
      businessQuality: 8, moat: 7, management: 6, balanceSheet: 9, growth: 5, valuation: 4, risk: 0
    } } };
  while (workflow.activeStep !== 'complete_review') {
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep));
  }
  const completed = value(await reviews.complete(started.id, workflow, started.version));
  const active = value(await reviews.start('thesis'));
  return { storage, filename, active, completed,
    queue: createReviewQueueStorageService(async () => storage, { now: () => referenceTime }) };
}

function snapshot(storage: SqliteStorage) {
  const r = storage.repositories;
  return buildLocalDataExportDocument({ exportedAt: referenceTime,
    livingTheses: r.livingTheses.list(), reviewSessions: r.reviewSessions.list(),
    thesisRevisions: r.thesisRevisions.list(), thesisDecisions: r.thesisDecisions.list(),
    mbsScoreSnapshots: r.mbsScoreSnapshots.list(), watchlistItems: r.watchlistItems.list(),
    thesisNotes: r.thesisNotes.list(), reminders: r.reminders.list(),
    portfolioRankerItems: r.portfolioRankerItems.list() });
}

describe('read-only review queue against SQLite', () => {
  it('returns a successful empty queue with independent UTC and local calendar references', async () => {
    const storage = await open();
    const queue = createReviewQueueStorageService(async () => storage, { now: () => referenceTime });
    expect(value(await queue.get(today))).toEqual({ algorithmVersion: 1, assessedAt: referenceTime,
      referenceDate: today, items: [], eligibleThesisCount: 0, excludedThesisCount: 0 });
    expect(snapshot(storage).data.livingTheses).toEqual([]);
  });

  it('derives all groups from saved records with one row per thesis and retains changed drafts without writing', async () => {
    const { storage, queue, active } = await fixture();
    for (const parent of [
      thesis('overdue', { nextReviewAt: '2026-09-18', riskLevel: 'high' }),
      thesis('due', { nextReviewAt: today }),
      thesis('concerns', { riskLevel: 'high' }),
      thesis('quiet', { nextReviewAt: '2026-10-20' }),
      thesis('paused', { lifecycle: 'paused', nextReviewAt: '2026-09-18', riskLevel: 'high' }),
      thesis('archived', { lifecycle: 'archived', archivedAt: editedAt, updatedAt: editedAt, riskLevel: 'high' })
    ]) value(storage.repositories.livingTheses.create(parent));
    const parent = storage.repositories.livingTheses.getById('thesis')!;
    value(storage.repositories.livingTheses.update({ ...parent, title: 'Saved changed title', updatedAt: editedAt }, parent.version));
    const before = snapshot(storage);
    const result = value(await queue.get(today));
    expect(result.items.map((item) => [item.thesisId, item.group])).toEqual([
      ['thesis', 'in_progress'], ['overdue', 'overdue'], ['due', 'due_soon'], ['concerns', 'research_concerns']
    ]);
    expect(result.items[0]).toMatchObject({ title: 'Saved changed title',
      review: { sessionId: active.id, updatedAt: active.updatedAt, baselineStatus: 'changed' } });
    expect(result.items[1].researchReasons).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'overall_risk_high' })]));
    expect(result.items[2].reviewTiming.status).toBe('due_today');
    expect(result.eligibleThesisCount).toBe(5);
    expect(result.excludedThesisCount).toBe(2);
    expect(snapshot(storage)).toEqual(before);
    expect(value(await queue.get(today))).toEqual(result);
    expect(snapshot(storage)).toEqual(before);
  });

  it('reads the current parents, all history, and active sessions in one transaction with one owned clock sample', async () => {
    const { storage, active } = await fixture();
    let inside = false;
    const originalTransaction = storage.runInTransaction.bind(storage);
    const transaction = vi.spyOn(storage, 'runInTransaction').mockImplementation((operation) => originalTransaction(() => {
      inside = true;
      try { return operation(); } finally { inside = false; }
    }));
    const r = storage.repositories;
    const parentList = r.livingTheses.list.bind(r.livingTheses);
    const parentRead = r.livingTheses.getById.bind(r.livingTheses);
    const sessionRead = r.reviewSessions.list.bind(r.reviewSessions);
    const revisionRead = r.thesisRevisions.list.bind(r.thesisRevisions);
    const decisionRead = r.thesisDecisions.list.bind(r.thesisDecisions);
    const scoreRead = r.mbsScoreSnapshots.getById.bind(r.mbsScoreSnapshots);
    const reads = [
      vi.spyOn(r.livingTheses, 'list').mockImplementation(() => { expect(inside).toBe(true); return parentList(); }),
      vi.spyOn(r.livingTheses, 'getById').mockImplementation((id) => { expect(inside).toBe(true); return parentRead(id); }),
      vi.spyOn(r.reviewSessions, 'list').mockImplementation((id) => { expect(inside).toBe(true); return sessionRead(id); }),
      vi.spyOn(r.thesisRevisions, 'list').mockImplementation((id) => { expect(inside).toBe(true); return revisionRead(id); }),
      vi.spyOn(r.thesisDecisions, 'list').mockImplementation((id) => { expect(inside).toBe(true); return decisionRead(id); }),
      vi.spyOn(r.mbsScoreSnapshots, 'getById').mockImplementation((id) => { expect(inside).toBe(true); return scoreRead(id); })
    ];
    const now = vi.fn(() => { expect(inside).toBe(true); return referenceTime; });
    const queue = createReviewQueueStorageService(async () => storage, { now });
    expect(value(await queue.get(today)).items[0].review).toEqual({ sessionId: active.id,
      updatedAt: active.updatedAt, baselineStatus: 'current' });
    expect(transaction).toHaveBeenCalledOnce();
    expect(now).toHaveBeenCalledOnce();
    for (const read of reads) expect(read).toHaveBeenCalled();
  });

  it('rejects malformed or non-date inputs before opening storage, retries failed opens and reads, and closes once', async () => {
    const storage = await open();
    const factory = vi.fn<() => Promise<SqliteStorage>>().mockRejectedValueOnce(new Error('Injected open failure')).mockResolvedValue(storage);
    const queue = createReviewQueueStorageService(factory, { now: () => referenceTime });
    await queue.close();
    for (const bad of ['', ' 2026-09-19', '2026-9-19', '2026-09-19 ', '2026-02-30',
      '2026-09-19T00:00:00.000Z', null, undefined, {}, 5, ['2026-09-19']]) {
      expect((await queue.get(bad as string)).ok).toBe(false);
    }
    expect(factory).not.toHaveBeenCalled();
    expect((await queue.get(today)).ok).toBe(false);
    expect((await queue.get(today)).ok).toBe(true);
    const read = vi.spyOn(storage.repositories.livingTheses, 'list').mockImplementationOnce(() => { throw new Error('Injected read failure'); });
    expect(await queue.get(today)).toEqual({ ok: false, errors: ['The review queue could not be loaded. Try again.'] });
    expect((await queue.get(today)).ok).toBe(true);
    read.mockRestore();
    expect(factory).toHaveBeenCalledTimes(2);
    const close = vi.spyOn(storage, 'close');
    await queue.close(); storages.delete(storage);
    await queue.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it.each([
    ['missing completed revision', "DROP TRIGGER immutable_thesis_revision_delete; DELETE FROM living_thesis_revisions WHERE id = 'review-2';"],
    ['missing linked score', "PRAGMA foreign_keys = OFF; DELETE FROM mbs_score_snapshots WHERE id = 'review-3';"],
    ['malformed active draft', "UPDATE living_thesis_review_sessions SET workflow_json = 'not json' WHERE id = 'review-4';"],
    ['same-version forged active baseline', "UPDATE living_thesis_review_sessions SET workflow_json = json_set(workflow_json, '$.baseline.summary', 'Forged current baseline') WHERE id = 'review-4';"],
    ['malformed excluded parent', "UPDATE living_theses SET lifecycle = 'paused', entity_name = '' WHERE id = 'thesis';"],
    ['orphan saved history', "PRAGMA foreign_keys = OFF; DELETE FROM living_theses WHERE id = 'thesis';"]
  ])('fails for %s instead of returning a partial or falsely empty queue', async (_name, sql) => {
    const { filename, queue } = await fixture();
    const database = await createSqliteDatabase({ filename });
    try {
      database.exec(sql);
      const raw = () => ['living_theses', 'living_thesis_review_sessions', 'living_thesis_revisions',
        'living_thesis_decisions', 'mbs_score_snapshots'].map((table) => database.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
      const before = raw();
      const result = await queue.get(today);
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty('value');
      if (result.ok) throw new Error('Corrupt queue records were accepted.');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(raw()).toEqual(before);
    } finally { database.close(); }
  });

  it('rebuilds the same queue after a restart without persisting derived data', async () => {
    const { storage, filename, queue } = await fixture();
    const before = snapshot(storage);
    const result = value(await queue.get(today));
    await queue.close(); storages.delete(storage);
    const reopened = await open(filename);
    const restarted = createReviewQueueStorageService(async () => reopened, { now: () => referenceTime });
    expect(value(await restarted.get(today))).toEqual(result);
    expect(snapshot(reopened)).toEqual(before);
  });
});
