import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import './dashboard.css';

type DashboardArea = {
  id: string;
  title: string;
  status: 'available' | 'pending';
  summary: string;
  note: string;
};

type ReadinessItem = {
  label: string;
  status: 'built' | 'pending';
};

const dashboardAreas: DashboardArea[] = [
  {
    id: 'mbs-scorer',
    title: 'Manual MBS Scorer',
    status: 'available',
    summary:
      'Enter category scores by hand and view the deterministic Manual Business Score output.',
    note: 'Manual user input only. Notes do not affect scoring.'
  },
  {
    id: 'portfolio-ranker',
    title: 'Portfolio Ranker',
    status: 'available',
    summary:
      'Rank locally entered ideas by user-provided manual scores without brokerage data.',
    note: 'No prices, imports, allocations, or trade recommendations.'
  },
  {
    id: 'thesis-monitor',
    title: 'Thesis Monitor',
    status: 'available',
    summary:
      'Write and review user-authored thesis notes with user-controlled status labels.',
    note: 'No automated news monitoring or generated analyst commentary.'
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    status: 'available',
    summary:
      'Track manually entered symbols, company names, tags, and local notes.',
    note: 'No live prices, alerts, APIs, or auto-filled company data.'
  },
  {
    id: 'theme-baskets',
    title: 'Theme Baskets',
    status: 'available',
    summary:
      'Browse static educational groupings for organizing research ideas by theme.',
    note: 'Not personalized, ranked, weighted, or a model portfolio.'
  },
  {
    id: 'reminders',
    title: 'Reminders',
    status: 'available',
    summary:
      'Track manually entered earnings, thesis review, and custom dates locally.',
    note: 'No system notifications, background scheduling, APIs, or calendars.'
  }
];

const readinessItems: ReadinessItem[] = [
  { label: 'First-run onboarding', status: 'built' },
  { label: 'Manual MBS scoring', status: 'built' },
  { label: 'Local portfolio ranking', status: 'built' },
  { label: 'Thesis notes and monitoring', status: 'built' },
  { label: 'Manual watchlist', status: 'built' },
  { label: 'Static theme baskets', status: 'built' },
  { label: 'Manual reminders', status: 'built' },
  { label: 'Windows MVP release build', status: 'pending' }
];

const builtWorkflowCount = dashboardAreas.filter(
  (area) => area.status === 'available'
).length;

type DashboardScreenProps = {
  onOpenWorkspace?: (workspaceId: string) => void;
};

function statusBadge(status: DashboardArea['status']): JSX.Element {
  return status === 'available' ? (
    <Badge variant="accent">Available</Badge>
  ) : (
    <Badge variant="neutral">Pending</Badge>
  );
}

export function DashboardScreen({
  onOpenWorkspace
}: DashboardScreenProps): JSX.Element {
  return (
    <div className="dashboard-screen">
      <PageHeader
        badge={<Badge variant="accent">Local overview</Badge>}
        description="A read-only dashboard for the current offline MVP areas. It summarizes local/manual workflows and does not aggregate saved data yet."
        eyebrow="Phase 1 Dashboard"
        title="Dashboard"
      />

      <section className="dashboard-hero-grid" aria-label="Dashboard overview">
        <Card emphasis title="Continue where you left off">
          <div className="dashboard-continue">
            <p>
              Start with scoring, ranking, or thesis notes. Every module stays
              local, manual, and non-advisory.
            </p>
            <div className="dashboard-primary-actions">
              <Button
                onClick={() => onOpenWorkspace?.('mbs-scorer')}
                type="button"
              >
                Open MBS Scorer
              </Button>
              <Button
                onClick={() => onOpenWorkspace?.('portfolio-ranker')}
                type="button"
                variant="secondary"
              >
                Rank portfolio
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Recent activity">
          <div className="dashboard-empty-state">
            <span className="dashboard-empty-icon" aria-hidden="true">
              +
            </span>
            <div>
              <h3>No activity timeline yet</h3>
              <p>
                Saved activity is not aggregated in this MVP. Use the modules
                below to continue manual work.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <Card title="Offline MVP snapshot">
        <div className="dashboard-disclaimer">
          This dashboard is static and local for this stage. No live prices,
          stock APIs, brokerage import, trading execution, AI summaries, analyst
          commentary, cloud sync, or personalized financial advice are used.
        </div>

        <div className="dashboard-metrics" aria-label="Dashboard metrics">
          <div className="dashboard-metric">
            <span>Manual workflows available</span>
            <strong>{builtWorkflowCount}</strong>
          </div>
          <div className="dashboard-metric">
            <span>Live data integrations</span>
            <strong>0</strong>
          </div>
          <div className="dashboard-metric">
            <span>Brokerage connections</span>
            <strong>0</strong>
          </div>
          <div className="dashboard-metric">
            <span>Pending MVP areas</span>
            <strong>1</strong>
          </div>
        </div>
      </Card>

      <Card title="Quick actions">
        <div className="dashboard-area-grid">
          {dashboardAreas.map((area) => (
            <article className="dashboard-area-card" key={area.title}>
              <div className="dashboard-area-card-header">
                <h2>{area.title}</h2>
                {statusBadge(area.status)}
              </div>
              <p>{area.summary}</p>
              <small>{area.note}</small>
              <button
                className="dashboard-next-step"
                disabled={area.status !== 'available'}
                onClick={() => onOpenWorkspace?.(area.id)}
                type="button"
              >
                {area.status === 'available' ? 'Open workspace' : 'Coming soon'}
              </button>
            </article>
          ))}
        </div>
      </Card>

      <div className="dashboard-lower-grid">
        <Card title="MVP readiness checklist">
          <ul className="dashboard-checklist">
            {readinessItems.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <Badge
                  variant={item.status === 'built' ? 'accent' : 'neutral'}
                >
                  {item.status === 'built' ? 'Built' : 'Pending'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Use this dashboard for">
          <div className="dashboard-guide">
            <p>
              Start here to see which local MVP areas are available, then open a
              workspace from the sidebar. Each built area still uses
              user-directed manual inputs.
            </p>
            <p>
              This overview is educational software only. It is not a
              recommendation to buy, sell, hold, size, rank, or allocate any
              security.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
