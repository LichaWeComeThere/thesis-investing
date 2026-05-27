import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PortfolioRankerScreen } from './PortfolioRankerScreen';
import {
  buildPersistedPortfolioRankerItem,
  buildPortfolioRankerInput,
  getNextPortfolioRankerRowNumber,
  isPortfolioRankerRowSaveable,
  portfolioRankerItemToRow
} from './portfolioRankerInput';

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

    expect(html).toContain('Demo Rankings');
    expect(html).toContain('Portfolio Ranker');
    expect(html).toContain('Rank investment ideas by thesis score');
    expect(html).toContain('Investment ideas');
    expect(html).toContain('MBS 72 / 100');
    expect(html).toContain('Thesis: Not set');
    expect(html).toContain('Conviction: Not set');
    expect(html).toContain('Risk: Not set');
    expect(html).toContain('Theme: Not set');
    expect(html).toContain('Last reviewed');
    expect(html).toContain('Next review');
    const rankingPreview = html.slice(
      html.indexOf('portfolio-ranker-preview-list')
    );
    expect(rankingPreview.indexOf('BBB')).toBeLessThan(
      rankingPreview.indexOf('AAA')
    );
    expect(html).toContain('Incomplete');
    expect(html).toContain('Not set');
    expect(html).toContain('Weakest idea');
    expect(html).toContain('Lowest current thesis score.');
    expect(html).toContain('Re-evaluate thesis');
    expect(html).not.toContain('Untitled holding');
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

  it('renders useful weakest idea empty and one-item states', () => {
    const noScoresHtml = renderToStaticMarkup(
      <PortfolioRankerScreen
        initialRows={[
          {
            companyName: '',
            id: 'idea-1',
            manualScore: '',
            notes: '',
            ticker: ''
          }
        ]}
      />
    );

    expect(noScoresHtml).toContain('Add scores to identify the weakest idea.');
    expect(noScoresHtml).toContain('Add ticker');
    expect(noScoresHtml).toContain('New idea');

    const oneIdeaHtml = renderToStaticMarkup(
      <PortfolioRankerScreen
        initialRows={[
          {
            companyName: 'Solo Co',
            id: 'idea-1',
            manualScore: '80',
            notes: '',
            ticker: 'SOLO'
          }
        ]}
      />
    );

    expect(oneIdeaHtml).toContain('Add more ideas to compare weakest thesis.');
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

  it('renders storage errors without crashing', () => {
    const html = renderToStaticMarkup(
      <PortfolioRankerScreen
        initialStorageErrors={['Storage unavailable.']}
        storageClient={null}
      />
    );

    expect(html).toContain('Storage');
    expect(html).toContain('Storage unavailable.');
  });

  it('renders without a storage client and without crashing', () => {
    const html = renderToStaticMarkup(
      <PortfolioRankerScreen storageClient={null} />
    );

    expect(html).toContain('Portfolio Ranker');
  });

  it('maps a persisted portfolio ranker item into and out of a row state', () => {
    const row = portfolioRankerItemToRow({
      id: 'idea-1',
      ticker: 'MSFT',
      companyName: 'Microsoft',
      manualScore: 82,
      notes: 'Persisted note.'
    });

    expect(row).toEqual({
      id: 'idea-1',
      ticker: 'MSFT',
      companyName: 'Microsoft',
      manualScore: '82',
      notes: 'Persisted note.'
    });

    expect(buildPersistedPortfolioRankerItem(row)).toEqual({
      id: 'idea-1',
      ticker: 'MSFT',
      companyName: 'Microsoft',
      manualScore: 82,
      notes: 'Persisted note.'
    });
  });

  it('skips persisting empty optional fields when building a persisted item', () => {
    const minimalRow = {
      id: 'idea-min',
      ticker: ' aapl ',
      companyName: '   ',
      manualScore: '   ',
      notes: '   '
    };

    expect(buildPersistedPortfolioRankerItem(minimalRow)).toEqual({
      id: 'idea-min',
      ticker: 'aapl'
    });
  });

  it('treats rows with a non-empty ticker as saveable', () => {
    expect(
      isPortfolioRankerRowSaveable({
        id: 'idea-1',
        ticker: '   ',
        companyName: 'X',
        manualScore: '',
        notes: ''
      })
    ).toBe(false);

    expect(
      isPortfolioRankerRowSaveable({
        id: 'idea-1',
        ticker: 'MSFT',
        companyName: '',
        manualScore: '',
        notes: ''
      })
    ).toBe(true);
  });

  it('finds the next available portfolio ranker row number', () => {
    const rows = [
      {
        id: 'idea-1',
        ticker: 'AAA',
        companyName: '',
        manualScore: '',
        notes: ''
      },
      {
        id: 'idea-3',
        ticker: 'BBB',
        companyName: '',
        manualScore: '',
        notes: ''
      }
    ];

    expect(getNextPortfolioRankerRowNumber(rows, 1)).toBe(2);
    expect(getNextPortfolioRankerRowNumber(rows, 3)).toBe(4);
    expect(getNextPortfolioRankerRowNumber([], 1)).toBe(1);
  });
});
