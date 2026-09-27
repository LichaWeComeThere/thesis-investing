import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  completeLivingThesisReviewWorkflowStep, evaluateLivingThesisHealth,
  type LivingThesisReviewWorkflow
} from '@thesis-investing/core';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { createLivingThesesStorageService } from './livingThesesStorageService';
import { createReviewSessionStorageService } from './reviewSessionStorageService';
import { createDecisionsStorageService } from './decisionsStorageService';
import { createThesisHistoryStorageService } from './thesisHistoryStorageService';
import { createReviewQueueStorageService } from './reviewQueueStorageService';
import { buildLocalDataExportDocument, createLocalDataStorageService } from './localDataStorageService';

const storages = new Set<SqliteStorage>();
const folders: string[] = [];
afterEach(async () => {
  for (const storage of storages) storage.close();
  storages.clear();
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true });
});
function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}
async function open(filename: string) {
  const storage = await createSqliteStorage({ filename });
  storages.add(storage);
  return storage;
}
function close(storage: SqliteStorage) { storage.close(); storages.delete(storage); }
const assessedAt = '2026-09-27T02:00:00.000Z';
const today = '2026-09-26';
function snapshot(storage: SqliteStorage) {
  const r = storage.repositories;
  return buildLocalDataExportDocument({ exportedAt: assessedAt,
    livingTheses: r.livingTheses.list(), reviewSessions: r.reviewSessions.list(),
    thesisRevisions: r.thesisRevisions.list(), thesisDecisions: r.thesisDecisions.list(),
    mbsScoreSnapshots: r.mbsScoreSnapshots.list(), watchlistItems: r.watchlistItems.list(),
    thesisNotes: r.thesisNotes.list(), reminders: r.reminders.list(),
    portfolioRankerItems: r.portfolioRankerItems.list() });
}
function services(storage: SqliteStorage) {
  let sequence = 0;
  let tick = 0;
  const options = {
    createId: () => `closeout-${++sequence}`,
    now: () => new Date(Date.parse('2026-09-26T12:00:00.000Z') + tick++ * 1000).toISOString()
  };
  return {
    theses: createLivingThesesStorageService(async () => storage, options),
    reviews: createReviewSessionStorageService(async () => storage, options),
    decisions: createDecisionsStorageService(async () => storage, options),
    history: createThesisHistoryStorageService(async () => storage),
    queue: createReviewQueueStorageService(async () => storage, { now: () => assessedAt })
  };
}
async function readViews(storage: SqliteStorage, thesisId: string) {
  const api = services(storage);
  const history = value(await api.history.get(thesisId));
  return {
    library: value(await api.theses.list()), history,
    health: value(evaluateLivingThesisHealth({ history, referenceTime: assessedAt, today })),
    queue: value(await api.queue.get(today)),
    active: value(await api.reviews.getActive(thesisId))
  };
}

