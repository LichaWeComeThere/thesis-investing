import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
});
