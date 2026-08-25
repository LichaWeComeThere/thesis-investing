import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { LocalDataExportDocument } from '../shared/localDataStorage';
import { createSqliteStorage } from '../storage/sqlite';
import {
  buildLocalDataExportDocument,
  createLocalDataStorageService
} from './localDataStorageService';

describe('localDataStorageService', () => {
  it('returns read-only local data status', async () => {
    const service = createLocalDataStorageService({
      createStorage: () => createSqliteStorage(),
      databaseFileExists: () => true,
      getUserDataPath: () => '/tmp/thesis-user-data',
      now: () => new Date('2026-06-10T12:00:00.000Z')
    });

    const result = await service.get();

    expect(result).toEqual({
      ok: true,
      value: {
        databaseFileExists: true,
        databasePath: join('/tmp/thesis-user-data', 'thesis-investing.sqlite'),
        generatedAt: '2026-06-10T12:00:00.000Z',
        localOnlyItems: [
          'Theme Baskets are static local content',
          'Selected route, filters, search, and sort controls',
          'In-progress form drafts unless explicitly saved',
          'Onboarding completion currently uses localStorage'
        ],
        persistedWorkflows: [
          'Watchlist',
          'Thesis Notes',
          'Reminders',
          'Portfolio Ranker Inputs',
          'MBS Score Snapshots',
          'Living Thesis records',
          'Dashboard summaries read persisted local data'
        ],
        recordCounts: emptyCounts,
        storageAdapter: 'node:sqlite',
        userDataPath: '/tmp/thesis-user-data'
      }
    });

    await service.close();
  });

  it('returns persisted record counts when the local database exists', async () => {
    const storage = await createSqliteStorage();
    const service = createLocalDataStorageService({
      createStorage: () => Promise.resolve(storage),
      databaseFileExists: () => true,
      getUserDataPath: () => '/tmp/thesis-user-data',
      now: () => new Date('2026-06-10T12:00:00.000Z')
    });

    storage.repositories.watchlistItems.create({
      id: 'watchlist_msft',
      ticker: 'msft'
    });
    storage.repositories.thesisNotes.create({
      body: 'Local thesis body.',
      id: 'thesis_msft',
      status: 'active',
      title: 'Microsoft thesis'
    });
    storage.repositories.reminders.create({
      dueDate: '2026-06-30',
      id: 'reminder_msft',
      title: 'Review Microsoft thesis',
      type: 'thesis-review'
    });
    storage.repositories.portfolioRankerItems.create({
      id: 'ranker_msft',
      ticker: 'msft'
    });
    storage.repositories.mbsScoreSnapshots.create({
      completedCriteria: 7,
      id: 'score_msft',
      input: {
        balanceSheet: 8,
        businessQuality: 9,
        growth: 7,
        management: 8,
        moat: 9,
        risk: 7,
        valuation: 6
      },
      maxScore: 100,
      percentage: 77.1,
      rating: 'strong',
      score: 77.1
    });

    await expect(service.get()).resolves.toMatchObject({
      ok: true,
      value: {
        recordCounts: populatedCounts
      }
    });

    await service.close();
  });

  it('returns zero counts without opening storage when the database is missing', async () => {
    let createStorageWasCalled = false;
    const service = createLocalDataStorageService({
      createStorage: async () => {
        createStorageWasCalled = true;
        return createSqliteStorage();
      },
      databaseFileExists: () => false,
      getUserDataPath: () => '/tmp/thesis-user-data'
    });

    await expect(service.get()).resolves.toMatchObject({
      ok: true,
      value: {
        databaseFileExists: false,
        recordCounts: emptyCounts
      }
    });
    expect(createStorageWasCalled).toBe(false);
  });

  it('returns storage errors without throwing', async () => {
    const service = createLocalDataStorageService({
      getUserDataPath: () => {
        throw new Error('Unable to read app data path.');
      }
    });

    await expect(service.get()).resolves.toEqual({
      ok: false,
      errors: ['Unable to read app data path.']
    });
  });

  it('opens only the trusted local data folder path', async () => {
    let openedPath = '';
    const service = createLocalDataStorageService({
      getUserDataPath: () => '/tmp/thesis-user-data',
      openPath: async (path) => {
        openedPath = path;
        return '';
      }
    });

    await expect(service.openDataFolder()).resolves.toEqual({
      ok: true,
      value: {
        folderPath: '/tmp/thesis-user-data',
        status: 'opened'
      }
    });
    expect(openedPath).toBe('/tmp/thesis-user-data');
  });

  it('returns open folder errors without throwing', async () => {
    const service = createLocalDataStorageService({
      getUserDataPath: () => '/tmp/thesis-user-data',
      openPath: async () => 'Access denied.'
    });

    await expect(service.openDataFolder()).resolves.toEqual({
      ok: false,
      errors: ['Unable to open the local data folder: Access denied.']
    });
  });

  it('exports an empty local data JSON document with metadata and counts', async () => {
    let writtenFilePath = '';
    let writtenContents = '';
    const service = createLocalDataStorageService({
      appVersion: '0.0.0-test',
      createStorage: () => createSqliteStorage(),
      getUserDataPath: () => '/tmp/thesis-user-data',
      now: () => new Date('2026-06-10T12:00:00.000Z'),
      showSaveDialog: async (options) => {
        expect(options.defaultPath).toBe(
          'thesis-investing-local-data-export-2026-06-10_12-00-00-000.json'
        );
        expect(options.filters).toEqual([
          { extensions: ['json'], name: 'JSON files' }
        ]);

        return {
          canceled: false,
          filePath: '/tmp/thesis-export.json'
        };
      },
      writeTextFile: async (filePath, contents) => {
        writtenFilePath = filePath;
        writtenContents = contents;
      }
    });

    await expect(service.exportToJson()).resolves.toEqual({
      ok: true,
      value: {
        status: 'completed',
        counts: {
          mbsScoreSnapshots: 0,
          portfolioRankerItems: 0,
          reminders: 0,
          thesisNotes: 0,
          watchlistItems: 0
        },
        exportedAt: '2026-06-10T12:00:00.000Z',
        filePath: '/tmp/thesis-export.json'
      }
    });

    expect(writtenFilePath).toBe('/tmp/thesis-export.json');
    expect(JSON.parse(writtenContents)).toEqual({
      format: 'thesis-investing-local-data-export',
      formatVersion: 1,
      appName: 'Thesis Investing',
      appVersion: '0.0.0-test',
      exportedAt: '2026-06-10T12:00:00.000Z',
      storageAdapter: 'node:sqlite',
      counts: {
        mbsScoreSnapshots: 0,
        portfolioRankerItems: 0,
        reminders: 0,
        thesisNotes: 0,
        watchlistItems: 0
      },
      data: {
        mbsScoreSnapshots: [],
        portfolioRankerItems: [],
        reminders: [],
        thesisNotes: [],
        watchlistItems: []
      }
    });

    await service.close();
  });

  it('exports persisted local workflow records without mutating them', async () => {
    const storage = await createSqliteStorage();
    let writtenContents = '';
    const service = createLocalDataStorageService({
      appVersion: '0.0.0-test',
      createStorage: () => Promise.resolve(storage),
      getUserDataPath: () => '/tmp/thesis-user-data',
      now: () => new Date('2026-06-10T12:00:00.000Z'),
      showSaveDialog: async () => ({
        canceled: false,
        filePath: '/tmp/thesis-export.json'
      }),
      writeTextFile: async (_filePath, contents) => {
        writtenContents = contents;
      }
    });

    storage.repositories.watchlistItems.create({
      companyName: 'Microsoft',
      id: 'watchlist_msft',
      note: 'Local watchlist note.',
      tags: ['software'],
      ticker: 'msft'
    });
    storage.repositories.thesisNotes.create({
      body: 'Local thesis body.',
      id: 'thesis_msft',
      status: 'active',
      ticker: 'msft',
      title: 'Microsoft thesis'
    });
    storage.repositories.reminders.create({
      dueDate: '2026-06-30',
      id: 'reminder_msft',
      title: 'Review Microsoft thesis',
      type: 'thesis-review'
    });
    storage.repositories.portfolioRankerItems.create({
      companyName: 'Microsoft',
      id: 'ranker_msft',
      manualScore: 86,
      notes: 'Durable local score.',
      ticker: 'msft'
    });
    storage.repositories.mbsScoreSnapshots.create({
      companyName: 'Microsoft',
      completedCriteria: 7,
      createdAt: '2026-06-09',
      id: 'score_msft',
      input: {
        balanceSheet: 8,
        businessQuality: 9,
        growth: 7,
        management: 8,
        moat: 9,
        risk: 7,
        valuation: 6
      },
      maxScore: 100,
      percentage: 77.1,
      rating: 'strong',
      score: 77.1,
      ticker: 'msft'
    });

    await expect(service.exportToJson()).resolves.toMatchObject({
      ok: true,
      value: {
        status: 'completed',
        counts: {
          mbsScoreSnapshots: 1,
          portfolioRankerItems: 1,
          reminders: 1,
          thesisNotes: 1,
          watchlistItems: 1
        }
      }
    });

    const exported = JSON.parse(writtenContents);
    expect(exported.data.watchlistItems).toEqual([
      {
        companyName: 'Microsoft',
        id: 'watchlist_msft',
        note: 'Local watchlist note.',
        tags: ['software'],
        ticker: 'MSFT'
      }
    ]);
    expect(exported.data.thesisNotes).toHaveLength(1);
    expect(exported.data.reminders).toHaveLength(1);
    expect(exported.data.portfolioRankerItems).toHaveLength(1);
    expect(exported.data.mbsScoreSnapshots).toHaveLength(1);
    expect(storage.repositories.watchlistItems.list()).toHaveLength(1);
    expect(storage.repositories.mbsScoreSnapshots.list()).toHaveLength(1);

    await service.close();
  });

  it('returns a canceled export result without writing a file', async () => {
    let writeWasCalled = false;
    const service = createLocalDataStorageService({
      createStorage: () => createSqliteStorage(),
      getUserDataPath: () => '/tmp/thesis-user-data',
      showSaveDialog: async () => ({ canceled: true }),
      writeTextFile: async () => {
        writeWasCalled = true;
      }
    });

    await expect(service.exportToJson()).resolves.toEqual({
      ok: true,
      value: { status: 'canceled' }
    });
    expect(writeWasCalled).toBe(false);

    await service.close();
  });

  it('returns file write errors without throwing', async () => {
    const service = createLocalDataStorageService({
      createStorage: () => createSqliteStorage(),
      getUserDataPath: () => '/tmp/thesis-user-data',
      showSaveDialog: async () => ({
        canceled: false,
        filePath: '/tmp/not-writable/thesis-export.json'
      }),
      writeTextFile: async () => {
        throw new Error('Unable to write export file.');
      }
    });

    await expect(service.exportToJson()).resolves.toEqual({
      ok: false,
      errors: ['Unable to write export file.']
    });

    await service.close();
  });

  it('previews a valid import without mutating storage', async () => {
    const storage = await createSqliteStorage();
    const service = createImportService(storage, createPopulatedExport());

    await expect(service.previewImportFromJson()).resolves.toEqual({
      ok: true,
      value: {
        status: 'ready',
        preview: {
          counts: populatedCounts,
          exportedAt: '2026-06-10T12:00:00.000Z',
          fileName: 'thesis-export.json',
          formatVersion: 1,
          previewId: 'preview-test',
          warnings: []
        }
      }
    });
    expect(storage.repositories.watchlistItems.list()).toEqual([]);
    expect(storage.repositories.thesisNotes.list()).toEqual([]);
    expect(storage.repositories.reminders.list()).toEqual([]);
    expect(storage.repositories.portfolioRankerItems.list()).toEqual([]);
    expect(storage.repositories.mbsScoreSnapshots.list()).toEqual([]);

    await service.close();
  });

  it('imports a valid export only after confirmation', async () => {
    const storage = await createSqliteStorage();
    const service = createImportService(storage, createPopulatedExport());

    await service.previewImportFromJson();
    await expect(service.importFromJson('preview-test')).resolves.toEqual({
      ok: true,
      value: {
        status: 'completed',
        imported: populatedCounts,
        warnings: []
      }
    });

    expect(storage.repositories.watchlistItems.list()).toMatchObject([
      { id: 'watchlist_msft', ticker: 'MSFT', thesisNoteId: 'thesis_msft' }
    ]);
    expect(storage.repositories.thesisNotes.list()).toHaveLength(1);
    expect(storage.repositories.reminders.list()).toHaveLength(1);
    expect(storage.repositories.portfolioRankerItems.list()).toHaveLength(1);
    expect(storage.repositories.mbsScoreSnapshots.list()).toMatchObject([
      { id: 'score_msft', thesisId: 'thesis_msft', ticker: 'MSFT' }
    ]);
    await expect(service.importFromJson('preview-test')).resolves.toEqual({
      ok: false,
      errors: [
        'Import preview is no longer available. Select the file again.'
      ]
    });

    await service.close();
  });

  it('imports an empty export without changing storage', async () => {
    const storage = await createSqliteStorage();
    const service = createImportService(storage, createEmptyExport());

    await expect(service.previewImportFromJson()).resolves.toMatchObject({
      ok: true,
      value: {
        status: 'ready',
        preview: {
          counts: emptyCounts,
          warnings: ['This export contains no persisted records to import.']
        }
      }
    });
    await expect(service.importFromJson('preview-test')).resolves.toEqual({
      ok: true,
      value: {
        status: 'completed',
        imported: emptyCounts,
        warnings: ['This export contains no persisted records to import.']
      }
    });
    expect(storage.repositories.watchlistItems.list()).toEqual([]);

    await service.close();
  });

  it('rejects invalid JSON without creating a preview', async () => {
    const storage = await createSqliteStorage();
    const service = createImportService(storage, '{not-json');

    await expect(service.previewImportFromJson()).resolves.toEqual({
      ok: false,
      errors: ['The selected file is not valid JSON.']
    });
    expect(storage.repositories.watchlistItems.list()).toEqual([]);

    await service.close();
  });

  it('rejects the wrong export format and unsupported versions', async () => {
    const storage = await createSqliteStorage();
    const wrongFormat = {
      ...createEmptyExport(),
      format: 'unrelated-export'
    };
    const wrongFormatService = createImportService(storage, wrongFormat);

    await expect(
      wrongFormatService.previewImportFromJson()
    ).resolves.toEqual({
      ok: false,
      errors: [
        'The selected file is not a Thesis Investing local data export.'
      ]
    });
    await wrongFormatService.close();

    const versionStorage = await createSqliteStorage();
    const unsupportedVersion = {
      ...createEmptyExport(),
      formatVersion: 2
    };
    const versionService = createImportService(
      versionStorage,
      unsupportedVersion
    );

    await expect(versionService.previewImportFromJson()).resolves.toEqual({
      ok: false,
      errors: ['Unsupported local data export format version: 2.']
    });
    await versionService.close();
  });

  it('rejects missing or invalid export data arrays', async () => {
    const storage = await createSqliteStorage();
    const invalidDocument = createEmptyExport() as unknown as Record<
      string,
      unknown
    >;
    invalidDocument.data = {
      watchlistItems: 'not-an-array'
    };
    const service = createImportService(storage, invalidDocument);

    const result = await service.previewImportFromJson();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        'Export data watchlistItems must be an array.'
      );
      expect(result.errors).toContain(
        'Export data thesisNotes must be an array.'
      );
    }

    await service.close();
  });

  it('returns a clean canceled import without reading or writing', async () => {
    let readWasCalled = false;
    const storage = await createSqliteStorage();
    const service = createLocalDataStorageService({
      createStorage: () => Promise.resolve(storage),
      getUserDataPath: () => '/tmp/thesis-user-data',
      readTextFile: async () => {
        readWasCalled = true;
        return '';
      },
      showOpenDialog: async () => ({ canceled: true, filePaths: [] })
    });

    await expect(service.previewImportFromJson()).resolves.toEqual({
      ok: true,
      value: { status: 'canceled' }
    });
    expect(readWasCalled).toBe(false);
    expect(storage.repositories.watchlistItems.list()).toEqual([]);

    await service.close();
  });

  it('requires the current preview ID before importing', async () => {
    const storage = await createSqliteStorage();
    const service = createImportService(storage, createPopulatedExport());

    await service.previewImportFromJson();
    await expect(service.importFromJson('wrong-preview')).resolves.toEqual({
      ok: false,
      errors: [
        'Import preview is no longer available. Select the file again.'
      ]
    });
    expect(storage.repositories.watchlistItems.list()).toEqual([]);

    await service.close();
  });

  it('appends colliding records with remapped IDs and preserves originals', async () => {
    const storage = await createSqliteStorage();
    seedCollidingRecords(storage);
    const service = createImportService(storage, createPopulatedExport());

    await expect(service.previewImportFromJson()).resolves.toMatchObject({
      ok: true,
      value: {
        status: 'ready',
        preview: {
          warnings: [
            '5 imported record IDs already exist and will be remapped. Existing records will not be changed.'
          ]
        }
      }
    });
    await service.importFromJson('preview-test');

    expect(storage.repositories.thesisNotes.getById('thesis_msft')).toMatchObject(
      { title: 'Existing thesis' }
    );
    expect(
      storage.repositories.thesisNotes.getById('thesis_msft-import-1')
    ).toMatchObject({ title: 'Microsoft thesis' });
    expect(
      storage.repositories.watchlistItems.getById('watchlist_msft-import-1')
    ).toMatchObject({ thesisNoteId: 'thesis_msft-import-1' });
    expect(
      storage.repositories.mbsScoreSnapshots.getById('score_msft-import-1')
    ).toMatchObject({ thesisId: 'thesis_msft-import-1' });
    expect(storage.repositories.watchlistItems.list()).toHaveLength(2);
    expect(storage.repositories.thesisNotes.list()).toHaveLength(2);
    expect(storage.repositories.reminders.list()).toHaveLength(2);
    expect(storage.repositories.portfolioRankerItems.list()).toHaveLength(2);
    expect(storage.repositories.mbsScoreSnapshots.list()).toHaveLength(2);

    await service.close();
  });
});

