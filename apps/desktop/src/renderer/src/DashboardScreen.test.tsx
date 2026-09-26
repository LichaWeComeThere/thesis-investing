// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  DashboardSummary,
  DashboardSummariesStorageResult
} from '../../shared/dashboardSummariesStorage';
import { DashboardScreen } from './DashboardScreen';

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

afterEach(cleanup);

describe('DashboardScreen', () => {
  it('centers the overview on saved theses instead of demo market signals', () => {
    render(<DashboardScreen initialSummary={zeroSummary} summaryStorageClient={null} />);

    expect(screen.getByRole('heading', { name: 'Overview', level: 1 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Start with your thesis.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open theses' })).toBeTruthy();
    expect(screen.queryByText('Market Pulse')).toBeNull();
    expect(screen.queryByText('Demo Thesis Analytics')).toBeNull();
    expect(screen.queryByText('Under Pressure')).toBeNull();
    expect(screen.queryByText('Needs Review Now')).toBeNull();
  });

  it('opens the intended workspace from every overview action', () => {
    const onOpenWorkspace = vi.fn();
    render(<DashboardScreen onOpenWorkspace={onOpenWorkspace} summaryStorageClient={null} />);

    const destinations = [
      ['Open theses', 'thesis-board'],
      ['Build your watchlist', 'watchlist'],
      ['Score a company', 'mbs-scorer'],
      ['Compare ideas', 'portfolio-ranker'],
      ['Write research notes', 'thesis-monitor']
    ];
    for (const [label, destination] of destinations) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
      expect(onOpenWorkspace).toHaveBeenLastCalledWith(destination);
    }
  });

  it('does not describe missing tool records as an empty thesis collection', () => {
    render(<DashboardScreen initialSummary={zeroSummary} summaryStorageClient={null} />);

    expect(screen.getByText('These tools don’t have saved records yet. Your theses are available separately in Theses.')).toBeTruthy();
    expect(screen.getByText('Theses, reviews, and decisions are kept in Theses and aren’t included in these totals.')).toBeTruthy();
    expect(screen.queryByText(/No saved theses/i)).toBeNull();
  });

  it('reports the persisted totals and latest score without inventing thesis counts', () => {
    render(<DashboardScreen initialSummary={nonzeroSummary} summaryStorageClient={null} />);

    const expectedCounts = [
      ['Watchlist companies', '7'],
      ['Research notes', '8'],
      ['Comparison ideas', '6'],
      ['Saved scores', '5'],
      ['Open reminders', '4']
    ];
    for (const [label, count] of expectedCounts) {
      const row = screen.getByText(label).parentElement!;
      expect(within(row).getByRole('definition').textContent).toBe(count);
    }
    expect(screen.getByText('3 active · 1 draft · 4 watching')).toBeTruthy();
    expect(screen.getByText('1 overdue · 2 completed · 6 total')).toBeTruthy();
    expect(screen.getByText('NVDA: 76.9 / 100')).toBeTruthy();
    expect(screen.queryByText(/These tools don’t have saved records yet/)).toBeNull();
  });

  it('does not present zero counts while a storage request is pending', async () => {
    let resolveSummary!: (value: DashboardSummariesStorageResult<DashboardSummary>) => void;
    const get = vi.fn(() => new Promise<DashboardSummariesStorageResult<DashboardSummary>>((resolve) => {
      resolveSummary = resolve;
    }));
    render(<DashboardScreen summaryStorageClient={{ get }} />);

    expect(screen.getByRole('status').textContent).toContain('Loading your saved research');
    expect(screen.queryByRole('definition')).toBeNull();
    await act(async () => { resolveSummary({ ok: true, value: nonzeroSummary }); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('NVDA: 76.9 / 100')).toBeTruthy();
  });

  it('keeps errors visible and retries a failed storage request', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce({ ok: false, errors: ['Storage is temporarily unavailable.'] })
      .mockResolvedValueOnce({ ok: true, value: nonzeroSummary });
    render(<DashboardScreen summaryStorageClient={{ get }} />);

    expect((await screen.findByRole('alert')).textContent).toContain('Storage is temporarily unavailable.');
    expect(screen.queryByRole('definition')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('NVDA: 76.9 / 100')).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('handles rejected requests without showing stale initial totals', async () => {
    const get = vi.fn().mockRejectedValue(new Error('Cannot read saved data.'));
    render(<DashboardScreen initialSummary={nonzeroSummary} summaryStorageClient={{ get }} />);

    expect((await screen.findByRole('alert')).textContent).toContain('Cannot read saved data.');
    expect(screen.queryByRole('definition')).toBeNull();
  });

  it('provides a clear preview state when storage is unavailable', () => {
    render(<DashboardScreen summaryStorageClient={null} />);

    expect(screen.getByText('Saved totals are unavailable in this preview. You can still explore the workspaces.')).toBeTruthy();
    expect(screen.queryByRole('definition')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('shows supplied errors when no storage connection is present', () => {
    render(<DashboardScreen initialSummaryErrors={['Saved data is unavailable.']} summaryStorageClient={null} />);
    expect(screen.getByRole('alert').textContent).toContain('Saved data is unavailable.');
    expect(screen.queryByRole('definition')).toBeNull();
  });

  it('omits invalid timestamps and falls back to a company name for score details', () => {
    render(<DashboardScreen initialSummary={{
      ...nonzeroSummary,
      generatedAt: 'not-a-date',
      latestMbsScoreSnapshot: { ...nonzeroSummary.latestMbsScoreSnapshot!, ticker: undefined }
    }} summaryStorageClient={null} />);

    expect(screen.getByText('NVIDIA: 76.9 / 100')).toBeTruthy();
    expect(screen.queryByText(/Updated /)).toBeNull();
  });
});
