import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import type {
  LocalDataExportCounts,
  LocalDataExportDocument,
  LocalDataExportOutcome,
  LocalDataInfo,
  LocalDataImportOutcome,
  LocalDataOpenFolderOutcome,
  LocalDataImportPreviewOutcome,
  LocalDataStorageResult
} from '../shared/localDataStorage';
import {
  LOCAL_DATA_EXPORT_FORMAT,
  LOCAL_DATA_EXPORT_FORMAT_VERSION
} from '../shared/localDataStorage';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import {
  appendLocalDataImport,
  getLocalDataImportWarnings,
  parseLocalDataImportDocument
} from './localDataImport';

const DATABASE_FILENAME = 'thesis-investing.sqlite';

export type LocalDataStorageFactory = () => Promise<SqliteStorage>;
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
export type LocalDataOpenDialogResult = {
  canceled: boolean;
  filePaths: string[];
};
export type LocalDataOpenDialog = (options: {
  filters: Array<{ extensions: string[]; name: string }>;
  properties: Array<'openFile'>;
  title: string;
}) => Promise<LocalDataOpenDialogResult>;
export type LocalDataReadTextFile = (filePath: string) => Promise<string>;
export type LocalDataWriteTextFile = (
  filePath: string,
  contents: string
) => Promise<void>;
export type LocalDataOpenPath = (path: string) => Promise<string>;

export type LocalDataStorageServiceOptions = {
  appVersion?: string;
  createImportPreviewId?: () => string;
  createStorage?: LocalDataStorageFactory;
  databaseFileExists?: (databasePath: string) => boolean;
  databaseFilename?: string;
  getUserDataPath: () => string;
  now?: () => Date;
  openPath?: LocalDataOpenPath;
  readTextFile?: LocalDataReadTextFile;
  showOpenDialog?: LocalDataOpenDialog;
  showSaveDialog?: LocalDataSaveDialog;
  storageAdapter?: LocalDataInfo['storageAdapter'];
  writeTextFile?: LocalDataWriteTextFile;
};

export type LocalDataStorageService = {
  close(): Promise<void>;
  exportToJson(): Promise<LocalDataStorageResult<LocalDataExportOutcome>>;
  get(): Promise<LocalDataStorageResult<LocalDataInfo>>;
  importFromJson(
    previewId: string
  ): Promise<LocalDataStorageResult<LocalDataImportOutcome>>;
  openDataFolder(): Promise<LocalDataStorageResult<LocalDataOpenFolderOutcome>>;
  previewImportFromJson(): Promise<
    LocalDataStorageResult<LocalDataImportPreviewOutcome>
  >;
};

