import {
  Badge,
  Button,
  Card,
  PageHeader,
  themeCssVariables
} from '@thesis-investing/ui';
import { useMemo, useState } from 'react';

type NavigationView = {
  id: string;
  title: string;
  navLabel: string;
  description: string;
};

const navigationViews: NavigationView[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    navLabel: 'Dashboard',
    description:
      'Future home for a local overview of user-entered watchlist items, thesis notes, reminders, and scoring snapshots. This feature is not built yet.'
  },
  {
    id: 'mbs-scorer',
    title: 'MBS Scorer',
    navLabel: 'MBS Scorer',
    description:
      'Future manual scoring workspace for user-provided inputs and deterministic scoring logic. This feature is not built yet.'
  },
  {
    id: 'portfolio-ranker',
    title: 'Portfolio Ranker',
    navLabel: 'Portfolio Ranker',
    description:
      'Future local comparison view for manually entered holdings. It will organize user-provided information and will not recommend trades. This feature is not built yet.'
  },
  {
    id: 'thesis-monitor',
    title: 'Thesis Monitor',
    navLabel: 'Thesis Monitor',
    description:
      'Future workspace for writing thesis notes and tracking whether user-defined thesis points remain intact. This feature is not built yet.'
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    navLabel: 'Watchlist',
    description:
      'Future local list for manually tracked companies or symbols. No live prices or automated alerts are included yet. This feature is not built yet.'
  },
  {
    id: 'theme-baskets',
    title: 'Theme Baskets',
    navLabel: 'Theme Baskets',
    description:
      'Future area for static educational groupings that help users organize research themes. This feature is not built yet.'
  },
  {
    id: 'reminders',
    title: 'Reminders',
    navLabel: 'Reminders',
    description:
      'Future place for manually entered earnings and thesis review reminders. This feature is not built yet.'
  },
  {
    id: 'settings-about',
    title: 'Settings/About',
    navLabel: 'Settings/About',
    description:
      'Future home for local app preferences, version details, and educational disclaimers. This feature is not built yet.'
  }
];

export function App(): JSX.Element {
  const [selectedViewId, setSelectedViewId] = useState(navigationViews[0].id);
  const selectedView = useMemo(
    () =>
      navigationViews.find((view) => view.id === selectedViewId) ??
      navigationViews[0],
    [selectedViewId]
  );

  return (
    <div className="app-shell" style={themeCssVariables}>
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-area">
          <p className="brand-eyebrow">Thesis Investing</p>
          <h1>Invest with a thesis.</h1>
        </div>

        <nav className="navigation-list" aria-label="MVP areas">
          {navigationViews.map((view) => {
            const isActive = view.id === selectedView.id;

            return (
              <Button
                aria-current={isActive ? 'page' : undefined}
                className={`nav-item${isActive ? ' active' : ''}`}
                fullWidth
                isActive={isActive}
                key={view.id}
                onClick={() => setSelectedViewId(view.id)}
                type="button"
                variant="sidebar"
              >
                {view.navLabel}
              </Button>
            );
          })}
        </nav>

        <p className="safety-note">
          Educational software only. Not financial advice. No brokerage or
          trading execution.
        </p>
      </aside>

      <main className="content-area">
        <PageHeader
          badge={<Badge variant="accent">Not built yet</Badge>}
          description={selectedView.description}
          eyebrow="Phase 1 Offline Windows MVP"
          title={selectedView.title}
        />

        <Card title="Planned workspace">
          <p>
            This placeholder reserves space for a future offline MVP screen.
            No portfolio workflows, scoring actions, live data, or trading
            tools are available here.
          </p>
        </Card>
      </main>
    </div>
  );
}
