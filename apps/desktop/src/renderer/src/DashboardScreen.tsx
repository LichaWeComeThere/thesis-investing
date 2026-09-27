import { Button, PageHeader } from '@thesis-investing/ui';
import { useEffect, useState } from 'react';
import type { DashboardSummary } from '../../shared/dashboardSummariesStorage';
import type { ReviewQueueStorageApi } from '../../shared/reviewQueueStorage';
import { ReviewQueuePanel, type ReviewQueueTarget } from './ReviewQueuePanel';
import {
  getDefaultDashboardSummariesStorageClient,
  type DashboardSummariesStorageClient
} from './dashboardSummariesStorageClient';
import './dashboard.css';

const researchActions = [
  {
    label: 'Build your watchlist',
    workspaceId: 'watchlist',
    description: 'Keep the companies you want to understand in one place.'
  },
  {
    label: 'Score a company',
    workspaceId: 'mbs-scorer',
    description: 'Work through the business fundamentals and save your assessment.'
  },
  {
    label: 'Compare ideas',
    workspaceId: 'portfolio-ranker',
    description: 'Compare your scores and decide what to research next.'
  },
  {
    label: 'Write research notes',
    workspaceId: 'thesis-monitor',
    description: 'Record observations, questions, and reminders as you learn.'
  }
];

type DashboardScreenProps = {
  initialSummary?: DashboardSummary;
  initialSummaryErrors?: string[];
  onOpenWorkspace?: (workspaceId: string) => void;
  onOpenThesis?: (target: ReviewQueueTarget) => void;
  queueStorageClient?: ReviewQueueStorageApi | null;
  summaryStorageClient?: DashboardSummariesStorageClient | null;
};

function getSummaryItems(summary: DashboardSummary) {
  const latestScore = summary.latestMbsScoreSnapshot;
  const scoreLabel = latestScore?.ticker ?? latestScore?.companyName ?? 'Latest score';

  return [
    {
      label: 'Watchlist companies',
      detail: 'Companies saved to your watchlist',
      value: summary.totalWatchlistItems
    },
    {
      label: 'Research notes',
      detail: `${summary.activeThesisNotes} active · ${summary.draftThesisNotes} draft · ${summary.watchThesisNotes} watching`,
      value: summary.totalThesisNotes
    },
    {
      label: 'Comparison ideas',
      detail: 'Ideas saved in Compare ideas',
      value: summary.totalPortfolioRankerItems
    },
    {
      label: 'Saved scores',
      detail: latestScore
        ? `${scoreLabel}: ${latestScore.score} / ${latestScore.maxScore}`
        : 'Completed company assessments',
      value: summary.totalMbsScoreSnapshots
    },
    {
      label: 'Open reminders',
      detail: `${summary.overdueReminders} overdue · ${summary.completedReminders} completed · ${summary.totalReminders} total`,
      value: summary.openReminders
    }
  ];
}