export function createLocalDataStorageService({
  appVersion,
  createImportPreviewId = randomUUID,
  createStorage,
  databaseFileExists = existsSync,
  databaseFilename = DATABASE_FILENAME,
  getUserDataPath,
  now = () => new Date(),
  openPath,
  readTextFile = (filePath) => readFile(filePath, 'utf8'),
  showOpenDialog,
  showSaveDialog,
  storageAdapter = 'node:sqlite',
  writeTextFile = writeFile
}: LocalDataStorageServiceOptions): LocalDataStorageService {
  let storagePromise: Promise<SqliteStorage> | null = null;
  let pendingImport: {
    document: LocalDataExportDocument;
    previewId: string;
  } | null = null;

  async function getStorage(): Promise<SqliteStorage> {
    if (!createStorage) {
      throw new Error('Local data storage is unavailable.');
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

        const storage = await getStorage();
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
        const databaseExists = databaseFileExists(databasePath);
        const recordCounts = databaseExists
          ? await getLocalDataRecordCounts(getStorage)
          : createEmptyLocalDataCounts();

        return success({
          databaseFileExists: databaseExists,
          databasePath,
          generatedAt: now().toISOString(),
          localOnlyItems: getLocalOnlyItems(),
          persistedWorkflows: getPersistedWorkflows(),
          recordCounts,
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
    },
    async importFromJson(previewId) {
      return runStorageOperation(async () => {
        if (!pendingImport || pendingImport.previewId !== previewId) {
          return failure([
            'Import preview is no longer available. Select the file again.'
          ]);
        }

        const storage = await getStorage();
        const warnings = getLocalDataImportWarnings(
          storage,
          pendingImport.document
        );
        const imported = appendLocalDataImport(storage, pendingImport.document);
        pendingImport = null;

        return success({
          status: 'completed',
          imported,
          warnings
        });
      });
    },
    async openDataFolder() {
      return runStorageOperation(async () => {
        if (!openPath) {
          return failure(['Opening the local data folder is unavailable.']);
        }

        const userDataPath = getUserDataPath();
        const openError = await openPath(userDataPath);

        if (openError) {
          return failure([
            `Unable to open the local data folder: ${openError}`
          ]);
        }

        return success({
          folderPath: userDataPath,
          status: 'opened'
        });
      });
    },
    async previewImportFromJson() {
      return runStorageOperation(async () => {
        if (!showOpenDialog) {
          return failure(['Local data import dialog is unavailable.']);
        }

        const openResult = await showOpenDialog({
          filters: [{ extensions: ['json'], name: 'JSON files' }],
          properties: ['openFile'],
          title: 'Import local Thesis Investing data'
        });

        if (openResult.canceled || openResult.filePaths.length === 0) {
          pendingImport = null;
          return success({ status: 'canceled' });
        }

        const filePath = openResult.filePaths[0];
        const parsed = parseLocalDataImportDocument(
          await readTextFile(filePath)
        );

        if (!parsed.ok) {
          pendingImport = null;
          return parsed;
        }

        const storage = await getStorage();
        const previewId = createImportPreviewId();
        const warnings = getLocalDataImportWarnings(storage, parsed.value);
        pendingImport = { document: parsed.value, previewId };

        return success({
          status: 'ready',
          preview: {
            counts: parsed.value.counts,
            exportedAt: parsed.value.exportedAt,
            fileName: basename(filePath),
            formatVersion: parsed.value.formatVersion,
            previewId,
            warnings
          }
        });
      });
    }
  };
}

export function createSqliteLocalDataStorageService({
  appVersion,
  databaseFilename = DATABASE_FILENAME,
  getUserDataPath,
  openPath,
  showOpenDialog,
  showSaveDialog
}: Pick<
  LocalDataStorageServiceOptions,
  | 'appVersion'
  | 'databaseFilename'
  | 'getUserDataPath'
  | 'openPath'
  | 'showOpenDialog'
  | 'showSaveDialog'
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
    openPath,
    showOpenDialog,
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
  const counts = createLocalDataCounts({
    mbsScoreSnapshots,
    portfolioRankerItems,
    reminders,
    thesisNotes,
    watchlistItems
  });

  return {
    format: LOCAL_DATA_EXPORT_FORMAT,
    formatVersion: LOCAL_DATA_EXPORT_FORMAT_VERSION,
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

async function getLocalDataRecordCounts(
  getStorage: () => Promise<SqliteStorage>
): Promise<LocalDataExportCounts> {
  const storage = await getStorage();

  return createLocalDataCounts({
    mbsScoreSnapshots: storage.repositories.mbsScoreSnapshots.list(),
    portfolioRankerItems: storage.repositories.portfolioRankerItems.list(),
    reminders: storage.repositories.reminders.list(),
    thesisNotes: storage.repositories.thesisNotes.list(),
    watchlistItems: storage.repositories.watchlistItems.list()
  });
}

function createLocalDataCounts({
  mbsScoreSnapshots,
  portfolioRankerItems,
  reminders,
  thesisNotes,
  watchlistItems
}: LocalDataExportDocument['data']): LocalDataExportCounts {
  return {
    watchlistItems: watchlistItems.length,
    thesisNotes: thesisNotes.length,
    reminders: reminders.length,
    portfolioRankerItems: portfolioRankerItems.length,
    mbsScoreSnapshots: mbsScoreSnapshots.length
  };
}

function createEmptyLocalDataCounts(): LocalDataExportCounts {
  return {
    mbsScoreSnapshots: 0,
    portfolioRankerItems: 0,
    reminders: 0,
    thesisNotes: 0,
    watchlistItems: 0
  };
}

async function runStorageOperation<T>(
  operation: () => Promise<LocalDataStorageResult<T>>
): Promise<LocalDataStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return failure([
      error instanceof Error ? error.message : 'Unknown local data operation error.'
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
    'Living Thesis records',
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
