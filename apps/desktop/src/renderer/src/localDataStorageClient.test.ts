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
          storageAdapter: 'node:sqlite',
          userDataPath: 'C:\\Users\\Test'
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

    Reflect.deleteProperty(globalThis, 'window');
  });
});
