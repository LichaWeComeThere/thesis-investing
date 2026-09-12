import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLivingThesisReviewAfter, calculateMbsScore,
  completeLivingThesisReviewWorkflow, completeLivingThesisReviewWorkflowStep,
  LIVING_THESIS_REVIEW_WORKFLOW_STEPS, startLivingThesisReviewWorkflow,
  type LivingThesis, type LivingThesisDecision, type LivingThesisReviewSession, type LivingThesisRevision,
  type MbsScoreSnapshot
} from '@thesis-investing/core';
import type { LocalDataExportDocument } from '../shared/localDataStorage';
import { createSqliteDatabase, createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { appendLocalDataImport, parseLocalDataImportDocument } from './localDataImport';
import { buildLocalDataExportDocument, createLocalDataStorageService } from './localDataStorageService';

const startedAt = '2026-09-11T12:00:00.000Z';
const completedAt = '2026-09-11T13:00:00.000Z';
const storages = new Set<SqliteStorage>();
const folders: string[] = [];
afterEach(async () => {
  for (const storage of storages) storage.close();
  storages.clear();
  for (const directory of folders.splice(0)) await rm(directory, { recursive: true });
});
function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}
async function open(filename?: string) { const storage = await createSqliteStorage({ filename }); storages.add(storage); return storage; }
function close(storage: SqliteStorage) { storage.close(); storages.delete(storage); }
async function folder() { const directory = await mkdtemp(join(tmpdir(), 'completed-review-backup-')); folders.push(directory); return directory; }
function parent(id = 'thesis'): LivingThesis {
  return { id, version: 1, ticker: 'EXM', entityName: 'Example', title: 'Evidence', summary: 'Original evidence.',
    lifecycle: 'active', conviction: 'medium', riskLevel: 'medium', createdAt: startedAt, updatedAt: startedAt,
    risks: [{ id: `risk-${id}`, thesisId: id, title: 'Demand', status: 'open', severity: 'high', createdAt: startedAt, updatedAt: startedAt }], catalysts: [] };
}
function completed(id = 'thesis', withScore = true) {
  const before = parent(id);
  let workflow = value(startLivingThesisReviewWorkflow(before));
  workflow = { ...workflow, reviewReason: 'Quarterly evidence review', notes: 'Demand improved.',
    draft: { ...workflow.draft, summary: 'Demand improved in the latest research.',
      risks: [...workflow.draft.risks, { id: `new-risk-${id}`, thesisId: id, title: 'New competition', status: 'open', severity: 'medium', createdAt: startedAt, updatedAt: startedAt }] },
    scoreDraft: withScore ? { kind: 'score', input: { balanceSheet: 5, businessQuality: 0, growth: 5, management: 5, moat: 5, risk: 5, valuation: 5, notes: 'Evidence for each factor.' } } : { kind: 'skip' } };
  for (const step of LIVING_THESIS_REVIEW_WORKFLOW_STEPS) {
    if (step.id !== 'complete_review') workflow = value(completeLivingThesisReviewWorkflowStep(workflow, step.id));
  }
  workflow = value(completeLivingThesisReviewWorkflow(workflow, before));
  const after = value(buildLivingThesisReviewAfter(workflow, completedAt));
  const scoreSnapshotId = withScore ? `score-${id}` : undefined;
  const session: LivingThesisReviewSession = { id: `review-${id}`, thesisId: id, schemaVersion: 2,
    version: 3, startedAt, updatedAt: completedAt, completedAt, revisionId: `revision-${id}`, scoreSnapshotId, workflow };
  const revision: LivingThesisRevision = { id: session.revisionId!, thesisId: id, schemaVersion: 1,
    reviewSessionId: session.id, createdAt: completedAt, before, after, scoreSnapshotId };
  const snapshots: MbsScoreSnapshot[] = [];
  if (workflow.scoreDraft.kind === 'score') {
    const result = calculateMbsScore(workflow.scoreDraft.input);
    if (result.rating === 'incomplete') throw new Error('The fixture needs a complete score.');
    snapshots.push({ id: scoreSnapshotId!, thesisId: id, ticker: after.ticker, companyName: after.entityName,
      createdAt: completedAt, notes: workflow.scoreDraft.input.notes, input: result.input,
      score: result.score, maxScore: result.maxScore, percentage: result.percentage,
      completedCriteria: result.completedCriteria, rating: result.rating });
  }
  const decision: LivingThesisDecision = { id: `decision-${id}`, thesisId: id, schemaVersion: 1,
    kind: 'review_conclusion', reviewSessionId: session.id, title: 'Continue researching demand',
    rationale: 'The review supports a closer look at recurring revenue.', createdAt: completedAt };
  return { livingTheses: [after], reviewSessions: [session], thesisRevisions: [revision],
    thesisDecisions: [decision], mbsScoreSnapshots: snapshots };
}
function document(...sets: ReturnType<typeof completed>[]): LocalDataExportDocument {
  return buildLocalDataExportDocument({ exportedAt: completedAt,
    livingTheses: sets.flatMap((set) => set.livingTheses), reviewSessions: sets.flatMap((set) => set.reviewSessions),
    thesisRevisions: sets.flatMap((set) => set.thesisRevisions), thesisDecisions: sets.flatMap((set) => set.thesisDecisions), mbsScoreSnapshots: sets.flatMap((set) => set.mbsScoreSnapshots),
    watchlistItems: [], thesisNotes: [], reminders: [], portfolioRankerItems: [] });
}
function snapshot(storage: SqliteStorage) {
  const repositories = storage.repositories;
  return buildLocalDataExportDocument({ exportedAt: completedAt, livingTheses: repositories.livingTheses.list(),
    reviewSessions: repositories.reviewSessions.list(), thesisRevisions: repositories.thesisRevisions.list(), thesisDecisions: repositories.thesisDecisions.list(),
    mbsScoreSnapshots: repositories.mbsScoreSnapshots.list(), watchlistItems: repositories.watchlistItems.list(),
    thesisNotes: repositories.thesisNotes.list(), reminders: repositories.reminders.list(), portfolioRankerItems: repositories.portfolioRankerItems.list() });
}
function importer(storage: SqliteStorage, incoming: unknown) {
  return createLocalDataStorageService({ createStorage: async () => storage, getUserDataPath: () => '/unused',
    createImportPreviewId: () => 'preview', readTextFile: async () => JSON.stringify(incoming),
    showOpenDialog: async () => ({ canceled: false, filePaths: ['/unused/backup.json'] }) });
}
function parse(incoming: unknown) { return parseLocalDataImportDocument(JSON.stringify(incoming)); }

