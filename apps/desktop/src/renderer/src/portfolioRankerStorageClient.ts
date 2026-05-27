import type { PortfolioRankerItem } from '@thesis-investing/core';
import type { PortfolioRankerStorageApi } from '../../shared/portfolioRankerStorage';
import type { ThesisInvestingApi } from '../../shared/watchlistStorage';
import {
  buildPersistedPortfolioRankerItem,
  type PortfolioRankerRowState
} from './portfolioRankerInput';

declare global {
  interface Window {
    thesisInvesting?: ThesisInvestingApi;
  }
}

export type PortfolioRankerStorageClient = PortfolioRankerStorageApi;

export function getDefaultPortfolioRankerStorageClient(): PortfolioRankerStorageClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.thesisInvesting?.portfolioRanker ?? null;
}

export function toPersistedPortfolioRankerItem(
  row: PortfolioRankerRowState
): PortfolioRankerItem {
  return buildPersistedPortfolioRankerItem(row);
}