function formatUpdatedAt(generatedAt: string): string | null {
  const date = new Date(generatedAt);

  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DashboardScreen({
  initialSummary,
  initialSummaryErrors = [],
  onOpenWorkspace,
  onOpenThesis,
  queueStorageClient,
  summaryStorageClient
}: DashboardScreenProps): JSX.Element {
  const resolvedSummaryStorageClient =
    summaryStorageClient === undefined
      ? getDefaultDashboardSummariesStorageClient()
      : summaryStorageClient;
  const [summary, setSummary] = useState(initialSummary);
  const [summaryErrors, setSummaryErrors] = useState(initialSummaryErrors);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isSummaryLoading, setIsSummaryLoading] = useState(
    () => Boolean(resolvedSummaryStorageClient) && !initialSummary && !initialSummaryErrors.length
  );

  useEffect(() => {
    if (!resolvedSummaryStorageClient) {
      setIsSummaryLoading(false);
      return;
    }

    let isMounted = true;
    setIsSummaryLoading(true);
    setSummaryErrors([]);

    async function loadSummary(): Promise<void> {
      try {
        const result = await resolvedSummaryStorageClient!.get();
        if (!isMounted) return;
        if (result.ok) {
          setSummary(result.value);
        } else {
          setSummaryErrors(result.errors.length ? result.errors : ['Please try again.']);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setSummaryErrors([
            error instanceof Error ? error.message : 'Please try again.'
          ]);
        }
      } finally {
        if (isMounted) setIsSummaryLoading(false);
      }
    }

    void loadSummary();
    return () => { isMounted = false; };
  }, [resolvedSummaryStorageClient, refreshCount]);

  const updatedAt = summary ? formatUpdatedAt(summary.generatedAt) : null;
  const hasSavedToolRecords = summary && (
    summary.totalWatchlistItems + summary.totalThesisNotes + summary.totalReminders +
    summary.totalPortfolioRankerItems + summary.totalMbsScoreSnapshots > 0
  );

  return (
    <div className="overview-screen">
      <PageHeader
        title="Overview"
        description="A place to think clearly about the companies you follow."
      />

      <section className="overview-intro" aria-labelledby="overview-theses-heading">
        <div>
          <p className="overview-eyebrow">Your research, connected</p>
          <h2 id="overview-theses-heading">Start with your thesis.</h2>
          <p className="overview-intro-description">
            Keep your reasoning, reviews, and decisions together. Return to a saved
            thesis or begin a new one.
          </p>
        </div>
        <Button
          className="overview-primary-action"
          disabled={!onOpenWorkspace}
          onClick={() => onOpenWorkspace?.('thesis-board')}
          type="button"
        >
          Open theses <span aria-hidden="true">→</span>
        </Button>
      </section>

      <ReviewQueuePanel onOpenThesis={onOpenThesis} storageClient={queueStorageClient} />

      <div className="overview-layout">
        <section aria-labelledby="overview-workflow-heading">
          <div className="overview-section-heading">
            <h2 id="overview-workflow-heading">Make progress on an idea</h2>
            <p>Choose the tool that fits your next step.</p>
          </div>
          <ol className="overview-action-list">
            {researchActions.map((action, index) => (
              <li key={action.workspaceId}>
                <button
                  className="overview-action"
                  disabled={!onOpenWorkspace}
                  onClick={() => onOpenWorkspace?.(action.workspaceId)}
                  type="button"
                >
                  <span className="overview-action-number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="overview-action-copy">
                    <strong>{action.label}</strong>
                    <span>{action.description}</span>
                  </span>
                  <span className="overview-action-arrow" aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="overview-saved" aria-labelledby="overview-saved-heading" aria-busy={isSummaryLoading}>
          <div className="overview-section-heading">
            <h2 id="overview-saved-heading">Saved in your tools</h2>
            <p>A snapshot of the research on this device.</p>
          </div>

          {isSummaryLoading ? (
            <p className="overview-summary-state" role="status">Loading your saved research…</p>
          ) : summaryErrors.length > 0 ? (
            <div className="overview-summary-state overview-summary-error" role="alert">
              <strong>We couldn’t load your saved totals.</strong>
              <ul>{summaryErrors.map((error) => <li key={error}>{error}</li>)}</ul>
              {resolvedSummaryStorageClient ? (
                <Button variant="secondary" size="sm" onClick={() => setRefreshCount((value) => value + 1)} type="button">
                  Try again
                </Button>
              ) : null}
            </div>
          ) : summary ? (
            <>
              <dl className="overview-summary-list">
                {getSummaryItems(summary).map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}<span>{item.detail}</span></dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {!hasSavedToolRecords ? (
                <p className="overview-note">These tools don’t have saved records yet. Your theses are available separately in Theses.</p>
              ) : null}
              {updatedAt ? <p className="overview-updated">Updated {updatedAt}</p> : null}
            </>
          ) : (
            <p className="overview-summary-state">Saved totals are unavailable in this preview. You can still explore the workspaces.</p>
          )}

          <p className="overview-note overview-saved-note">
            Theses, reviews, and decisions are kept in Theses and aren’t included in these totals.
          </p>
        </section>
      </div>
    </div>
  );
}
