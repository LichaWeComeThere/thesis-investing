import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DashboardSummary } from '../../shared/dashboardSummariesStorage';
import { DashboardScreen } from './DashboardScreen';
import {
  cloneMockTheses,
  createMockThesisFromMbsScore
} from './data/mockTheses';

const zeroSummary: DashboardSummary = {
  activeThesisNotes: 0,
  completedReminders: 0,
  draftThesisNotes: 0,
  generatedAt: '2026-06-08T12:00:00.000Z',
  openReminders: 0,
  overdueReminders: 0,
  totalMbsScoreSnapshots: 0,
  totalPortfolioRankerItems: 0,
  totalReminders: 0,
  totalThesisNotes: 0,
  totalWatchlistItems: 0,
  watchThesisNotes: 0
};

const nonzeroSummary: DashboardSummary = {
  activeThesisNotes: 3,
  completedReminders: 2,
  draftThesisNotes: 1,
  generatedAt: '2026-06-08T12:00:00.000Z',
  latestMbsScoreSnapshot: {
    companyName: 'NVIDIA',
    createdAt: '2026-06-08',
    id: 'score_nvda',
    maxScore: 100,
    percentage: 76.9,
    rating: 'strong',
    score: 76.9,
    ticker: 'NVDA'
  },
  openReminders: 4,
  overdueReminders: 1,
  totalMbsScoreSnapshots: 5,
  totalPortfolioRankerItems: 6,
  totalReminders: 6,
  totalThesisNotes: 8,
  totalWatchlistItems: 7,
  watchThesisNotes: 4
};

describe('DashboardScreen', () => {
  it('renders investor command center sections', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).toContain('Investor Command Center');
    expect(html).toContain('Local Saved Data');
    expect(html).toContain('Demo Thesis Analytics');
    expect(html).toContain('Demo Research Context');
    expect(html).toContain('Review Priority');
    expect(html).toContain('Market Regime');
    expect(html).toContain('Demo Thesis Activity');
    expect(html).toContain('Continue Research');
  });

  it('renders shared thesis health state', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).toContain('Theses tracked');
    expect(html).toContain('<strong>8</strong>');
    expect(html).toContain('Shared demo thesis records.');
    expect(html).toContain('Needs review');
    expect(html).toContain('4 review due soon.');
    expect(html).toContain('Active ideas');
    expect(html).toContain('Weakening theses');
    expect(html).toContain('Strong conviction');
    expect(html).toContain('No persisted local workflow records yet.');
  });

  it('keeps nonzero persisted workflow totals visible beside demo analytics', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={nonzeroSummary} />
    );

    expect(html).toContain('Saved watchlist items');
    expect(html).toContain('Local watchlist records.');
    expect(html).toContain('3 active / 1 draft / 4 watch');
    expect(html).toContain('1 overdue / 2 completed / 6 total');
    expect(html).toContain('Ranker inputs');
    expect(html).toContain('Latest NVDA: 76.9 / 100');
    expect(html).toContain('Demo Thesis Analytics');
    expect(html).not.toContain('No persisted local workflow records yet.');
  });

  it('renders loading state when a summary client is available', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen
        summaryStorageClient={{
          get: async () => ({ ok: true, value: nonzeroSummary })
        }}
      />
    );

    expect(html).toContain('Loading saved local records.');
  });

  it('renders storage errors without crashing', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen
        initialSummaryErrors={['Dashboard summary storage unavailable.']}
      />
    );

    expect(html).toContain('Unable to load local summary.');
    expect(html).toContain('Dashboard summary storage unavailable.');
  });

  it('renders review priority demo context separately from persisted totals', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).toContain('Needs Review Now');
    expect(html).toContain('SOFI');
    expect(html).toContain('Weakest Thesis');
    expect(html).toContain('TSLA');
    expect(html).toContain('Biggest Score Drop');
    expect(html).toContain('TSLA');
    expect(html).toContain('Top Improving Idea');
    expect(html).toContain('NVDA');
    expect(html).toContain('Example review signals from the shared demo thesis set.');
  });

  it('renders session thesis updates from props', () => {
    const baseTheses = cloneMockTheses();
    const sessionThesis = createMockThesisFromMbsScore(baseTheses, {
      companyName: 'MVP Session Co',
      createdAt: '2026-05-24T12:00:00.000Z',
      mbsScore: 12,
      ticker: 'MVP'
    });
    const html = renderToStaticMarkup(
      <DashboardScreen
        initialSummary={zeroSummary}
        theses={[...baseTheses, sessionThesis]}
      />
    );

    expect(html).toContain('MVP');
    expect(html).toContain('12 MBS. Created from MBS Scorer.');
    expect(html).toContain('Demo Research Context');
  });

  it('renders market regime and quick actions', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).toContain('Under Pressure');
    expect(html).toContain('Example context for organizing research');
    expect(html).toContain('Example market context');
    expect(html).not.toContain('size conviction carefully');
    expect(html).toContain('Open demo SOFI');
    expect(html).toContain('Open MBS Scorer');
    expect(html).toContain('Review Portfolio Ranker');
    expect(html).toContain('Open Thesis Monitor');
    expect(html).toContain('Check Watchlist');
  });

  it('labels the hard-coded market pulse as static demo data', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).toContain('Example Feed');
    expect(html).toContain('Market Pulse');
    expect(html).toContain('Demo data');
    expect(html).toContain('Static example headlines and moves, not a live feed.');
    expect(html).toContain(
      'Google, Blackstone to create new AI cloud company, WSJ reports'
    );
    expect(html).toContain("Japan&#x27;s economy grew more than expected in Q1");
    expect(html).toContain(
      'Semiconductor leaders continue showing relative strength'
    );
  });

  it('does not render development status dashboard copy', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).not.toContain('Offline MVP snapshot');
    expect(html).not.toContain('Live data integrations');
    expect(html).not.toContain('Brokerage connections');
    expect(html).not.toContain('Pending MVP areas');
    expect(html).not.toContain('MVP readiness checklist');
    expect(html).not.toContain('Use this dashboard for');
    expect(html).not.toContain('Manual workflows available');
  });
});
