import { describe, expect, it } from 'vitest';

import { toPersistedPortfolioRankerItem } from './portfolioRankerStorageClient';
import type { PortfolioRankerRowState } from './portfolioRankerInput';

describe('portfolioRankerStorageClient', () => {
  it('builds a persisted portfolio ranker item from a populated row', () => {
    const row: PortfolioRankerRowState = {
      id: 'idea-1',
      ticker: 'MSFT',
      companyName: 'Microsoft',
      manualScore: '82',
      notes: 'Durable software franchise.'
    };

    expect(toPersistedPortfolioRankerItem(row)).toEqual({
      id: 'idea-1',
      ticker: 'MSFT',
      companyName: 'Microsoft',
      manualScore: 82,
      notes: 'Durable software franchise.'
    });
  });

  it('omits empty optional fields when building a persisted item', () => {
    const row: PortfolioRankerRowState = {
      id: 'idea-min',
      ticker: 'AAPL',
      companyName: '',
      manualScore: '',
      notes: ''
    };

    expect(toPersistedPortfolioRankerItem(row)).toEqual({
      id: 'idea-min',
      ticker: 'AAPL'
    });
  });

  it('skips an unparseable manual score', () => {
    const row: PortfolioRankerRowState = {
      id: 'idea-bad',
      ticker: 'AAPL',
      companyName: '',
      manualScore: 'not-a-number',
      notes: ''
    };

    const item = toPersistedPortfolioRankerItem(row);
    expect(item).toEqual({
      id: 'idea-bad',
      ticker: 'AAPL'
    });
    expect(item.manualScore).toBeUndefined();
  });
});
