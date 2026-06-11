import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type {
  LocalDataInfo,
  LocalDataStorageResult
} from '../shared/localDataStorage';

const DATABASE_FILENAME = 'thesis-investing.sqlite';

export type LocalDataStorageServiceOptions = {
  databaseFileExists?: (databasePath: string) => boolean;
  databaseFilename?: string;
  getUserDataPath: () => string;
  now?: () => Date;
  storageAdapter?: LocalDataInfo['storageAdapter'];
};

export type LocalDataStorageService = {
  get(): Promise<LocalDataStorageResult<LocalDataInfo>>;
};

export function createLocalDataStorageService({
  databaseFileExists = existsSync,
  databaseFilename = DATABASE_FILENAME,
  getUserDataPath,
  now = () => new Date(),
  storageAdapter = 'node:sqlite'
}: LocalDataStorageServiceOptions): LocalDataStorageService {
  return {
    async get() {
      try {
        const userDataPath = getUserDataPath();
        const databasePath = join(userDataPath, databaseFilename);

        return success({
          databaseFileExists: databaseFileExists(databasePath),
          databasePath,
          generatedAt: now().toISOString(),
          localOnlyItems: getLocalOnlyItems(),
          persistedWorkflows: getPersistedWorkflows(),
          storageAdapter,
          userDataPath
        });
      } catch (error) {
        return failure([
          error instanceof Error
            ? error.message
            : 'Unknown local data status error.'
        ]);
      }
    }
  };
}

function getPersistedWorkflows(): string[] {
  return [
    'Watchlist',
    'Thesis Notes',
    'Reminders',
    'Portfolio Ranker Inputs',
    'MBS Score Snapshots',
    'Dashboard summaries read persisted local data'
  ];
}

function getLocalOnlyItems(): string[] {
  return [
    'Theme Baskets are static local content',
    'Selected route, filters, search, and sort controls',
    'In-progress form drafts unless explicitly saved',
    'Onboarding completion currently uses localStorage'
  ];
}

function success<T>(value: T): LocalDataStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): LocalDataStorageResult<T> {
  return { ok: false, errors };
}
