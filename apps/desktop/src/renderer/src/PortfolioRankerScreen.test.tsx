import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PortfolioRankerScreen } from './PortfolioRankerScreen';
import { buildPortfolioRankerInput } from './portfolioRankerInput';

describe('PortfolioRankerScreen', () => {
  it('renders manual ranking copy and deterministic output for sample rows', () => {
    const html = renderToStaticMarkup(
      <PortfolioRankerScreen
        initialRows={[
          {
            companyName: 'Alpha Co',
            id: 'idea-1',
            manualScore: '72',
            notes: 'User note.',
            ticker: 'aaa'
          },
          {
            companyName: 'Beta Co',
            id: 'idea-2',
            manualScore: '91',
            notes: '',
            ticker: 'bbb'
          },
          {
            companyName: 'Gamma Co',
            id: 'idea-3',
            manualScore: '',
            notes: '',
            ticker: 'ccc'
          }
        ]}
      />
    );

    expect(html).toContain('Manual ranking only');
    expect(html).toContain('not buy, sell, or hold recommendations');
    expect(html).toContain('No live data, brokerage');
    expect(html.indexOf('BBB')).toBeLessThan(html.indexOf('AAA'));
    expect(html).toContain('Incomplete');
    expect(html).toContain('Missing');
  });

  it('renders invalid score feedback clearly', () => {
    const html = renderToStaticMarkup(
      <PortfolioRankerScreen
        initialRows={[
          {
            companyName: 'Invalid Score Co',
            id: 'idea-1',
            manualScore: '101',
            notes: '',
            ticker: 'BAD'
          }
        ]}
      />
    );

    expect(html).toContain('Invalid');
    expect(html).toContain('Manual score must be a finite number from 0 to 100.');
  });

  it('converts populated rows into ranker inputs', () => {
    const input = buildPortfolioRankerInput([
      {
        companyName: '  Alpha Co ',
        id: 'idea-1',
        manualScore: '87',
        notes: ' Local note. ',
        ticker: ' aaa '
      },
      {
        companyName: '',
        id: 'idea-2',
        manualScore: '',
        notes: '',
        ticker: ''
      }
    ]);

    expect(input).toEqual([
      {
        companyName: 'Alpha Co',
        id: 'idea-1',
        manualScore: 87,
        notes: 'Local note.',
        ticker: ' aaa '
      }
    ]);
  });
});
