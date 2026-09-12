import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { LivingThesis } from '@thesis-investing/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LocalDataExportDocument } from '../shared/localDataStorage';
import type { SqliteStorage } from '../storage/sqlite';
import { createSqliteDatabase, createSqliteStorage } from '../storage/sqlite';
import {
  buildLocalDataExportDocument,
  createLocalDataStorageService
} from './localDataStorageService';

const timestamp = '2026-09-08T12:00:00.000Z';
const storages = new Set<SqliteStorage>();
const folders: string[] = [];

afterEach(async () => {
  for (const storage of storages) storage.close();
  storages.clear();
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true });
});

describe('Living Thesis backups', () => {
  it('roundtrips all six record types through files, preserving saved versions after reopening SQLite', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'thesis-backup-'));
    folders.push(folder);
    const source = await openStorage(join(folder, 'source.sqlite'));
    seedLegacyRecords(source);
    const thesis = makeThesis('active');
    expect(source.repositories.livingTheses.create(thesis).ok).toBe(true);
    const updated = source.repositories.livingTheses.update({
      ...thesis,
      summary: 'Revised research with evidence and counterarguments.',
      updatedAt: '2026-09-08T13:00:00.000Z'
    }, 1);
    expect(updated.ok).toBe(true);
    expect(source.repositories.livingTheses.create(makeThesis('archived', {
      ticker: undefined,
      lifecycle: 'archived',
      archivedAt: timestamp
    })).ok).toBe(true);

    const backupPath = join(folder, 'backup.json');
    const exporter = createLocalDataStorageService({
      createStorage: async () => source,
      databaseFileExists: () => true,
      getUserDataPath: () => folder,
      now: () => new Date(timestamp),
      showSaveDialog: async () => ({ canceled: false, filePath: backupPath })
    });
    expect(await exporter.get()).toMatchObject({
      ok: true, value: { recordCounts: { livingTheses: 2 } }
    });
    expect(await exporter.exportToJson()).toMatchObject({
      ok: true, value: { status: 'completed', counts: { livingTheses: 2 } }
    });
    const exported = JSON.parse(await readFile(backupPath, 'utf8')) as LocalDataExportDocument;
    expect(exported.formatVersion).toBe(5);
    expect(exported.counts).toEqual({ ...legacyDocument.counts, reviewSessions: 0, thesisRevisions: 0, thesisDecisions: 0, livingTheses: 2 });
    expect(exported.data.livingTheses).toEqual(source.repositories.livingTheses.list());
    closeStorage(source);

    const targetPath = join(folder, 'target.sqlite');
    const target = await openStorage(targetPath);
    const importer = createLocalDataStorageService({
      createStorage: async () => target,
      createImportPreviewId: () => 'preview',
      getUserDataPath: () => folder,
      showOpenDialog: async () => ({ canceled: false, filePaths: [backupPath] })
    });
    expect(await importer.previewImportFromJson()).toMatchObject({
      ok: true,
      value: { status: 'ready', preview: { formatVersion: 5, counts: exported.counts } }
    });
    expect(snapshot(target).counts.livingTheses).toBe(0);
    expect(await importer.importFromJson('preview')).toMatchObject({
      ok: true, value: { imported: exported.counts, warnings: [] }
    });
    closeStorage(target);
    const reopened = await openStorage(targetPath);
    expect(snapshot(reopened).data).toEqual(exported.data);
    const restored = reopened.repositories.livingTheses.getById('active')!;
    expect(restored.version).toBe(2);
    expect(reopened.repositories.livingTheses.update({
      ...restored, summary: 'Editable after restore.'
    }, restored.version)).toMatchObject({ ok: true, value: { version: 3 } });
  });

  it('accepts a version 1 backup and leaves existing Living Theses intact', async () => {
    const storage = await openStorage();
    const existing = makeThesis('existing');
    expect(storage.repositories.livingTheses.create(existing).ok).toBe(true);
    const importer = importService(storage, legacyDocument);
    expect(await importer.previewImportFromJson()).toMatchObject({
      ok: true,
      value: { preview: {
        formatVersion: 1,
        counts: { ...legacyDocument.counts, reviewSessions: 0, thesisRevisions: 0, thesisDecisions: 0, livingTheses: 0 },
        warnings: [expect.stringContaining('older backup does not include Living Theses'),
          expect.stringContaining('older backup does not include review sessions'),
          expect.stringContaining('older backup does not include completed review history'),
          expect.stringContaining('older backup does not include thesis decisions')]
      } }
    });
    expect(await importer.importFromJson('preview')).toMatchObject({
      ok: true, value: { imported: { ...legacyDocument.counts, reviewSessions: 0, thesisRevisions: 0, thesisDecisions: 0, livingTheses: 0 } }
    });
    expect(storage.repositories.livingTheses.list()).toEqual([existing]);
    expect(storage.repositories.watchlistItems.getById('watch-one')?.thesisNoteId).toBe('note-one');
    expect(storage.repositories.mbsScoreSnapshots.getById('score-one')?.thesisId).toBe('note-one');
    expect(snapshot(storage).counts).toEqual({ ...legacyDocument.counts, reviewSessions: 0, thesisRevisions: 0, thesisDecisions: 0, livingTheses: 1 });
  });

  it('remaps repeated imports and reserves unused parent and child IDs from the backup', async () => {
    const storage = await openStorage();
    const original = makeThesis('one');
    const first = importService(storage, makeDocument([original]));
    await first.previewImportFromJson();
    expect((await first.importFromJson('preview')).ok).toBe(true);

    const suffixed = makeThesis('one-import-1', {
      risks: [{ ...original.risks[0], id: 'risk-one-import-1', thesisId: 'one-import-1' }],
      catalysts: [{ ...original.catalysts[0], id: 'catalyst-one-import-1', thesisId: 'one-import-1' }]
    });
    const importer = importService(storage, makeDocument([original, suffixed]));
    expect(await importer.previewImportFromJson()).toMatchObject({
      ok: true, value: { preview: { warnings: [
        expect.stringContaining('6 imported record IDs'),
        expect.stringContaining('2 imported risk/catalyst IDs')
      ] } }
    });
    expect((await importer.importFromJson('preview')).ok).toBe(true);
    expect(storage.repositories.livingTheses.getById('one')).toEqual(original);
    expect(storage.repositories.livingTheses.getById('one-import-1')).toEqual(suffixed);
    expect(storage.repositories.livingTheses.getById('one-import-2')).toEqual({
      ...original,
      id: 'one-import-2',
      risks: [{ ...original.risks[0], id: 'risk-one-import-2', thesisId: 'one-import-2' }],
      catalysts: [{ ...original.catalysts[0], id: 'catalyst-one-import-2', thesisId: 'one-import-2' }]
    });
  });

  it('remaps child collisions across risk/catalyst tables and rechecks IDs after preview', async () => {
    const storage = await openStorage();
    const incoming = makeThesis('one');
    const importer = importService(storage, makeDocument([incoming]));
    await importer.previewImportFromJson();
    const existing = makeThesis('one', {
      summary: 'Existing local research must survive.',
      risks: [{ ...incoming.risks[0], id: 'catalyst-one' }],
      catalysts: [{ ...incoming.catalysts[0], id: 'risk-one' }]
    });
    expect(storage.repositories.livingTheses.create(existing).ok).toBe(true);
    expect(await importer.importFromJson('preview')).toMatchObject({
      ok: true, value: { warnings: [
        expect.stringContaining('1 imported record ID'),
        expect.stringContaining('2 imported risk/catalyst IDs')
      ] }
    });
    expect(storage.repositories.livingTheses.getById('one')).toEqual(existing);
    expect(storage.repositories.livingTheses.getById('one-import-1')).toMatchObject({
      risks: [{ id: 'risk-one-import-1', thesisId: 'one-import-1' }],
      catalysts: [{ id: 'catalyst-one-import-1', thesisId: 'one-import-1' }]
    });
  });

  it('rolls back every record type and aggregate when a later child insert fails, then permits retry', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'thesis-backup-rollback-'));
    folders.push(folder);
    const filename = join(folder, 'target.sqlite');
    const storage = await openStorage(filename);
    seedLegacyRecords(storage);
    expect(storage.repositories.livingTheses.create(makeThesis('existing')).ok).toBe(true);
    const before = snapshot(storage);
    const database = await createSqliteDatabase({ filename });
    try {
      database.exec(`CREATE TRIGGER reject_imported_catalyst
        BEFORE INSERT ON living_thesis_catalysts
        WHEN NEW.title = 'Reject this catalyst'
        BEGIN SELECT RAISE(ABORT, 'Injected import failure'); END;`);
      const second = makeThesis('second');
      const document = makeDocument([
        makeThesis('first'),
        { ...second, catalysts: [{ ...second.catalysts[0], title: 'Reject this catalyst' }] }
      ]);
      const importer = importService(storage, document);
      expect((await importer.previewImportFromJson()).ok).toBe(true);
      expect(await importer.importFromJson('preview')).toMatchObject({
        ok: false, errors: [expect.stringContaining('Unable to import Living Thesis')]
      });
      expect(snapshot(storage).data).toEqual(before.data);
      expect(database.prepare('SELECT COUNT(*) AS count FROM living_thesis_risks').get()).toEqual({ count: 1 });
      expect(database.prepare('SELECT COUNT(*) AS count FROM living_thesis_catalysts').get()).toEqual({ count: 1 });
      database.exec('DROP TRIGGER reject_imported_catalyst;');
      expect(await importer.importFromJson('preview')).toMatchObject({
        ok: true, value: { imported: document.counts }
      });
      expect(storage.repositories.livingTheses.list()).toHaveLength(3);
      expect((await importer.importFromJson('preview')).ok).toBe(false);
    } finally {
      database.close();
    }
  });

  it.each(invalidThesisCases())('rejects %s before opening storage', async (_label, patch, message) => {
    const document = makeDocument([makeThesis('one')]);
    const invalid = {
      ...document,
      data: { ...document.data, livingTheses: [{ ...document.data.livingTheses[0], ...patch }] }
    };
    const createStorage = vi.fn(async () => { throw new Error('Storage must not open'); });
    const importer = createLocalDataStorageService({
      createStorage,
      getUserDataPath: () => '/unused',
      readTextFile: async () => JSON.stringify(invalid),
      showOpenDialog: async () => ({ canceled: false, filePaths: ['/unused/backup.json'] })
    });
    const result = await importer.previewImportFromJson();
    expect(result).toMatchObject({ ok: false, errors: expect.arrayContaining([expect.stringContaining(message)]) });
    expect(createStorage).not.toHaveBeenCalled();
  });

  it('rejects child IDs reused across different theses and duplicate thesis IDs', async () => {
    const storage = await openStorage();
    const one = makeThesis('one');
    const two = makeThesis('two');
    const cases = [
      makeDocument([one, one]),
      makeDocument([one, { ...two, catalysts: [{ ...two.catalysts[0], id: one.risks[0].id }] }])
    ];
    for (const document of cases) {
      expect(await importService(storage, document).previewImportFromJson()).toMatchObject({
        ok: false, errors: expect.arrayContaining([expect.stringContaining('unique')])
      });
    }
    expect(storage.repositories.livingTheses.list()).toEqual([]);
  });

  it('rejects missing arrays, wrong counts, unsupported versions, and thesis data disguised as version 1', async () => {
    const storage = await openStorage();
    const valid = makeDocument([makeThesis('one')]);
    const cases = [
      { ...valid, data: { ...valid.data, livingTheses: undefined } },
      { ...valid, counts: { ...valid.counts, livingTheses: 0 } },
      { ...valid, counts: { ...valid.counts, livingTheses: '1' } },
      { ...valid, formatVersion: 6 },
      { ...valid, formatVersion: 1 }
    ];
    for (const document of cases) {
      expect((await importService(storage, document).previewImportFromJson()).ok).toBe(false);
    }
    expect(storage.repositories.livingTheses.list()).toEqual([]);
  });
});

