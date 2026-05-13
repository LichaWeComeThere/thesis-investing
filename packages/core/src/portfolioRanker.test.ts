import { describe, expect, it } from 'vitest';
import { rankManualPortfolioItems } from './portfolioRanker';

describe('rankManualPortfolioItems', () => {
  it('ranks valid manual scores highest first', () => {
    const rankedItems = rankManualPortfolioItems([
      { id: 'idea-1', ticker: 'bbb', manualScore: 72 },
      { id: 'idea-2', ticker: 'aaa', manualScore: 91 },
      { id: 'idea-3', ticker: 'ccc', manualScore: 84 }
    ]);

    expect(rankedItems.map((item) => item.id)).toEqual([
      'idea-2',
      'idea-3',
      'idea-1'
    ]);
    expect(rankedItems.map((item) => item.rank)).toEqual([1, 2, 3]);
    expect(rankedItems[0].normalizedTicker).toBe('AAA');
  });

  it('keeps equal scores in input order for deterministic ties', () => {
    const rankedItems = rankManualPortfolioItems([
      { id: 'idea-1', ticker: 'AAA', manualScore: 80 },
      { id: 'idea-2', ticker: 'BBB', manualScore: 80 }
    ]);

    expect(rankedItems.map((item) => item.id)).toEqual(['idea-1', 'idea-2']);
    expect(rankedItems.map((item) => item.rank)).toEqual([1, 2]);
  });

  it('places missing and invalid scores after ranked items', () => {
    const rankedItems = rankManualPortfolioItems([
      { id: 'idea-1', ticker: 'AAA', manualScore: 70 },
      { id: 'idea-2', ticker: 'BBB' },
      { id: 'idea-3', ticker: 'CCC', manualScore: 101 }
    ]);

    expect(rankedItems.map((item) => item.id)).toEqual([
      'idea-1',
      'idea-2',
      'idea-3'
    ]);
    expect(rankedItems[1]).toMatchObject({
      rank: null,
      status: 'incomplete',
      errors: []
    });
    expect(rankedItems[2]).toMatchObject({
      rank: null,
      status: 'invalid',
      errors: ['Manual score must be a finite number from 0 to 100.']
    });
  });

  it('flags invalid ticker symbols', () => {
    const rankedItems = rankManualPortfolioItems([
      { id: 'idea-1', ticker: 'bad ticker', manualScore: 90 }
    ]);

    expect(rankedItems[0]).toMatchObject({
      rank: null,
      status: 'invalid',
      normalizedTicker: 'BAD TICKER',
      errors: ['Ticker must be a valid ticker symbol.']
    });
  });
});
