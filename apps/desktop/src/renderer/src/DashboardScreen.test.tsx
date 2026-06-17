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
    expect(html).toContain('Local Saved Summary');
    expect(html).toContain('Review Priority');
    expect(html).toContain('Market Regime');
    expect(html).toContain('Recent Thesis Activity');
    expect(html).toContain('Continue Research');
  });

  it('renders zero persisted summary state', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).toContain('Saved watchlist items');
    expect(html).toContain('Thesis notes');
    expect(html).toContain('Open reminders');
    expect(html).toContain('Ranker inputs');
    expect(html).toContain('Saved scores');
    expect(html).toContain('No saved theses yet.');
    expect(html).toContain('No completed snapshots yet.');
  });

  it('renders nonzero persisted summary state', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={nonzeroSummary} />
    );

    expect(html).toContain('Saved watchlist items');
    expect(html).toContain('<strong>7</strong>');
    expect(html).toContain('3 active / 1 draft / 4 watch');
    expect(html).toContain('1 overdue / 2 completed / 6 total');
    expect(html).toContain('Saved manual ranker rows.');
    expect(html).toContain('Latest NVDA: 76.9 / 100');
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

    expect(html).toContain('Weakest Idea');
    expect(html).toContain('TSLA');
    expect(html).toContain('Biggest Score Drop');
    expect(html).toContain('TSLA');
    expect(html).toContain('Top Improving Idea');
    expect(html).toContain('NVDA');
    expect(html).toContain('Review Due Soon');
    expect(html).toContain('SOFI');
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
    expect(html).toContain('Review Priority');
  });

  it('renders market regime and quick actions', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).toContain('Under Pressure');
    expect(html).toContain('Growth stocks need caution.');
    expect(html).toContain('Open MBS Scorer');
    expect(html).toContain('Review Portfolio Ranker');
    expect(html).toContain('Open Thesis Monitor');
    expect(html).toContain('Check Watchlist');
  });

  it('renders the latest market pulse feed', () => {
    const html = renderToStaticMarkup(
      <DashboardScreen initialSummary={zeroSummary} />
    );

    expect(html).toContain('Latest');
    expect(html).toContain('Market Pulse');
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