async function openStorage(filename?: string): Promise<SqliteStorage> {
  const storage = await createSqliteStorage({ filename });
  storages.add(storage);
  return storage;
}

function closeStorage(storage: SqliteStorage): void {
  storage.close();
  storages.delete(storage);
}

function importService(storage: SqliteStorage, document: unknown) {
  return createLocalDataStorageService({
    createStorage: async () => storage,
    createImportPreviewId: () => 'preview',
    getUserDataPath: () => '/unused',
    readTextFile: async () => JSON.stringify(document),
    showOpenDialog: async () => ({ canceled: false, filePaths: ['/unused/backup.json'] })
  });
}

function snapshot(storage: SqliteStorage): LocalDataExportDocument {
  return buildLocalDataExportDocument({
    exportedAt: timestamp,
    livingTheses: storage.repositories.livingTheses.list(),
    reviewSessions: storage.repositories.reviewSessions.list(),
    thesisRevisions: storage.repositories.thesisRevisions.list(),
    thesisDecisions: storage.repositories.thesisDecisions.list(),
    watchlistItems: storage.repositories.watchlistItems.list(),
    thesisNotes: storage.repositories.thesisNotes.list(),
    reminders: storage.repositories.reminders.list(),
    portfolioRankerItems: storage.repositories.portfolioRankerItems.list(),
    mbsScoreSnapshots: storage.repositories.mbsScoreSnapshots.list()
  });
}

