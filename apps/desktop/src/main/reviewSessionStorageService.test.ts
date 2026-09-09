import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  completeLivingThesisReviewWorkflowStep, startLivingThesisReviewWorkflow,
  updateLivingThesisReviewReason,
  type LivingThesis, type LivingThesisReviewSession, type LivingThesisReviewWorkflow
} from '@thesis-investing/core';
import { createSqliteStorage, createSqliteDatabase, type SqliteStorage } from '../storage/sqlite';
import { migrations, runMigrations } from '../storage/schema';
import type { LocalDataExportDocument } from '../shared/localDataStorage';
import { buildLocalDataExportDocument, createLocalDataStorageService } from './localDataStorageService';
import { parseLocalDataImportDocument } from './localDataImport';
import { createReviewSessionStorageService } from './reviewSessionStorageService';

const timestamp = '2026-09-09T12:00:00.000Z';
const later = '2026-09-09T13:00:00.000Z';
const storages = new Set<SqliteStorage>();
const folders: string[] = [];
afterEach(async () => {
  for (const storage of storages) storage.close();
  storages.clear();
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true });
});
async function folder() {
  const path = await mkdtemp(join(tmpdir(), 'review-session-'));
  folders.push(path);
  return path;
}
async function open(filename?: string) {
  const storage = await createSqliteStorage({ filename });
  storages.add(storage);
  return storage;
}
function close(storage: SqliteStorage) { storage.close(); storages.delete(storage); }
function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}
function thesis(id = 'thesis'): LivingThesis {
  return { id, version: 1, entityName: 'Example', title: 'Research', summary: 'Saved evidence',
    lifecycle: 'active', conviction: 'medium', riskLevel: 'medium', createdAt: timestamp, updatedAt: timestamp,
    risks: [{ id: `risk-${id}`, thesisId: id, title: 'Demand', status: 'open', severity: 'high', createdAt: timestamp, updatedAt: timestamp }],
    catalysts: [{ id: `catalyst-${id}`, thesisId: id, title: 'Expansion', status: 'open', createdAt: timestamp, updatedAt: timestamp }] };
}
function session(parent = thesis(), id = 'review'): LivingThesisReviewSession {
  return { id, thesisId: parent.id, schemaVersion: 1, version: 1, startedAt: timestamp, updatedAt: timestamp,
    workflow: value(startLivingThesisReviewWorkflow(parent)) };
}
function unfinished(workflow: LivingThesisReviewWorkflow): LivingThesisReviewWorkflow {
  let next = value(updateLivingThesisReviewReason(workflow, 'Quarterly evidence review'));
  next = value(completeLivingThesisReviewWorkflowStep(next, 'start_review'));
  return { ...next, notes: '  Notes with\nline breaks  ',
    draft: { ...next.draft, title: '', nextReviewAt: '2026-', reviewCadenceDays: 0,
      risks: [...next.draft.risks, { id: 'new-draft-risk', thesisId: next.baseline.id, title: '', status: 'open', severity: 'unrated', createdAt: timestamp, updatedAt: timestamp }] },
    scoreDraft: { kind: 'score', input: { moat: 8, growth: 12, notes: 'Incomplete score' } } };
}
function service(storage: SqliteStorage, id = 'review') {
  return createReviewSessionStorageService(async () => storage, { createId: () => id, now: () => later });
}
function document(livingTheses: LivingThesis[], reviewSessions: LivingThesisReviewSession[]): LocalDataExportDocument {
  return buildLocalDataExportDocument({ exportedAt: later, livingTheses, reviewSessions,
    watchlistItems: [], thesisNotes: [], reminders: [], portfolioRankerItems: [], mbsScoreSnapshots: [] });
}
function snapshot(storage: SqliteStorage) {
  return document(storage.repositories.livingTheses.list(), storage.repositories.reviewSessions.list());
}
function importer(storage: SqliteStorage, contents: unknown) {
  return createLocalDataStorageService({ createStorage: async () => storage,
    getUserDataPath: () => '/unused', createImportPreviewId: () => 'preview',
    readTextFile: async () => JSON.stringify(contents),
    showOpenDialog: async () => ({ canceled: false, filePaths: ['/unused/backup.json'] }) });
}

