import type { WatchlistItem } from '@thesis-investing/core';
import type { DashboardSummariesStorageApi } from './dashboardSummariesStorage';
import type { LocalDataStorageApi } from './localDataStorage';
import type { LivingThesesStorageApi } from './livingThesesStorage';
import type { MbsScoreSnapshotsStorageApi } from './mbsScoreSnapshotsStorage';
import type { PortfolioRankerStorageApi } from './portfolioRankerStorage';
import type { RemindersStorageApi } from './remindersStorage';
import type { ThesisNotesStorageApi } from './thesisNotesStorage';

export const watchlistStorageChannels = {
  list: 'watchlist:list',
  remove: 'watchlist:remove',
  save: 'watchlist:save'
} as const;

export type WatchlistStorageResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type WatchlistStorageApi = {
  list(): Promise<WatchlistStorageResult<WatchlistItem[]>>;
  remove(id: string): Promise<WatchlistStorageResult<boolean>>;
  save(item: WatchlistItem): Promise<WatchlistStorageResult<WatchlistItem>>;
};

export type ThesisInvestingApi = {
  dashboardSummaries: DashboardSummariesStorageApi;
  localData: LocalDataStorageApi;
  livingTheses: LivingThesesStorageApi;
  mbsScoreSnapshots: MbsScoreSnapshotsStorageApi;
  platform: string;
  portfolioRanker: PortfolioRankerStorageApi;
  reminders: RemindersStorageApi;
  thesisNotes: ThesisNotesStorageApi;
  watchlist: WatchlistStorageApi;
};