function makeDocument(livingTheses: LivingThesis[]): LocalDataExportDocument {
  return buildLocalDataExportDocument({ exportedAt: timestamp, ...legacyDocument.data, livingTheses, reviewSessions: [], thesisRevisions: [], thesisDecisions: [] });
}

function makeThesis(id: string, overrides: Partial<LivingThesis> = {}): LivingThesis {
  return {
    id, version: 1, ticker: 'EXM', entityName: 'Example Systems',
    title: 'Research thesis', theme: 'Infrastructure', summary: 'Evidence to review.',
    bullCase: 'Durable demand.', bearCase: 'New competitors.', lifecycle: 'active',
    conviction: 'medium', riskLevel: 'high', reviewCadenceDays: 30,
    nextReviewAt: '2026-10-08', createdAt: timestamp, updatedAt: timestamp,
    risks: [{ id: `risk-${id}`, thesisId: id, title: 'Concentration', detail: 'Monitor customers.',
      status: 'retired', severity: 'high', createdAt: timestamp, updatedAt: timestamp }],
    catalysts: [{ id: `catalyst-${id}`, thesisId: id, title: 'Product launch', detail: 'Check adoption.',
      status: 'observed', createdAt: timestamp, updatedAt: timestamp }],
    ...overrides
  };
}