describe('durable review session storage', () => {
  it('recovers progress and incomplete fields after closing and reopening the actual database', async () => {
    const filename = join(await folder(), 'reviews.sqlite');
    const storage = await open(filename);
    value(storage.repositories.livingTheses.create(thesis()));
    const reviews = service(storage);
    const started = value(await reviews.start('thesis'));
    expect(started).toMatchObject({ id: 'review', version: 1, startedAt: later, updatedAt: later });
    const workflow = unfinished(started.workflow);
    const saved = value(await reviews.saveDraft(started.id, workflow, 1));
    expect(saved.version).toBe(2);
    expect(storage.repositories.livingTheses.getById('thesis')).toEqual(thesis());
    expect(storage.repositories.mbsScoreSnapshots.list()).toEqual([]);
    await reviews.close(); storages.delete(storage);
    const reopened = await open(filename);
    expect(value(await service(reopened).resume(started.id))).toEqual({
      session: saved, currentThesis: thesis(), baselineStatus: 'current'
    });
    expect(reopened.repositories.reviewSessions.getInProgressByThesisId('thesis')).toEqual(saved);
  });

  it('rejects stale saves and duplicate starts from two database connections without losing the winning draft', async () => {
    const filename = join(await folder(), 'conflicts.sqlite');
    const first = await open(filename);
    value(first.repositories.livingTheses.create(thesis()));
    const second = await open(filename);
    const started = value(await service(first).start('thesis'));
    expect((await service(second, 'other-review').start('thesis')).ok).toBe(false);
    const stale = value(await service(second).resume(started.id)).session;
    const winner = value(await service(first).saveDraft(started.id, { ...started.workflow, notes: 'First window' }, 1));
    expect(await service(second).saveDraft(stale.id, { ...stale.workflow, notes: 'Stale window' }, stale.version))
      .toMatchObject({ ok: false, errors: [expect.stringContaining('version conflict')] });
    expect((await service(second).abandon(stale.id, stale.version)).ok).toBe(false);
    expect(second.repositories.reviewSessions.getById(started.id)).toEqual(winner);
  });

  it('flags changed and archived theses while preserving the original baseline and allowing draft recovery', async () => {
    const storage = await open();
    const parent = value(storage.repositories.livingTheses.create(thesis()));
    const started = value(await service(storage).start(parent.id));
    const updated = value(storage.repositories.livingTheses.update({ ...parent, summary: 'New saved evidence', updatedAt: later }, 1));
    expect(value(await service(storage).resume(started.id)).baselineStatus).toBe('changed');
    const saved = value(await service(storage).saveDraft(started.id, { ...started.workflow, notes: 'Keep my research' }, 1));
    expect(saved.workflow.baseline).toEqual(parent);
    value(storage.repositories.livingTheses.update({ ...updated, lifecycle: 'archived', archivedAt: later }, 2));
    expect(value(await service(storage).resume(started.id)).baselineStatus).toBe('archived');
    expect((await service(storage, 'new-review').start(parent.id)).ok).toBe(false);
  });

  it('abandons a review durably, prevents further editing, and frees the thesis for a new review', async () => {
    const storage = await open();
    value(storage.repositories.livingTheses.create(thesis()));
    const started = value(await service(storage).start('thesis'));
    const abandoned = value(await service(storage).abandon(started.id, 1));
    expect(abandoned).toMatchObject({ version: 2, abandonedAt: later, workflow: { status: 'abandoned' } });
    expect((await service(storage).resume(started.id)).ok).toBe(false);
    expect((await service(storage).saveDraft(started.id, started.workflow, 2)).ok).toBe(false);
    expect((await service(storage, 'next-review').start('thesis')).ok).toBe(true);
    expect(storage.repositories.reviewSessions.list('thesis')).toHaveLength(2);
  });

  it('rejects baseline and metadata changes, bad schemas, missing parents, and malformed save input', async () => {
    const storage = await open();
    expect(storage.repositories.reviewSessions.create(session()).ok).toBe(false);
    value(storage.repositories.livingTheses.create(thesis()));
    const original = value(storage.repositories.reviewSessions.create(session()));
    for (const altered of [
      { ...original, workflow: { ...original.workflow, baseline: { ...original.workflow.baseline, summary: 'Forged baseline' } } },
      { ...original, startedAt: '2026-09-09T11:00:00.000Z' },
      { ...original, schemaVersion: 2 } as unknown as LivingThesisReviewSession,
      { ...original, updatedAt: '2026-09-09T11:00:00.000Z' }
    ]) expect(storage.repositories.reviewSessions.update(altered, 1).ok).toBe(false);
    for (const bad of [null, {}, { ...original.workflow, completedSteps: ['review_assessment'] }]) {
      expect((await service(storage).saveDraft(original.id, bad, 1)).ok).toBe(false);
    }
    expect(storage.repositories.reviewSessions.getById(original.id)).toEqual(original);
  });

  it('reserves draft-only child identities across sessions and current-state writes', async () => {
    const storage = await open();
    value(storage.repositories.livingTheses.create(thesis()));
    const one = value(storage.repositories.reviewSessions.create(session()));
    value(storage.repositories.reviewSessions.update({ ...one, workflow: unfinished(one.workflow) }, 1));
    const other = value(storage.repositories.livingTheses.create(thesis('other')));
    const two = value(storage.repositories.reviewSessions.create(session(other, 'review-other')));
    expect(storage.repositories.reviewSessions.update({ ...two, workflow: unfinished(two.workflow) }, 1).ok).toBe(false);
    expect(storage.repositories.livingTheses.update({ ...other, catalysts: [...other.catalysts, {
      ...other.catalysts[0], id: 'new-draft-risk'
    }] }, 1).ok).toBe(false);
    expect(storage.repositories.livingTheses.getById('other')).toEqual(other);
  });

  it('upgrades a version 4 database without losing data and remains idempotent', async () => {
    const filename = join(await folder(), 'upgrade.sqlite');
    const database = await createSqliteDatabase({ filename });
    try {
      database.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL)');
      for (const migration of migrations.filter(({ version }) => version <= 4)) {
        database.exec(migration.sql);
        database.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(migration.version, migration.name);
      }
      database.prepare(`INSERT INTO living_theses
        (id, version, entity_name, title, summary, lifecycle, conviction, risk_level, created_at, updated_at)
        VALUES ('existing', 3, 'Example', 'Research', 'Evidence', 'active', 'medium', 'medium', ?, ?)`)
        .run(timestamp, timestamp);
      runMigrations(database); runMigrations(database);
      expect(database.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version)).toEqual([1, 2, 3, 4, 5]);
    } finally { database.close(); }
    const storage = await open(filename);
    expect(storage.repositories.livingTheses.getById('existing')).toMatchObject({ version: 3, summary: 'Evidence' });
    expect((await service(storage).start('existing')).ok).toBe(true);
  });

  it('returns safe storage errors and retries initialization after an unavailable database', async () => {
    const storage = await open();
    value(storage.repositories.livingTheses.create(thesis()));
    const factory = vi.fn<() => Promise<SqliteStorage>>()
      .mockRejectedValueOnce(new Error('/private/path.sqlite'))
      .mockResolvedValue(storage);
    const reviews = createReviewSessionStorageService(factory);
    expect(await reviews.start('thesis')).toEqual({ ok: false, errors: ['Review storage is unavailable. Try again.'] });
    expect((await reviews.start('thesis')).ok).toBe(true);
  });
});

