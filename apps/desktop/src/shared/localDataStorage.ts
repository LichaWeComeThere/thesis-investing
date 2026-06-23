import type {
  MbsScoreSnapshot,
  PortfolioRankerItem,
  Reminder,
  ThesisNote,
  WatchlistItem
} from '@thesis-investing/core';

export const localDataStorageChannels = {
  exportToJson: 'local-data:export-to-json',
  get: 'local-data:get'
} as const;

export type LocalDataInfo = {
  databaseFileExists: boolean;
  databasePath: string;
  generatedAt: string;
  localOnlyItems: string[];
  persistedWorkflows: string[];
  storageAdapter: 'node:sqlite';
  userDataPath: string;
};

export type LocalDataExportCounts = {
  watchlistItems: number;
  thesisNotes: number;
  reminders: number;
  portfolioRankerItems: number;
  mbsScoreSnapshots: number;
};

export type LocalDataExportDocument = {
  format: 'thesis-investing-local-data-export';
  formatVersion: 1;
  appName: 'Thesis Investing';
  appVersion?: string;
  exportedAt: string;
  storageAdapter: LocalDataInfo['storageAdapter'];
  counts: LocalDataExportCounts;
  data: {
    watchlistItems: WatchlistItem[];
    thesisNotes: ThesisNote[];
    reminders: Reminder[];
    portfolioRankerItems: PortfolioRankerItem[];
    mbsScoreSnapshots: MbsScoreSnapshot[];
  };
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
};
