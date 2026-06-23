import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type {
  LocalDataExportCounts,
  LocalDataExportDocument,
  LocalDataExportOutcome,
  LocalDataInfo,
  LocalDataStorageResult
} from '../shared/localDataStorage';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';

const DATABASE_FILENAME = 'thesis-investing.sqlite';
const EXPORT_FORMAT = 'thesis-investing-local-data-export';
const EXPORT_FORMAT_VERSION = 1;

export type LocalDataExportStorageFactory = () => Promise<SqliteStorage>;
export type LocalDataSaveDialogResult = {
  canceled: boolean;
  filePath?: string;
};
export type LocalDataSaveDialog = (options: {
  defaultPath: string;
  filters: Array<{ extensions: string[]; name: string }>;
  properties: Array<'createDirectory' | 'showOverwriteConfirmation'>;
  title: string;
}) => Promise<LocalDataSaveDialogResult>;
export type LocalDataWriteTextFile = (
  filePath: string,
  contents: string
) => Promise<void>;

export type LocalDataStorageServiceOptions = {
  appVersion?: string;
  createStorage?: LocalDataExportStorageFactory;
  databaseFileExists?: (databasePath: string) => boolean;
  databaseFilename?: string;
  getUserDataPath: () => string;
  now?: () => Date;
  showSaveDialog?: LocalDataSaveDialog;
  storageAdapter?: LocalDataInfo['storageAdapter'];
  writeTextFile?: LocalDataWriteTextFile;
};

export type LocalDataStorageService = {
  close(): Promise<void>;
  exportToJson(): Promise<LocalDataStorageResult<LocalDataExportOutcome>>;
  get(): Promise<LocalDataStorageResult<LocalDataInfo>>;
};

export function createLocalDataStorageService({
  appVersion,
  createStorage,
  databaseFileExists = existsSync,
  databaseFilename = DATABASE_FILENAME,
  getUserDataPath,
  now = () => new Date(),
  showSaveDialog,
  storageAdapter = 'node:sqlite',
  writeTextFile = writeFile
}: LocalDataStorageServiceOptions): LocalDataStorageService {
  let storagePromise: Promise<SqliteStorage> | null = null;

  async function getExportStorage(): Promise<SqliteStorage> {
    if (!createStorage) {
      throw new Error('Local data export storage is unavailable.');
    }

    storagePromise ??= createStorage().catch((error: unknown) => {
      storagePromise = null;
      throw error;
    });

    return storagePromise;
  }

  return {
    async close() {
      if (!storagePromise) {
        return;
      }

      try {
        const storage = await storagePromise;
        storage.close();
      } finally {
        storagePromise = null;
      }
    },
    async exportToJson() {
      return runStorageOperation(async () => {
        if (!showSaveDialog) {
          return failure(['Local data export dialog is unavailable.']);
        }

        const exportedAt = now().toISOString();
        const saveResult = await showSaveDialog({
          defaultPath: createDefaultExportFilename(exportedAt),
          filters: [{ extensions: ['json'], name: 'JSON files' }],
          properties: ['createDirectory', 'showOverwriteConfirmation'],
          title: 'Export local Thesis Investing data'
        });

        if (saveResult.canceled || !saveResult.filePath) {
          return success({ status: 'canceled' });
        }

        const storage = await getExportStorage();
        const exportDocument = buildLocalDataExportDocument({
          appVersion,
          exportedAt,
          mbsScoreSnapshots: storage.repositories.mbsScoreSnapshots.list(),
          portfolioRankerItems:
            storage.repositories.portfolioRankerItems.list(),
          reminders: storage.repositories.reminders.list(),
          storageAdapter,
          thesisNotes: storage.repositories.thesisNotes.list(),
          watchlistItems: storage.repositories.watchlistItems.list()
        });

        await writeTextFile(
          saveResult.filePath,
          `${JSON.stringify(exportDocument, null, 2)}\n`
        );

        return success({
          status: 'completed',
          counts: exportDocument.counts,
          exportedAt,
          filePath: saveResult.filePath
        });
      });
    },
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

export function createSqliteLocalDataStorageService({
  appVersion,
  databaseFilename = DATABASE_FILENAME,
  getUserDataPath,
  showSaveDialog
}: Pick<
  LocalDataStorageServiceOptions,
  'appVersion' | 'databaseFilename' | 'getUserDataPath' | 'showSaveDialog'
>): LocalDataStorageService {
  return createLocalDataStorageService({
    appVersion,
    createStorage: () => {
      const databaseFile = join(getUserDataPath(), databaseFilename);
      mkdirSync(dirname(databaseFile), { recursive: true });
      return createSqliteStorage({ filename: databaseFile });
    },
    databaseFilename,
    getUserDataPath,
    showSaveDialog
  });
}

type LocalDataExportDocumentInput = LocalDataExportDocument['data'] & {
  appVersion?: string;
  exportedAt: string;
  storageAdapter?: LocalDataInfo['storageAdapter'];
};

export function buildLocalDataExportDocument({
  appVersion,
  exportedAt,
  mbsScoreSnapshots,
  portfolioRankerItems,
  reminders,
  storageAdapter = 'node:sqlite',
  thesisNotes,
  watchlistItems
}: LocalDataExportDocumentInput): LocalDataExportDocument {
  const counts: LocalDataExportCounts = {
    watchlistItems: watchlistItems.length,
    thesisNotes: thesisNotes.length,
    reminders: reminders.length,
    portfolioRankerItems: portfolioRankerItems.length,
    mbsScoreSnapshots: mbsScoreSnapshots.length
  };

  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    appName: 'Thesis Investing',
    appVersion,
    exportedAt,
    storageAdapter,
    counts,
    data: {
      watchlistItems,
      thesisNotes,
      reminders,
      portfolioRankerItems,
      mbsScoreSnapshots
    }
  };
}

function createDefaultExportFilename(exportedAt: string): string {
  const timestamp = exportedAt
    .replaceAll(':', '-')
    .replaceAll('.', '-')
    .replace('T', '_')
    .replace('Z', '');

  return `thesis-investing-local-data-export-${timestamp}.json`;
}

async function runStorageOperation<T>(
  operation: () => Promise<LocalDataStorageResult<T>>
): Promise<LocalDataStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return failure([
      error instanceof Error ? error.message : 'Unknown local data export error.'
    ]);
  }
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