describe('review session backups', () => {
  it('exports, imports, reopens, and resumes incomplete drafts from a version 3 JSON file', async () => {
    const directory = await folder();
    const source = await open(join(directory, 'source.sqlite'));
    value(source.repositories.livingTheses.create(thesis()));
    const started = value(await service(source).start('thesis'));
    const saved = value(await service(source).saveDraft(started.id, unfinished(started.workflow), 1));
    const backup = join(directory, 'backup.json');
    const exporter = createLocalDataStorageService({ createStorage: async () => source,
      getUserDataPath: () => directory, databaseFileExists: () => true,
      showSaveDialog: async () => ({ canceled: false, filePath: backup }) });
    expect(await exporter.get()).toMatchObject({ ok: true, value: { recordCounts: { reviewSessions: 1 } } });
    expect((await exporter.exportToJson()).ok).toBe(true);
    const exported = JSON.parse(await readFile(backup, 'utf8')) as LocalDataExportDocument;
    expect(exported.formatVersion).toBe(3);
    expect(exported.data.reviewSessions).toEqual([saved]);
    close(source);
    const filename = join(directory, 'target.sqlite');
    const target = await open(filename);
    const restore = createLocalDataStorageService({ createStorage: async () => target,
      getUserDataPath: () => directory, createImportPreviewId: () => 'preview',
      showOpenDialog: async () => ({ canceled: false, filePaths: [backup] }) });
    expect((await restore.previewImportFromJson()).ok).toBe(true);
    expect(await restore.importFromJson('preview')).toMatchObject({ ok: true, value: { imported: exported.counts } });
    close(target);
    const reopened = await open(filename);
    expect(value(await service(reopened).resume(saved.id))).toEqual({ session: saved, currentThesis: thesis(), baselineStatus: 'current' });
  });

  it.each([1, 2])('reads historical version %s without requiring review arrays or changing existing sessions', async (formatVersion) => {
    const storage = await open();
    value(storage.repositories.livingTheses.create(thesis()));
    const existing = value(await service(storage).start('thesis'));
    const legacy = { format: 'thesis-investing-local-data-export', formatVersion, appName: 'Thesis Investing',
      exportedAt: timestamp, storageAdapter: 'node:sqlite',
      counts: { watchlistItems: 0, thesisNotes: 0, reminders: 0, portfolioRankerItems: 0, mbsScoreSnapshots: 0,
        ...(formatVersion === 2 ? { livingTheses: 1 } : {}) },
      data: { watchlistItems: [], thesisNotes: [], reminders: [], portfolioRankerItems: [], mbsScoreSnapshots: [],
        ...(formatVersion === 2 ? { livingTheses: [thesis('legacy')] } : {}) } };
    const restore = importer(storage, legacy);
    expect(await restore.previewImportFromJson()).toMatchObject({ ok: true, value: { preview: { formatVersion, counts: { reviewSessions: 0 } } } });
    expect((await restore.importFromJson('preview')).ok).toBe(true);
    expect(storage.repositories.reviewSessions.list()).toEqual([existing]);
    if (formatVersion === 2) expect(storage.repositories.livingTheses.getById('legacy')).toEqual(thesis('legacy'));
  });

  it('remaps parent, session, baseline, and draft-only child IDs together, reserving incoming suffixes', async () => {
    const storage = await open();
    const parent = value(storage.repositories.livingTheses.create(thesis()));
    const original = value(storage.repositories.reviewSessions.create(session()));
    const saved = value(storage.repositories.reviewSessions.update({ ...original, workflow: unfinished(original.workflow) }, 1));
    const suffixedParent = thesis('thesis-import-1');
    const suffixedSession = session(suffixedParent, 'review-import-1');
    const incoming = document([parent, suffixedParent], [saved, suffixedSession]);
    const restore = importer(storage, incoming);
    expect((await restore.previewImportFromJson()).ok).toBe(true);
    // Another write after preview must also be taken into account during import.
    const other = thesis('other');
    value(storage.repositories.livingTheses.create({ ...other, catalysts: [{ ...other.catalysts[0], id: 'new-draft-risk-import-1' }] }));
    expect((await restore.importFromJson('preview')).ok).toBe(true);
    const remapped = storage.repositories.reviewSessions.getById('review-import-2')!;
    expect(remapped).toMatchObject({ thesisId: 'thesis-import-2', version: 2,
      workflow: { baseline: { id: 'thesis-import-2', risks: [{ id: 'risk-thesis-import-2', thesisId: 'thesis-import-2' }] },
        draft: { risks: [{ id: 'risk-thesis-import-2', thesisId: 'thesis-import-2' }, { id: 'new-draft-risk-import-2', thesisId: 'thesis-import-2' }] } } });
    expect(value(await service(storage).resume(remapped.id)).baselineStatus).toBe('current');
    expect(storage.repositories.reviewSessions.getById(saved.id)).toEqual(saved);
    expect(storage.repositories.reviewSessions.getById('review-import-1')).toEqual(suffixedSession);
    expect(storage.repositories.livingTheses.getById(parent.id)).toEqual(parent);
  });

  it('preserves stale baselines and abandoned sessions through backup restore', async () => {
    const storage = await open();
    const active = session();
    const abandoned: LivingThesisReviewSession = { ...active, id: 'abandoned', abandonedAt: timestamp,
      workflow: { ...active.workflow, status: 'abandoned' } };
    const updated = { ...thesis(), version: 3, summary: 'New evidence' };
    const restore = importer(storage, document([updated], [active, abandoned]));
    expect(await restore.previewImportFromJson()).toMatchObject({ ok: true, value: { preview: { warnings: [expect.stringContaining('changed or archived')] } } });
    expect((await restore.importFromJson('preview')).ok).toBe(true);
    expect(value(await service(storage).resume(active.id)).baselineStatus).toBe('changed');
    expect(storage.repositories.reviewSessions.getById(abandoned.id)).toEqual(abandoned);
    expect((await service(storage).resume(abandoned.id)).ok).toBe(false);
  });

  it('rejects missing parents, duplicate active reviews, ownership conflicts, invalid progress, and disguised older formats before storage opens', async () => {
    const good = document([thesis()], [session()]);
    const cases = [
      { ...good, data: { ...good.data, reviewSessions: undefined } },
      { ...good, counts: { ...good.counts, reviewSessions: 2 } },
      { ...good, formatVersion: 2 }, { ...good, formatVersion: 1 }, { ...good, formatVersion: 4 },
      document([], [session()]), document([thesis()], [session(), session()]),
      document([thesis()], [session(), session(thesis(), 'second')]),
      document([{ ...thesis(), summary: 'Changed without a new version' }], [session()]),
      document([thesis()], [{ ...session(), workflow: { ...session().workflow, baseline: { ...thesis(), version: 2 } } }]),
      document([thesis()], [{ ...session(), workflow: { ...session().workflow, completedSteps: ['start_review'] } }]),
      document([thesis(), thesis('other')], [{ ...session(), workflow: { ...session().workflow,
        draft: { ...session().workflow.draft, risks: [{ ...thesis().risks[0], id: 'catalyst-other' }] } } }])
    ];
    const createStorage = vi.fn<() => Promise<SqliteStorage>>();
    for (const bad of cases) {
      const restore = createLocalDataStorageService({ createStorage, getUserDataPath: () => '/unused',
        readTextFile: async () => JSON.stringify(bad),
        showOpenDialog: async () => ({ canceled: false, filePaths: ['/unused/backup.json'] }) });
      expect((await restore.previewImportFromJson()).ok).toBe(false);
    }
    expect(createStorage).not.toHaveBeenCalled();
    expect(parseLocalDataImportDocument(JSON.stringify(good)).ok).toBe(true);
  });

  it('rolls back all imported parents and earlier sessions when a later session insert fails, and permits retry', async () => {
    const filename = join(await folder(), 'rollback.sqlite');
    const storage = await open(filename);
    value(storage.repositories.livingTheses.create(thesis('existing')));
    value(storage.repositories.reviewSessions.create(session(thesis('existing'), 'existing-review')));
    value(storage.repositories.watchlistItems.create({ id: 'existing-watch', ticker: 'EXM' }));
    const before = snapshot(storage);
    const database = await createSqliteDatabase({ filename });
    try {
      database.exec(`CREATE TRIGGER reject_later_review BEFORE INSERT ON living_thesis_review_sessions
        WHEN NEW.id = 'reject' BEGIN SELECT RAISE(ABORT, 'Injected failure'); END;`);
      const one = thesis('one'); const two = thesis('two');
      const incoming = document([one, two], [session(one, 'first'), session(two, 'reject')]);
      incoming.data.watchlistItems.push({ id: 'new-watch', ticker: 'EXM' }); incoming.counts.watchlistItems = 1;
      const restore = importer(storage, incoming);
      expect((await restore.previewImportFromJson()).ok).toBe(true);
      expect(await restore.importFromJson('preview')).toMatchObject({ ok: false, errors: [expect.stringContaining('Unable to import review session')] });
      expect(snapshot(storage)).toEqual(before);
      expect(storage.repositories.watchlistItems.list()).toEqual([{ id: 'existing-watch', ticker: 'EXM', tags: [] }]);
      database.exec('DROP TRIGGER reject_later_review');
      expect((await restore.importFromJson('preview')).ok).toBe(true);
      expect(storage.repositories.reviewSessions.list()).toHaveLength(3);
    } finally { database.close(); }
  });
});
