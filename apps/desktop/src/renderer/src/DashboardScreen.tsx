import { Badge, Card, PageHeader } from '@thesis-investing/ui';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardSummary } from '../../shared/dashboardSummariesStorage';
import {
  formatScoreChange,
  getBiggestScoreDrop,
  getNextReviewThesis,
  getReviewDueSoon,
  getScoreChange,
  getThesisHealthSummary,
  getTopImprovingThesis,
  getWeakestThesis,
  isNeedsReviewThesis,
  mockTheses,
  type MockThesis
} from './data/mockTheses';
import {
  getDefaultDashboardSummariesStorageClient,
  type DashboardSummariesStorageClient
} from './dashboardSummariesStorageClient';
import { MarketPulseFeed } from './MarketPulseFeed';
import './dashboard.css';

type ThesisHealthTone = 'tracked' | 'strong' | 'review' | 'weakening';

type ThesisHealthItem = {
  detail: string;
  label: string;
  tone: ThesisHealthTone;
  value: number;
};

type ReviewPriorityItem = {
  label: string;
  ticker: string;
  detail: string;
  tone: ThesisHealthTone;
};

type RecentActivityItem = {
  ticker: string;
  action: string;
  detail: string;
  tone: ThesisHealthTone;
};

type QuickAction = {
  label: string;
  workspaceId: string;
  description: string;
};

const defaultQuickActions: QuickAction[] = [
  {
    label: 'Open MBS Scorer',
    workspaceId: 'mbs-scorer',
    description: 'Refresh score assumptions.'
  },
  {
    label: 'Review Portfolio Ranker',
    workspaceId: 'portfolio-ranker',
    description: 'Compare scored ideas.'
  },
  {
    label: 'Open Thesis Monitor',
    workspaceId: 'thesis-monitor',
    description: 'Update thesis health.'
  },
  {
    label: 'Check Watchlist',
    workspaceId: 'watchlist',
    description: 'Review tracked ideas.'
  }
];

type DashboardScreenProps = {
  initialSummary?: DashboardSummary;
  initialSummaryErrors?: string[];
  onOpenWorkspace?: (workspaceId: string) => void;
  summaryStorageClient?: DashboardSummariesStorageClient | null;
  theses?: MockThesis[];
};

function createEmptyDashboardSummary(): DashboardSummary {
  return {
    activeThesisNotes: 0,
    completedReminders: 0,
    draftThesisNotes: 0,
    generatedAt: '',
    openReminders: 0,
    overdueReminders: 0,
    totalMbsScoreSnapshots: 0,
    totalPortfolioRankerItems: 0,
    totalReminders: 0,
    totalThesisNotes: 0,
    totalWatchlistItems: 0,
    watchThesisNotes: 0
  };
}

function isEmptyDashboardSummary(summary: DashboardSummary): boolean {
  return (
    summary.totalWatchlistItems === 0 &&
    summary.totalThesisNotes === 0 &&
    summary.totalReminders === 0 &&
    summary.totalPortfolioRankerItems === 0 &&
    summary.totalMbsScoreSnapshots === 0
  );
}

function getDashboardSummaryItems(
  summary: DashboardSummary
): ThesisHealthItem[] {
  return [
    {
      detail: 'Local watchlist records.',
      label: 'Saved watchlist items',
      tone: 'tracked',
      value: summary.totalWatchlistItems
    },
    {
      detail: `${summary.activeThesisNotes} active / ${summary.draftThesisNotes} draft / ${summary.watchThesisNotes} watch`,
      label: 'Thesis notes',
      tone: 'strong',
      value: summary.totalThesisNotes
    },
    {
      detail: `${summary.overdueReminders} overdue / ${summary.completedReminders} completed / ${summary.totalReminders} total`,
      label: 'Open reminders',
      tone: summary.overdueReminders > 0 ? 'review' : 'tracked',
      value: summary.openReminders
    },
    {
      detail: 'Saved manual ranker rows.',
      label: 'Ranker inputs',
      tone: 'tracked',
      value: summary.totalPortfolioRankerItems
    },
    {
      detail: getMbsScoreSnapshotDetail(summary),
      label: 'Saved scores',
      tone: summary.latestMbsScoreSnapshot ? 'strong' : 'tracked',
      value: summary.totalMbsScoreSnapshots
    }
  ];
}

function getMbsScoreSnapshotDetail(summary: DashboardSummary): string {
  const latestSnapshot = summary.latestMbsScoreSnapshot;

  if (!latestSnapshot) {
    return 'No completed snapshots yet.';
  }

  const label =
    latestSnapshot.ticker ??
    latestSnapshot.companyName ??
    'Latest completed score';

  return `Latest ${label}: ${latestSnapshot.score} / ${latestSnapshot.maxScore}`;
}

