import type { PortfolioRankerItem } from '@thesis-investing/core';

export const portfolioRankerStorageChannels = {
  list: 'portfolio-ranker:list',
  remove: 'portfolio-ranker:remove',
  save: 'portfolio-ranker:save'
} as const;

export type PortfolioRankerStorageResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type PortfolioRankerStorageApi = {
  list(): Promise<PortfolioRankerStorageResult<PortfolioRankerItem[]>>;
  remove(id: string): Promise<PortfolioRankerStorageResult<boolean>>;
  save(
    item: PortfolioRankerItem
  ): Promise<PortfolioRankerStorageResult<PortfolioRankerItem>>;
};
