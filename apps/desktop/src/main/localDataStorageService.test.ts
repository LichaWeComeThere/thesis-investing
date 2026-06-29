import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createSqliteStorage } from '../storage/sqlite';
import { createLocalDataStorageService } from './localDataStorageService';

describe('localDataStorageService', () => {
  it('returns read-only local data status', async () => {
    const service = createLocalDataStorageService({
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
          'Dashboard summaries read persisted local data'
        ],
        storageAdapter: 'node:sqlite',
        userDataPath: '/tmp/thesis-user-data'
      }
    });
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
});