const emptyCounts = {
  mbsScoreSnapshots: 0,
  portfolioRankerItems: 0,
  reminders: 0,
  thesisNotes: 0,
  watchlistItems: 0
};

const populatedCounts = {
  mbsScoreSnapshots: 1,
  portfolioRankerItems: 1,
  reminders: 1,
  thesisNotes: 1,
  watchlistItems: 1
};

function createEmptyExport(): LocalDataExportDocument {
  return buildLocalDataExportDocument({
    exportedAt: '2026-06-10T12:00:00.000Z',
    mbsScoreSnapshots: [],
    portfolioRankerItems: [],
    reminders: [],
    thesisNotes: [],
    watchlistItems: []
  });
}

function createPopulatedExport(): LocalDataExportDocument {
  return buildLocalDataExportDocument({
    exportedAt: '2026-06-10T12:00:00.000Z',
    mbsScoreSnapshots: [
      {
        companyName: 'Microsoft',
        completedCriteria: 7,
        createdAt: '2026-06-09',
        id: 'score_msft',
        input: {
          balanceSheet: 8,
          businessQuality: 9,
          growth: 7,
          management: 8,
          moat: 9,
          risk: 7,
          valuation: 6
        },
        maxScore: 100,
        percentage: 77.1,
        rating: 'strong',
        score: 77.1,
        thesisId: 'thesis_msft',
        ticker: 'msft'
      }
    ],
    portfolioRankerItems: [
      {
        companyName: 'Microsoft',
        id: 'ranker_msft',
        manualScore: 86,
        notes: 'Durable local score.',
        ticker: 'msft'
      }
    ],
    reminders: [
      {
        dueDate: '2026-06-30',
        id: 'reminder_msft',
        title: 'Review Microsoft thesis',
        type: 'thesis-review'
      }
    ],
    thesisNotes: [
      {
        body: 'Local thesis body.',
        id: 'thesis_msft',
        status: 'active',
        ticker: 'msft',
        title: 'Microsoft thesis'
      }
    ],
    watchlistItems: [
      {
        companyName: 'Microsoft',
        id: 'watchlist_msft',
        note: 'Local watchlist note.',
        tags: ['software'],
        thesisNoteId: 'thesis_msft',
        ticker: 'msft'
      }
    ]
  });
}

