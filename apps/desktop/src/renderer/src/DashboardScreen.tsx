import { Badge, Card, PageHeader } from '@thesis-investing/ui';
import {
  formatScoreChange,
  getLargestScoreDropThesis,
  getNextReviewThesis,
  getScoreChange,
  getTopImprovingThesis,
  getWeakestThesis,
  isNeedsReviewThesis,
  mockTheses,
  type MockThesis
} from './data/mockTheses';
import { MarketPulseFeed } from './MarketPulseFeed';
import './dashboard.css';

type ThesisHealthTone = 'tracked' | 'strong' | 'review' | 'weakening';

type ThesisHealthItem = {
  label: string;
  value: number;
  tone: ThesisHealthTone;
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

const quickActions: QuickAction[] = [
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
  onOpenWorkspace?: (workspaceId: string) => void;
  theses?: MockThesis[];
};

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

  const weakestThesis = getWeakestThesis(theses);
  const largestDropThesis = getLargestScoreDropThesis(theses);
  const topImprovingThesis = getTopImprovingThesis(theses);
  const nextReviewThesis = getNextReviewThesis(theses);

  return [
    {
      label: 'Weakest Idea',
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
    },
    {
      label: 'Review Due Soon',
      ticker: nextReviewThesis.ticker,
      detail: `Next review ${nextReviewThesis.nextReviewDate}.`,
      tone: 'tracked'
    }
  ];
}

export function DashboardScreen({
  onOpenWorkspace,
  theses = mockTheses
}: DashboardScreenProps): JSX.Element {
  const thesisHealthItems: ThesisHealthItem[] = [
    { label: 'Theses tracked', value: theses.length, tone: 'tracked' },
    {
      label: 'Needs review',
      value: theses.filter(isNeedsReviewThesis).length,
      tone: 'review'
    },
    {
      label: 'Weakening',
      value: theses.filter((thesis) => thesis.thesisStatus === 'Weakening')
        .length,
      tone: 'weakening'
    },
    {
      label: 'Strong conviction',
      value: theses.filter((thesis) => thesis.conviction === 'High').length,
      tone: 'strong'
    }
  ];
  const reviewPriorityItems = getReviewPriorityItems(theses);
  const recentActivityItems: RecentActivityItem[] = theses
    .flatMap((thesis) =>
      thesis.decisionLog.map((entry) => ({
        ticker: thesis.ticker,
        action: entry.title,
        detail: entry.note,
        tone: getDashboardTone(thesis)
      }))
    )
    .slice(0, 3);

  return (
    <div className="dashboard-screen">
      <PageHeader
        badge={<Badge variant="accent">Command Center</Badge>}
        description="Review thesis health, priority ideas, market context, and the next research actions."
        eyebrow="Investor Command Center"
        title="Dashboard"
      />

      <div className="dashboard-content-layout">
        <MarketPulseFeed />

        <div className="dashboard-main-stack">
          <section className="dashboard-health-section" aria-label="Thesis health">
            <div className="dashboard-section-heading">
              <h2>Thesis Health Overview</h2>
              <p>Today&apos;s local research queue.</p>
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
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="dashboard-command-grid" aria-label="Review focus">
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
                <span>Regime</span>
                <strong>Under Pressure</strong>
              </div>
              <p>Growth stocks need caution.</p>
              <div className="market-regime-tags">
                <Badge variant="warning">Risk check</Badge>
                <Badge variant="neutral">Research context</Badge>
              </div>
            </Card>
          </section>

          <section className="dashboard-lower-grid" aria-label="Activity and actions">
            <Card title="Recent Thesis Activity">
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