function invalidThesisCases(): Array<[string, Record<string, unknown>, string]> {
  const thesis = makeThesis('one');
  return [
    ['zero version', { version: 0 }, 'version'],
    ['fractional version', { version: 1.5 }, 'version'],
    ['text version', { version: '1' }, 'version'],
    ['null entity name', { entityName: null }, 'entityName'],
    ['blank summary', { summary: ' ' }, 'summary'],
    ['unknown lifecycle', { lifecycle: 'missing' }, 'lifecycle'],
    ['unknown conviction', { conviction: 'certain' }, 'conviction'],
    ['unknown risk level', { riskLevel: 'extreme' }, 'risk level'],
    ['invalid timestamp', { updatedAt: 'yesterday' }, 'timestamp'],
    ['invalid review date', { nextReviewAt: '2026-02-30' }, 'review date'],
    ['invalid archive timestamp', { archivedAt: 'yesterday' }, 'timestamp'],
    ['invalid review cadence', { reviewCadenceDays: -1 }, 'cadence'],
    ['object optional text', { theme: {} }, 'theme'],
    ['missing risks', { risks: undefined }, 'risks'],
    ['null risk', { risks: [null] }, 'object'],
    ['non-array catalysts', { catalysts: {} }, 'array'],
    ['wrong risk parent', { risks: [{ ...thesis.risks[0], thesisId: 'other' }] }, 'parent'],
    ['wrong catalyst parent', { catalysts: [{ ...thesis.catalysts[0], thesisId: 'other' }] }, 'parent'],
    ['invalid risk status', { risks: [{ ...thesis.risks[0], status: 'maybe' }] }, 'status'],
    ['invalid catalyst timestamp', { catalysts: [{ ...thesis.catalysts[0], createdAt: 'bad' }] }, 'timestamp'],
    ['child ID shared by risk and catalyst', { catalysts: [{ ...thesis.catalysts[0], id: thesis.risks[0].id }] }, 'unique']
  ];
}

// Historical version 1 shape, independent of the version 2 export builder.
const legacyDocument = {
  format: 'thesis-investing-local-data-export', formatVersion: 1,
  appName: 'Thesis Investing', exportedAt: timestamp, storageAdapter: 'node:sqlite',
  counts: { watchlistItems: 1, thesisNotes: 1, reminders: 1, portfolioRankerItems: 1, mbsScoreSnapshots: 1 },
  data: {
    watchlistItems: [{ id: 'watch-one', ticker: 'EXM', thesisNoteId: 'note-one' }],
    thesisNotes: [{ id: 'note-one', title: 'Legacy note', body: 'Research notes.', status: 'active' as const }],
    reminders: [{ id: 'reminder-one', title: 'Review', dueDate: '2026-10-08', type: 'thesis-review' as const }],
    portfolioRankerItems: [{ id: 'ranker-one', ticker: 'EXM', manualScore: 50 }],
    mbsScoreSnapshots: [{ id: 'score-one', thesisId: 'note-one', score: 50, maxScore: 100,
      percentage: 50, rating: 'mixed' as const, completedCriteria: 7,
      input: { balanceSheet: 5, businessQuality: 5, growth: 5, management: 5, moat: 5, risk: 5, valuation: 5 } }]
  }
};

function seedLegacyRecords(storage: SqliteStorage): void {
  const data = legacyDocument.data;
  expect(storage.repositories.thesisNotes.create(data.thesisNotes[0]).ok).toBe(true);
  expect(storage.repositories.watchlistItems.create(data.watchlistItems[0]).ok).toBe(true);
  expect(storage.repositories.reminders.create(data.reminders[0]).ok).toBe(true);
  expect(storage.repositories.portfolioRankerItems.create(data.portfolioRankerItems[0]).ok).toBe(true);
  expect(storage.repositories.mbsScoreSnapshots.create(data.mbsScoreSnapshots[0]).ok).toBe(true);
}