// These tests exercise file backup, real SQLite writes, cross-record identity, and rollback.
describe('completed review and decision backups', () => {
  it('roundtrips all nine record types through a file and reopened SQLite, including scored and skipped reviews', async () => {
    const directory = await folder();
    const source = await open(join(directory, 'source.sqlite'));
    const incoming = document(completed(), completed('skip', false));
    incoming.data.thesisNotes.push({ id: 'note', title: 'Legacy note', body: 'Keep legacy links.', status: 'active' });
    incoming.data.watchlistItems.push({ id: 'watch', ticker: 'EXM', thesisNoteId: 'note' });
    incoming.data.reminders.push({ id: 'reminder', title: 'Review', type: 'thesis-review', dueDate: '2026-10-11' });
    incoming.data.portfolioRankerItems.push({ id: 'ranker', ticker: 'EXM', manualScore: 50 });
    incoming.counts.thesisNotes = 1; incoming.counts.watchlistItems = 1; incoming.counts.reminders = 1; incoming.counts.portfolioRankerItems = 1;
    incoming.data.thesisDecisions.push({ id: 'research-note', thesisId: 'thesis', schemaVersion: 1,
      kind: 'research_note', title: 'Check the next report', rationale: 'Look for stronger retention.', createdAt: completedAt });
    incoming.counts.thesisDecisions += 1;
    appendLocalDataImport(source, value(parse(incoming)));
    const expected = snapshot(source);
    const filePath = join(directory, 'backup.json');
    const exporter = createLocalDataStorageService({ createStorage: async () => source, getUserDataPath: () => directory,
      databaseFileExists: () => true, showSaveDialog: async () => ({ canceled: false, filePath }) });
    expect(await exporter.get()).toMatchObject({ ok: true, value: { recordCounts: { reviewSessions: 2, thesisRevisions: 2, thesisDecisions: 3 } } });
    expect(await exporter.exportToJson()).toMatchObject({ ok: true, value: { counts: expected.counts } });
    const exported = JSON.parse(await readFile(filePath, 'utf8')) as LocalDataExportDocument;
    expect(exported.formatVersion).toBe(5);
    expect(exported.data).toEqual(expected.data);
    close(source);
    const filename = join(directory, 'target.sqlite');
    const target = await open(filename);
    const restore = createLocalDataStorageService({ createStorage: async () => target, getUserDataPath: () => directory,
      createImportPreviewId: () => 'preview', showOpenDialog: async () => ({ canceled: false, filePaths: [filePath] }) });
    expect(await restore.previewImportFromJson()).toMatchObject({ ok: true, value: { preview: { formatVersion: 5, warnings: [] } } });
    expect(snapshot(target).counts.thesisRevisions).toBe(0);
    expect((await restore.importFromJson('preview')).ok).toBe(true);
    close(target);
    const reopened = await open(filename);
    expect(snapshot(reopened).data).toEqual(expected.data);
    expect(reopened.repositories.reviewSessions.getInProgressByThesisId('thesis')).toBeUndefined();
    expect(reopened.repositories.thesisRevisions.getById('revision-thesis')?.before.version).toBe(1);
    expect(reopened.repositories.thesisDecisions.getById('decision-thesis')).toMatchObject({
      reviewSessionId: 'review-thesis', createdAt: completedAt });
    expect(reopened.repositories.thesisDecisions.getById('research-note')?.reviewSessionId).toBeUndefined();
  });

  it('remaps every history, score, session and child link while reserving incoming suffixes and preserving legacy ownership', async () => {
    const storage = await open();
    appendLocalDataImport(storage, value(parse(document(completed()))));
    // The same text can identify a legacy note and a Living Thesis; their maps must stay distinct.
    value(storage.repositories.thesisNotes.create({ id: 'thesis', title: 'Existing note', body: 'Keep', status: 'active' }));
    value(storage.repositories.thesisNotes.create({ id: 'thesis-import-1', title: 'Reserved note', body: 'Keep', status: 'active' }));
    value(storage.repositories.thesisNotes.create({ id: 'thesis-import-2', title: 'Another reserved note', body: 'Keep', status: 'active' }));
    const incoming = document(completed(), completed('thesis-import-1'));
    incoming.data.thesisNotes.push({ id: 'thesis', title: 'Imported legacy note', body: 'Separate owner', status: 'active' });
    incoming.counts.thesisNotes = 1;
    const legacyScore = { ...incoming.data.mbsScoreSnapshots[0], id: 'legacy-score', createdAt: undefined };
    incoming.data.mbsScoreSnapshots.push(legacyScore); incoming.counts.mbsScoreSnapshots += 1;
    const restore = importer(storage, incoming);
    expect((await restore.previewImportFromJson()).ok).toBe(true);
    // An intervening child collision must be rechecked on confirmation.
    const other = parent('other');
    value(storage.repositories.livingTheses.create({ ...other, risks: [{ ...other.risks[0], id: 'new-risk-thesis-import-2' }] }));
    value(storage.repositories.thesisDecisions.restore({ id: 'decision-thesis-import-2', thesisId: 'thesis',
      schemaVersion: 1, kind: 'research_note', title: 'Intervening note', rationale: 'Preserve me.', createdAt: completedAt }));
    const original = snapshot(storage);
    expect((await restore.importFromJson('preview')).ok).toBe(true);
    expect(storage.repositories.reviewSessions.getById('review-thesis-import-2')).toMatchObject({
      thesisId: 'thesis-import-2', revisionId: 'revision-thesis-import-2', scoreSnapshotId: 'score-thesis-import-2' });
    expect(storage.repositories.thesisRevisions.getById('revision-thesis-import-2')).toMatchObject({
      thesisId: 'thesis-import-2', reviewSessionId: 'review-thesis-import-2', scoreSnapshotId: 'score-thesis-import-2',
      before: { id: 'thesis-import-2', risks: [{ id: 'risk-thesis-import-2', thesisId: 'thesis-import-2' }] },
      after: { id: 'thesis-import-2', risks: [{ id: 'risk-thesis-import-2', thesisId: 'thesis-import-2' }, { id: 'new-risk-thesis-import-3', thesisId: 'thesis-import-2' }] } });
    expect(storage.repositories.mbsScoreSnapshots.getById('score-thesis-import-2')?.thesisId).toBe('thesis-import-2');
    expect(storage.repositories.thesisDecisions.getById('decision-thesis-import-3')).toMatchObject({
      thesisId: 'thesis-import-2', reviewSessionId: 'review-thesis-import-2', createdAt: completedAt });
    expect(storage.repositories.thesisDecisions.getById('decision-thesis')).toEqual(original.data.thesisDecisions.find((d) => d.id === 'decision-thesis'));
    expect(storage.repositories.mbsScoreSnapshots.getById('legacy-score')?.thesisId).toBe('thesis-import-3');
    expect(storage.repositories.thesisRevisions.getById('revision-thesis')).toEqual(original.data.thesisRevisions[0]);
    expect(parse(snapshot(storage)).ok).toBe(true);
  });

  it('reads genuine format 3 schema 1 sessions and rejects schema 2 or revision data disguised as older formats', async () => {
    const before = parent();
    const old = { ...document(), formatVersion: 3,
      counts: { ...document().counts, livingTheses: 1, reviewSessions: 1 },
      data: { ...document().data, livingTheses: [before], reviewSessions: [{ id: 'old', thesisId: before.id,
        schemaVersion: 1, version: 1, startedAt, updatedAt: startedAt, workflow: value(startLivingThesisReviewWorkflow(before)) }] } };
    const raw = JSON.parse(JSON.stringify(old)); delete raw.counts.thesisRevisions; delete raw.data.thesisRevisions;
    delete raw.counts.thesisDecisions; delete raw.data.thesisDecisions;
    const parsed = value(parse(raw));
    expect(parsed.counts.thesisRevisions).toBe(0);
    const storage = await open();
    appendLocalDataImport(storage, parsed);
    expect(storage.repositories.reviewSessions.getById('old')?.schemaVersion).toBe(1);
    expect(parse({ ...raw, data: { ...raw.data, reviewSessions: [{ ...raw.data.reviewSessions[0], schemaVersion: 2 }] } }).ok).toBe(false);
    expect(parse(old).ok).toBe(false);
    expect(parse({ ...document(completed()), formatVersion: 3 }).ok).toBe(false);
  });

  it('rejects missing, forged and duplicated history links before opening storage', async () => {
    const createStorage = vi.fn<() => Promise<SqliteStorage>>();
    expect(parse(document(completed())).ok).toBe(true);
    const mutations: Array<(incoming: LocalDataExportDocument) => void> = [
      (d) => { d.data.thesisRevisions = []; d.counts.thesisRevisions = 0; },
      (d) => { d.data.reviewSessions = []; d.counts.reviewSessions = 0; },
      (d) => { d.data.mbsScoreSnapshots = []; d.counts.mbsScoreSnapshots = 0; },
      (d) => { d.data.reviewSessions[0] = { ...d.data.reviewSessions[0], revisionId: 'missing' }; },
      (d) => { d.data.thesisRevisions[0] = { ...d.data.thesisRevisions[0], reviewSessionId: 'missing' }; },
      (d) => { d.data.thesisRevisions[0] = { ...d.data.thesisRevisions[0], before: { ...d.data.thesisRevisions[0].before, summary: 'Forged baseline' } }; },
      (d) => { d.data.thesisRevisions[0] = { ...d.data.thesisRevisions[0], after: { ...d.data.thesisRevisions[0].after, summary: 'Forged result' } }; },
      (d) => { d.data.livingTheses[0] = { ...d.data.livingTheses[0], summary: 'Wrong equal-version parent' }; },
      (d) => { d.data.mbsScoreSnapshots[0].thesisId = 'other'; },
      (d) => { d.data.mbsScoreSnapshots[0].score = 99; },
      (d) => { d.data.mbsScoreSnapshots[0].input.businessQuality = 9; },
      (d) => { d.data.mbsScoreSnapshots[0].createdAt = startedAt; },
      (d) => { d.data.thesisRevisions.push({ ...d.data.thesisRevisions[0], id: 'duplicate-revision' }); d.counts.thesisRevisions += 1; },
      (d) => { const first = d.data.reviewSessions[0]; d.data.reviewSessions.push({ ...first, id: 'duplicate-session' }); d.counts.reviewSessions += 1; },
      (d) => { d.data.thesisRevisions[0] = { ...d.data.thesisRevisions[0], after: { ...d.data.thesisRevisions[0].after,
        risks: d.data.thesisRevisions[0].after.risks.map((risk) => ({ ...risk, thesisId: 'other' })) } }; }
    ];
    for (const mutate of mutations) {
      const incoming = JSON.parse(JSON.stringify(document(completed()))) as LocalDataExportDocument;
      mutate(incoming);
      const restore = createLocalDataStorageService({ createStorage, getUserDataPath: () => '/unused',
        readTextFile: async () => JSON.stringify(incoming), showOpenDialog: async () => ({ canceled: false, filePaths: ['/unused/bad.json'] }) });
      expect((await restore.previewImportFromJson()).ok).toBe(false);
    }
    expect(createStorage).not.toHaveBeenCalled();
  });


  it('preserves older revision history after later Board edits and rejects competing reviews for the same saved version', () => {
    const incoming = document(completed('thesis', false));
    incoming.data.livingTheses[0] = { ...incoming.data.livingTheses[0], version: 5, summary: 'Later Board edits.',
      updatedAt: '2026-09-12T12:00:00.000Z' };
    expect(parse(incoming).ok).toBe(true);
    const firstSession = incoming.data.reviewSessions[0];
    const firstRevision = incoming.data.thesisRevisions[0];
    incoming.data.reviewSessions.push({ ...firstSession, id: 'competing-review', revisionId: 'competing-revision' });
    incoming.data.thesisRevisions.push({ ...firstRevision, id: 'competing-revision', reviewSessionId: 'competing-review' });
    incoming.counts.reviewSessions = 2; incoming.counts.thesisRevisions = 2;
    expect(parse(incoming)).toMatchObject({ ok: false, errors: [expect.stringContaining('given thesis version')] });
  });

  it('rolls back all imported records on a late revision failure and retries the same preview', async () => {
    const directory = await folder(); const filename = join(directory, 'rollback.sqlite');
    const storage = await open(filename);
    appendLocalDataImport(storage, value(parse(document(completed('existing')))));
    const before = snapshot(storage);
    const database = await createSqliteDatabase({ filename });
    try {
      database.exec(`CREATE TRIGGER reject_late_revision BEFORE INSERT ON living_thesis_revisions
        WHEN NEW.id = 'revision-two' BEGIN SELECT RAISE(ABORT, 'Injected failure'); END;`);
      const incoming = document(completed('one'), completed('two'));
      incoming.data.watchlistItems.push({ id: 'new-watch', ticker: 'EXM' }); incoming.counts.watchlistItems = 1;
      const restore = importer(storage, incoming);
      expect((await restore.previewImportFromJson()).ok).toBe(true);
      expect(await restore.importFromJson('preview')).toMatchObject({ ok: false, errors: [expect.stringContaining('Unable to import thesis revision')] });
      expect(snapshot(storage)).toEqual(before);
      database.exec('DROP TRIGGER reject_late_revision');
      expect((await restore.importFromJson('preview')).ok).toBe(true);
      expect(storage.repositories.thesisRevisions.list()).toHaveLength(3);
    } finally { database.close(); }
  });


  it('reads genuine format 4 with completed history and preserves existing decisions', async () => {
    const storage = await open();
    appendLocalDataImport(storage, value(parse(document(completed('existing')))));
    const existing = storage.repositories.thesisDecisions.list();
    const raw = JSON.parse(JSON.stringify(document(completed())));
    raw.formatVersion = 4;
    delete raw.counts.thesisDecisions;
    delete raw.data.thesisDecisions;
    const restored = value(parse(raw));
    expect(restored.data.thesisDecisions).toEqual([]);
    expect(restored.counts.thesisDecisions).toBe(0);
    const restore = importer(storage, raw);
    expect(await restore.previewImportFromJson()).toMatchObject({ ok: true, value: { preview: {
      formatVersion: 4, warnings: [expect.stringContaining('does not include thesis decisions')]
    } } });
    expect((await restore.importFromJson('preview')).ok).toBe(true);
    expect(storage.repositories.thesisDecisions.list()).toEqual(existing);
    expect(storage.repositories.thesisRevisions.getById('revision-thesis')?.after.version).toBe(2);
    expect(parse({ ...document(completed()), formatVersion: 4 }).ok).toBe(false);
  });

  it('rejects invalid decisions and their links before opening storage', async () => {
    const createStorage = vi.fn<() => Promise<SqliteStorage>>();
    const mutations: Array<(incoming: LocalDataExportDocument) => void> = [
      (d) => { d.counts.thesisDecisions += 1; },
      (d) => { d.data.thesisDecisions.push({ ...d.data.thesisDecisions[0] }); d.counts.thesisDecisions += 1; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], thesisId: 'missing' }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], reviewSessionId: 'missing' }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], reviewSessionId: 'review-other' }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], kind: 'research_note' }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], reviewSessionId: undefined }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], createdAt: startedAt }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], kind: 'research_note',
        reviewSessionId: undefined, createdAt: '2026-09-10T12:00:00.000Z' }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], title: ' ' }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], rationale: ' ' }; },
      (d) => { d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], schemaVersion: 2 as 1 }; },
      (d) => {
        const thesis = d.data.livingTheses[0];
        d.data.reviewSessions.push({ id: 'unfinished', thesisId: thesis.id, schemaVersion: 2,
          version: 1, startedAt: completedAt, updatedAt: completedAt,
          workflow: value(startLivingThesisReviewWorkflow(thesis)) });
        d.counts.reviewSessions += 1;
        d.data.thesisDecisions[0] = { ...d.data.thesisDecisions[0], reviewSessionId: 'unfinished' };
      }
    ];
    for (const mutate of mutations) {
      const incoming = JSON.parse(JSON.stringify(document(completed(), completed('other')))) as LocalDataExportDocument;
      mutate(incoming);
      const restore = createLocalDataStorageService({ createStorage, getUserDataPath: () => '/unused',
        readTextFile: async () => JSON.stringify(incoming),
        showOpenDialog: async () => ({ canceled: false, filePaths: ['/unused/invalid-decision.json'] }) });
      expect((await restore.previewImportFromJson()).ok).toBe(false);
    }
    expect(createStorage).not.toHaveBeenCalled();
  });

  it('requires both format 5 decision fields and rejects decision fields disguised as any older format', () => {
    const incoming = document();
    for (const section of ['data', 'counts'] as const) {
      const missing = JSON.parse(JSON.stringify(incoming));
      delete missing[section].thesisDecisions;
      expect(parse(missing).ok).toBe(false);
    }
    for (const formatVersion of [1, 2, 3, 4]) {
      const older = JSON.parse(JSON.stringify(incoming));
      older.formatVersion = formatVersion;
      if (formatVersion < 4) { delete older.data.thesisRevisions; delete older.counts.thesisRevisions; }
      if (formatVersion < 3) { delete older.data.reviewSessions; delete older.counts.reviewSessions; }
      if (formatVersion < 2) { delete older.data.livingTheses; delete older.counts.livingTheses; }
      expect(parse(older)).toMatchObject({ ok: false, errors: [expect.stringContaining('decisions require export format version 5')] });
    }
  });

  it('preserves decisions for later edited or archived theses without changing their dates or historical review links', async () => {
    const storage = await open();
    const incoming = document(completed());
    incoming.data.livingTheses[0] = { ...incoming.data.livingTheses[0], version: 4, lifecycle: 'archived',
      summary: 'Later research', updatedAt: '2026-09-12T12:00:00.000Z' };
    appendLocalDataImport(storage, value(parse(incoming)));
    expect(storage.repositories.thesisDecisions.list()).toEqual(incoming.data.thesisDecisions);
    expect(storage.repositories.livingTheses.getById('thesis')).toEqual(incoming.data.livingTheses[0]);
    expect(parse(snapshot(storage)).ok).toBe(true);
  });

  it('rolls back the entire import after a later decision write fails and retries the same preview', async () => {
    const directory = await folder(); const filename = join(directory, 'decision-rollback.sqlite');
    const storage = await open(filename);
    appendLocalDataImport(storage, value(parse(document(completed('existing')))));
    const before = snapshot(storage);
    const database = await createSqliteDatabase({ filename });
    try {
      database.exec(`CREATE TRIGGER reject_late_decision BEFORE INSERT ON living_thesis_decisions
        WHEN NEW.id = 'decision-two' BEGIN SELECT RAISE(ABORT, 'Injected decision failure'); END;`);
      const incoming = document(completed('one'), completed('two'));
      incoming.data.watchlistItems.push({ id: 'new-watch', ticker: 'EXM' }); incoming.counts.watchlistItems = 1;
      const restore = importer(storage, incoming);
      expect((await restore.previewImportFromJson()).ok).toBe(true);
      expect(await restore.importFromJson('preview')).toMatchObject({ ok: false,
        errors: [expect.stringContaining('Unable to import thesis decision')] });
      expect(snapshot(storage)).toEqual(before);
      database.exec('DROP TRIGGER reject_late_decision');
      expect((await restore.importFromJson('preview')).ok).toBe(true);
      expect(storage.repositories.thesisDecisions.list()).toHaveLength(3);
      expect(storage.repositories.thesisRevisions.list()).toHaveLength(3);
    } finally { database.close(); }
  });
});
