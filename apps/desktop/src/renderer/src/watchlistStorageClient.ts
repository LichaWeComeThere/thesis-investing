import type { WatchlistItem } from '@thesis-investing/core';
import type {
  ThesisInvestingApi,
  WatchlistStorageApi
} from '../../shared/watchlistStorage';
import type { LocalWatchlistItem } from './watchlistInput';

declare global {
  interface Window {
    thesisInvesting?: ThesisInvestingApi;
  }
}

export type WatchlistStorageClient = WatchlistStorageApi;

export function getDefaultWatchlistStorageClient(): WatchlistStorageClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.thesisInvesting?.watchlist ?? null;
}

export function toPersistedWatchlistItem(
  item: LocalWatchlistItem
): WatchlistItem {
  return {
    companyName: item.companyName,
    createdAt: item.createdAt,
    id: item.id,
    note: item.note,
    tags: item.tags,
    thesisNoteId: item.thesisNoteId,
    ticker: item.ticker
  };
}
