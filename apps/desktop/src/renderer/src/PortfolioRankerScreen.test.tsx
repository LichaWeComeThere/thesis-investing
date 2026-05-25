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

    expect(html).toContain('Demo Rankings');
    expect(html).toContain('Thesis Rankings');
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
});
