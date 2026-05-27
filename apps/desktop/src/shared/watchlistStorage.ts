import type { WatchlistItem } from '@thesis-investing/core';
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
  platform: string;
  portfolioRanker: PortfolioRankerStorageApi;
  reminders: RemindersStorageApi;
  thesisNotes: ThesisNotesStorageApi;
  watchlist: WatchlistStorageApi;
};