function createImportService(
  storage: Awaited<ReturnType<typeof createSqliteStorage>>,
  document: LocalDataExportDocument | Record<string, unknown> | string
) {
  return createLocalDataStorageService({
    createImportPreviewId: () => 'preview-test',
    createStorage: () => Promise.resolve(storage),
    getUserDataPath: () => '/tmp/thesis-user-data',
    readTextFile: async () =>
      typeof document === 'string' ? document : JSON.stringify(document),
    showOpenDialog: async () => ({
      canceled: false,
      filePaths: ['/tmp/thesis-export.json']
    })
  });
}

function seedCollidingRecords(
  storage: Awaited<ReturnType<typeof createSqliteStorage>>
): void {
  storage.repositories.thesisNotes.create({
    body: 'Existing body.',
    id: 'thesis_msft',
    status: 'active',
    title: 'Existing thesis'
  });
  storage.repositories.watchlistItems.create({
    id: 'watchlist_msft',
    ticker: 'AAPL'
  });
  storage.repositories.reminders.create({
    dueDate: '2026-07-01',
    id: 'reminder_msft',
    title: 'Existing reminder',
    type: 'custom'
  });
  storage.repositories.portfolioRankerItems.create({
    id: 'ranker_msft',
    ticker: 'AAPL'
  });
  storage.repositories.mbsScoreSnapshots.create({
    completedCriteria: 7,
    id: 'score_msft',
    input: {
      balanceSheet: 5,
      businessQuality: 5,
      growth: 5,
      management: 5,
      moat: 5,
      risk: 5,
      valuation: 5
    },
    maxScore: 100,
    percentage: 50,
    rating: 'mixed',
    score: 50
  });
}
