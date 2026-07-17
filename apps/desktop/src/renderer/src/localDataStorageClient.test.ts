import { describe, expect, it } from 'vitest';

import type { LocalDataStorageApi } from '../../shared/localDataStorage';
import { getDefaultLocalDataStorageClient } from './localDataStorageClient';

describe('localDataStorageClient', () => {
  it('returns null when the preload local data API is unavailable', () => {
    expect(getDefaultLocalDataStorageClient()).toBeNull();
  });

  it('returns the narrow preload local data API when available', () => {
    const localDataApi: LocalDataStorageApi = {
      exportToJson: async () => ({ ok: true, value: { status: 'canceled' } }),
      get: async () => ({
        ok: true,
        value: {
          databaseFileExists: true,
          databasePath: 'C:\\Users\\Test\\thesis-investing.sqlite',
          generatedAt: '2026-06-10T12:00:00.000Z',
          localOnlyItems: [],
          persistedWorkflows: [],
          recordCounts: {
            mbsScoreSnapshots: 0,
            portfolioRankerItems: 0,
            reminders: 0,
            thesisNotes: 0,
            watchlistItems: 0
          },
          storageAdapter: 'node:sqlite',
          userDataPath: 'C:\\Users\\Test'
        }
      }),
      importFromJson: async () => ({
        ok: true,
        value: {
          status: 'completed',
          imported: {
            mbsScoreSnapshots: 0,
            portfolioRankerItems: 0,
            reminders: 0,
            thesisNotes: 0,
            watchlistItems: 0
          },
          warnings: []
        }
      }),
      previewImportFromJson: async () => ({
        ok: true,
        value: { status: 'canceled' }
      }),
      openDataFolder: async () => ({
        ok: true,
        value: {
          folderPath: 'C:\\Users\\Test',
          status: 'opened'
        }
      })
    };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        thesisInvesting: {
          localData: localDataApi
        }
      }
    });

    expect(getDefaultLocalDataStorageClient()).toBe(localDataApi);
    expect(Object.keys(localDataApi).sort()).toEqual([
      'exportToJson',
      'get',
      'importFromJson',
      'openDataFolder',
      'previewImportFromJson'
    ]);

    Reflect.deleteProperty(globalThis, 'window');
  });
});