// Composes production write/read services instead of restoring synthetic completed fixtures.
// Each restart closes the file database and constructs fresh services and connections.
describe('Living Thesis OS closeout journey', () => {
  it.each([true, false])('preserves the service-created journey through restart and backup recovery (scored=%s)', async (scored) => {
    const folder = await mkdtemp(join(tmpdir(), 'living-thesis-closeout-'));
    folders.push(folder);
    const sourcePath = join(folder, 'source.sqlite');
    let storage = await open(sourcePath);
    let api = services(storage);
    let thesis = value(await api.theses.create({
      entityName: 'Example Research', ticker: 'EXM', title: 'Retention evidence',
      summary: 'Original research.', lifecycle: 'draft', conviction: 'medium', riskLevel: 'medium',
      nextReviewAt: '2026-09-25', risks: [{ title: 'Customer concentration', severity: 'high', status: 'open' }],
      catalysts: [{ title: 'New report', status: 'open' }]
    }));
    // Exercise every lifecycle through the same public update contract as the Board.
    for (const lifecycle of ['active', 'monitoring', 'paused', 'archived', 'active'] as const) {
      thesis = value(await api.theses.update({ ...thesis, lifecycle }, thesis.version));
      expect(thesis.lifecycle).toBe(lifecycle);
      expect(Boolean(thesis.archivedAt)).toBe(lifecycle === 'archived');
    }
    const archived = value(await api.theses.create({ ...thesis, entityName: 'Separate same-ticker research', lifecycle: 'archived' }));
    const tickerless = value(await api.theses.create({ ...thesis, ticker: undefined, entityName: 'Private research', lifecycle: 'paused' }));
    const started = value(await api.reviews.start(thesis.id));
    let workflow: LivingThesisReviewWorkflow = { ...started.workflow,
      reviewReason: 'Quarterly evidence review', notes: 'Read the retention report.',
      draft: { ...started.workflow.draft, summary: 'New evidence supports retention.' },
      scoreDraft: scored ? { kind: 'score', input: {
        businessQuality: 8, moat: 7, management: 6, balanceSheet: 9, growth: 5, valuation: 4, risk: 0
      } } : { kind: 'skip' }
    };
    while (workflow.activeStep !== 'complete_review') {
      workflow = value(completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep));
    }
    const saved = value(await api.reviews.saveDraft(started.id, workflow, started.version));
    expect(value(await api.theses.getById(thesis.id))).toEqual(thesis);
    close(storage);
    storage = await open(sourcePath);
    api = services(storage);
    const resumed = value(await api.reviews.getActive(thesis.id));
    expect(resumed).toMatchObject({ baselineStatus: 'current', session: saved });
    // Use a later clock and fresh IDs, like a new application process.
    const reviews = createReviewSessionStorageService(async () => storage, {
      now: () => '2026-09-26T13:00:00.000Z', createId: (() => { let id = 0; return () => `finished-${++id}`; })()
    });
    const completed = value(await reviews.complete(saved.id, saved.workflow, saved.version));
    expect(completed.thesis.summary).toBe('New evidence supports retention.');
    expect(completed.revision.before).toEqual(thesis);
    expect(Boolean(completed.scoreSnapshot)).toBe(scored);
    expect(value(await reviews.complete(saved.id, saved.workflow, saved.version))).toEqual(completed);
    const decisions = createDecisionsStorageService(async () => storage, { now: () => '2026-09-26T14:00:00.000Z' });
    const requestId = '00000000-0000-4000-8000-000000000001';
    const input = { title: 'Check the next report', rationale: 'Retention remains the key question.', reviewSessionId: saved.id };
    const decision = value(await decisions.create(thesis.id, input, requestId));
    expect(value(await decisions.create(thesis.id, input, requestId))).toEqual(decision);
    expect((await decisions.create(thesis.id, { ...input, title: 'Rewrite history' }, requestId)).ok).toBe(false);
    expect((await reviews.complete(saved.id, { ...workflow, reviewReason: 'Rewrite history' }, saved.version)).ok).toBe(false);

    // A subsequent unfinished review must coexist with immutable completed history.
    const draftReviews = createReviewSessionStorageService(async () => storage, {
      now: () => '2026-09-26T15:00:00.000Z', createId: () => 'next-review'
    });
    const next = value(await draftReviews.start(thesis.id));
    const nextSaved = value(await draftReviews.saveDraft(next.id, { ...next.workflow, notes: 'Unfinished follow-up.' }, next.version));
    const expected = snapshot(storage);
    const views = await readViews(storage, thesis.id);
    expect(views.library.map((item) => item.id).sort()).toEqual([thesis.id, archived.id, tickerless.id].sort());
    expect(views.queue.items).toHaveLength(1);
    expect(views.queue.items[0]).toMatchObject({ thesisId: thesis.id, group: 'in_progress', review: { sessionId: nextSaved.id } });
    expect(views.queue.excludedThesisCount).toBe(2);
    expect(views.history.items.filter((item) => item.kind === 'review')).toHaveLength(1);
    expect(views.history.items.filter((item) => item.kind === 'decision')).toHaveLength(1);
    expect(views.history.scores).toHaveLength(scored ? 1 : 0);
    expect(snapshot(storage)).toEqual(expected); // Derived reads never alter research.
    close(storage);
    storage = await open(sourcePath);
    expect(snapshot(storage)).toEqual(expected);
    expect(await readViews(storage, thesis.id)).toEqual(views);

    const backupPath = join(folder, 'backup.json');
    const exporter = createLocalDataStorageService({ createStorage: async () => storage,
      getUserDataPath: () => folder, databaseFileExists: () => true,
      showSaveDialog: async () => ({ canceled: false, filePath: backupPath }) });
    expect((await exporter.exportToJson()).ok).toBe(true);
    expect(JSON.parse(await readFile(backupPath, 'utf8')).data).toEqual(expected.data);
    close(storage);
    const restoredPath = join(folder, 'restored.sqlite');
    storage = await open(restoredPath);
    const restore = createLocalDataStorageService({ createStorage: async () => storage,
      getUserDataPath: () => folder, createImportPreviewId: () => 'closeout-preview',
      showOpenDialog: async () => ({ canceled: false, filePaths: [backupPath] }) });
    expect((await restore.previewImportFromJson()).ok).toBe(true);
    expect(storage.repositories.livingTheses.list()).toEqual([]);
    expect((await restore.importFromJson('closeout-preview')).ok).toBe(true);
    close(storage);
    storage = await open(restoredPath);
    expect(snapshot(storage)).toEqual(expected);
    expect(await readViews(storage, thesis.id)).toEqual(views);
    expect(value(await services(storage).reviews.getActive(thesis.id))?.session).toEqual(nextSaved);
    expect(storage.repositories.thesisRevisions.getById(completed.revision.id)).toEqual(completed.revision);
    expect(storage.repositories.thesisDecisions.getById(decision.id)).toEqual(decision);
  });
});
