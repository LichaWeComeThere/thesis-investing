import type {
  LivingThesis,
  LivingThesisReviewSession,
  LivingThesisRevision,
  MbsScoreSnapshot,
  PortfolioRankerItem,
  Reminder,
  ThesisNote,
  WatchlistItem
} from '@thesis-investing/core';

export const localDataStorageChannels = {
  exportToJson: 'local-data:export-to-json',
  get: 'local-data:get',
  importFromJson: 'local-data:import-from-json',
  openDataFolder: 'local-data:open-data-folder',
  previewImportFromJson: 'local-data:preview-import-from-json'
} as const;

export const LOCAL_DATA_EXPORT_FORMAT =
  'thesis-investing-local-data-export' as const;
export const LOCAL_DATA_EXPORT_FORMAT_VERSION = 4 as const;
export type LocalDataImportFormatVersion = 1 | 2 | 3 | typeof LOCAL_DATA_EXPORT_FORMAT_VERSION;

export type LocalDataExportCounts = {
  livingTheses: number;
  reviewSessions: number;
  thesisRevisions: number;
  watchlistItems: number;
  thesisNotes: number;
  reminders: number;
  portfolioRankerItems: number;
  mbsScoreSnapshots: number;
};

export type LocalDataInfo = {
  databaseFileExists: boolean;
  databasePath: string;
  generatedAt: string;
  localOnlyItems: string[];
  persistedWorkflows: string[];
  recordCounts: LocalDataExportCounts;
  storageAdapter: 'node:sqlite';
  userDataPath: string;
};

export type LocalDataOpenFolderOutcome = {
  folderPath: string;
  status: 'opened';
};

export type LocalDataExportDocument = {
  format: typeof LOCAL_DATA_EXPORT_FORMAT;
  formatVersion: typeof LOCAL_DATA_EXPORT_FORMAT_VERSION;
  appName: 'Thesis Investing';
  appVersion?: string;
  exportedAt: string;
  storageAdapter: LocalDataInfo['storageAdapter'];
  counts: LocalDataExportCounts;
  data: {
    livingTheses: LivingThesis[];
    reviewSessions: LivingThesisReviewSession[];
    thesisRevisions: LivingThesisRevision[];
    watchlistItems: WatchlistItem[];
    thesisNotes: ThesisNote[];
    reminders: Reminder[];
    portfolioRankerItems: PortfolioRankerItem[];
    mbsScoreSnapshots: MbsScoreSnapshot[];
  };
};

// Older imports are normalized with empty arrays for record types they predate,
// retaining their source version for the preview and compatibility warning.
export type LocalDataImportDocument = Omit<LocalDataExportDocument, 'formatVersion'> & {
  formatVersion: LocalDataImportFormatVersion;
};

export type LocalDataExportOutcome =
  | {
      status: 'completed';
      counts: LocalDataExportCounts;
      exportedAt: string;
      filePath: string;
    }
  | {
      status: 'canceled';
    };

export type LocalDataImportPreview = {
  counts: LocalDataExportCounts;
  exportedAt: string;
  fileName: string;
  formatVersion: LocalDataImportFormatVersion;
  previewId: string;
  warnings: string[];
};

export type LocalDataImportPreviewOutcome =
  | {
      status: 'ready';
      preview: LocalDataImportPreview;
    }
  | {
      status: 'canceled';
    };

export type LocalDataImportOutcome = {
  status: 'completed';
  imported: LocalDataExportCounts;
  warnings: string[];
};

export type LocalDataStorageResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type LocalDataStorageApi = {
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