function getDashboardThesisHealthItems(
  theses: readonly MockThesis[]
): ThesisHealthItem[] {
  const summary = getThesisHealthSummary(theses);

  return [
    {
      detail: 'Shared demo thesis records.',
      label: 'Theses tracked',
      tone: 'tracked',
      value: summary.trackedCount
    },
    {
      detail: `${summary.reviewDueSoonCount} review due soon.`,
      label: 'Needs review',
      tone: summary.needsReviewCount > 0 ? 'review' : 'tracked',
      value: summary.needsReviewCount
    },
    {
      detail: 'Example ideas currently marked active.',
      label: 'Active ideas',
      tone: summary.activeCount > 0 ? 'strong' : 'tracked',
      value: summary.activeCount
    },
    {
      detail: 'Thesis status is weakening or broken.',
      label: 'Weakening theses',
      tone: summary.weakeningCount > 0 ? 'weakening' : 'tracked',
      value: summary.weakeningCount
    },
    {
      detail: 'High-conviction examples in the demo set.',
      label: 'Strong conviction',
      tone: summary.highConvictionCount > 0 ? 'strong' : 'tracked',
      value: summary.highConvictionCount
    }
  ];
}

function formatGeneratedAt(generatedAt: string): string {
  if (!generatedAt) {
    return 'Waiting for local data.';
  }

  const date = new Date(generatedAt);

  if (Number.isNaN(date.getTime())) {
    return generatedAt;
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function getDashboardTone(thesis: MockThesis): ThesisHealthTone {
  if (thesis.thesisStatus === 'Weakening' || thesis.thesisStatus === 'Broken') {
    return 'weakening';
  }

  if (isNeedsReviewThesis(thesis)) {
    return 'review';
  }

  if (thesis.conviction === 'High' || getScoreChange(thesis) > 0) {
    return 'strong';
  }

  return 'tracked';
}

function getReviewPriorityItems(theses: readonly MockThesis[]): ReviewPriorityItem[] {
  if (theses.length === 0) {
    return [];
  }

  const dueSoonThesis = getReviewDueSoon(theses)[0] ?? getNextReviewThesis(theses);
  const weakestThesis = getWeakestThesis(theses);
  const largestDropThesis = getBiggestScoreDrop(theses);
  const topImprovingThesis = getTopImprovingThesis(theses);

  return [
    {
      label: 'Needs Review Now',
      ticker: dueSoonThesis.ticker,
      detail: `${dueSoonThesis.companyName} is ${dueSoonThesis.ideaStatus.toLowerCase()} with next review ${dueSoonThesis.nextReviewDate}.`,
      tone: 'review'
    },
    {
      label: 'Weakest Thesis',
      ticker: weakestThesis.ticker,
      detail: `${weakestThesis.mbsScore} MBS. ${weakestThesis.thesisSummary}`,
      tone: 'weakening'
    },
    {
      label: 'Biggest Score Drop',
      ticker: largestDropThesis.ticker,
      detail: `${formatScoreChange(largestDropThesis)} since last review.`,
      tone: 'review'
    },
    {
      label: 'Top Improving Idea',
      ticker: topImprovingThesis.ticker,
      detail: `${formatScoreChange(topImprovingThesis)} since last review.`,
      tone: 'strong'
    }
  ];
}

function getOpenNextAction(theses: readonly MockThesis[]): QuickAction {
  const reviewCandidate =
    getReviewDueSoon(theses)[0] ??
    theses.find((thesis) => thesis.ideaStatus === 'Needs Review') ??
    getBiggestScoreDrop(theses);

  if (!reviewCandidate) {
    return defaultQuickActions[0];
  }

  return {
    label: `Open demo ${reviewCandidate.ticker}`,
    workspaceId: 'thesis-board',
    description: `${reviewCandidate.companyName}: example ${reviewCandidate.ideaStatus.toLowerCase()} thesis review.`
  };
}

export function DashboardScreen({
  initialSummary,
  initialSummaryErrors = [],
  onOpenWorkspace,
  summaryStorageClient,
  theses = mockTheses
}: DashboardScreenProps): JSX.Element {
  const resolvedSummaryStorageClient =
    summaryStorageClient === undefined
      ? getDefaultDashboardSummariesStorageClient()
      : summaryStorageClient;
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(
    () => initialSummary ?? createEmptyDashboardSummary()
  );
  const [summaryErrors, setSummaryErrors] = useState(initialSummaryErrors);
  const [isSummaryLoading, setIsSummaryLoading] = useState(
    () =>
      Boolean(resolvedSummaryStorageClient) &&
      initialSummary === undefined &&
      initialSummaryErrors.length === 0
  );
  const summaryItems = useMemo(
    () => getDashboardSummaryItems(dashboardSummary),
    [dashboardSummary]
  );
  const thesisHealthItems = useMemo(
    () => getDashboardThesisHealthItems(theses),
    [theses]
  );
  const isSummaryEmpty = isEmptyDashboardSummary(dashboardSummary);
  const reviewPriorityItems = getReviewPriorityItems(theses);
  const quickActions = [getOpenNextAction(theses), ...defaultQuickActions];
  const recentActivityItems: RecentActivityItem[] = theses
    .flatMap((thesis) =>
      thesis.decisionLog.map((entry) => ({
        ticker: thesis.ticker,
        action: entry.title,
        detail: entry.note,
        tone: getDashboardTone(thesis),
        createdAt: entry.createdAt
      }))
    )
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, 3);

  useEffect(() => {
    if (!resolvedSummaryStorageClient) {
      setIsSummaryLoading(false);
      return;
    }

    let isMounted = true;

    setIsSummaryLoading(true);
    setSummaryErrors([]);

    resolvedSummaryStorageClient
      .get()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        if (result.ok) {
          setDashboardSummary(result.value);
          setSummaryErrors([]);
          return;
        }

        setSummaryErrors(result.errors);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setSummaryErrors([
          error instanceof Error
            ? error.message
            : 'Unable to load Dashboard summary.'
        ]);
      })
      .finally(() => {
        if (isMounted) {
          setIsSummaryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedSummaryStorageClient]);

  return (
    <div className="dashboard-screen">
      <PageHeader
        badge={<Badge variant="accent">Command Center</Badge>}
        description="Review saved local workflow totals, thesis context, and the next research actions."
        eyebrow="Investor Command Center"
        title="Dashboard"
      />

      <div className="dashboard-content-layout">
        <MarketPulseFeed />

        <div className="dashboard-main-stack">
          <section
            className="dashboard-health-section"
            aria-label="Local persisted summary"
          >
            <div className="dashboard-section-heading">
              <h2>Local Saved Data</h2>
              <p>
                {isSummaryLoading
                  ? 'Loading saved local records.'
                  : `Updated ${formatGeneratedAt(dashboardSummary.generatedAt)}`}
              </p>
            </div>

            {summaryErrors.length > 0 ? (
              <div className="dashboard-summary-message" role="alert">
                <strong>Unable to load local summary.</strong>
                <ul>
                  {summaryErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!isSummaryLoading && summaryErrors.length === 0 && isSummaryEmpty ? (
              <p className="dashboard-summary-empty">
                No persisted local workflow records yet.
              </p>
            ) : null}

            <div className="dashboard-health-grid">
              {summaryItems.map((item) => (
                <Card
                  className={`dashboard-health-card dashboard-health-card--${item.tone}`}
                  key={item.label}
                >
                  <div className="dashboard-health-card-content">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section
            className="dashboard-health-section"
            aria-label="Demo thesis analytics"
          >
            <div className="dashboard-section-heading">
              <h2>Demo Thesis Analytics</h2>
              <p>Example thesis health and score-change context.</p>
            </div>

            <div className="dashboard-health-grid">
              {thesisHealthItems.map((item) => (
                <Card
                  className={`dashboard-health-card dashboard-health-card--${item.tone}`}
                  key={item.label}
                >
                  <div className="dashboard-health-card-content">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section
            className="dashboard-health-section"
            aria-label="Demo thesis research context"
          >
            <div className="dashboard-section-heading">
              <h2>Demo Research Context</h2>
              <p>Example review signals from the shared demo thesis set.</p>
            </div>

            <div className="dashboard-command-grid">
              <Card className="review-priority-card" emphasis title="Review Priority">
                <div className="review-priority-list">
                  {reviewPriorityItems.map((item) => (
                    <article
                      className={`review-priority-item review-priority-item--${item.tone}`}
                      key={item.label}
                    >
                      <div>
                        <span>{item.label}</span>
                        <strong>{item.ticker}</strong>
                      </div>
                      <p>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </Card>

              <Card className="market-regime-card" title="Market Regime">
                <div className="market-regime-hero">
                  <span>Example context</span>
                  <strong>Under Pressure</strong>
                </div>
                <p>
                  Example context for organizing research: revisit stale
                  assumptions and flag higher-risk growth theses for additional
                  review.
                </p>
                <div className="market-regime-tags">
                  <Badge variant="warning">Risk check</Badge>
                  <Badge variant="neutral">Example market context</Badge>
                </div>
              </Card>
            </div>
          </section>

          <section className="dashboard-lower-grid" aria-label="Activity and actions">
            <Card title="Demo Thesis Activity">
              <div className="recent-activity-list">
                {recentActivityItems.map((item) => (
                  <article
                    className={`recent-activity-item recent-activity-item--${item.tone}`}
                    key={`${item.ticker}-${item.action}`}
                  >
                    <span>{item.ticker}</span>
                    <div>
                      <strong>{item.action}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </Card>

            <Card title="Continue Research">
              <div className="quick-action-grid">
                {quickActions.map((action) => (
                  <button
                    className="quick-action-card"
                    key={action.workspaceId}
                    onClick={() => onOpenWorkspace?.(action.workspaceId)}
                    type="button"
                  >
                    <span>{action.label}</span>
                    <small>{action.description}</small>
                  </button>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
