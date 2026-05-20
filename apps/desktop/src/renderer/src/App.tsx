import {
  Badge,
  Button,
  Card,
  PageHeader,
  themeCssVariables
} from '@thesis-investing/ui';
import { useMemo, useState } from 'react';
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  resetOnboardingCompletion
} from './onboardingState';
import { DashboardScreen } from './DashboardScreen';
import { ManualMbsScorerScreen } from './ManualMbsScorerScreen';
import { PortfolioRankerScreen } from './PortfolioRankerScreen';
import { RemindersScreen } from './RemindersScreen';
import { ThemeBasketsScreen } from './ThemeBasketsScreen';
import { ThesisMonitorScreen } from './ThesisMonitorScreen';
import { WatchlistScreen } from './WatchlistScreen';

type NavigationView = {
  id: string;
  title: string;
  navLabel: string;
  description: string;
  icon: NavigationIconId;
};

type NavigationIconId =
  | 'dashboard'
  | 'mbs-scorer'
  | 'portfolio-ranker'
  | 'thesis-monitor'
  | 'watchlist'
  | 'theme-baskets'
  | 'reminders'
  | 'settings-about';

const navigationViews: NavigationView[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    navLabel: 'Dashboard',
    icon: 'dashboard',
    description:
      'Local overview of the offline MVP areas, current readiness, and product boundaries.'
  },
  {
    id: 'mbs-scorer',
    title: 'MBS Scorer',
    navLabel: 'MBS Scorer',
    icon: 'mbs-scorer',
    description:
      'Future manual scoring workspace for user-provided inputs and deterministic scoring logic. This feature is not built yet.'
  },
  {
    id: 'portfolio-ranker',
    title: 'Portfolio Ranker',
    navLabel: 'Portfolio Ranker',
    icon: 'portfolio-ranker',
    description:
      'Future local comparison view for manually entered holdings. It will organize user-provided information and will not recommend trades. This feature is not built yet.'
  },
  {
    id: 'thesis-monitor',
    title: 'Thesis Monitor',
    navLabel: 'Thesis Monitor',
    icon: 'thesis-monitor',
    description:
      'Future workspace for writing thesis notes and tracking whether user-defined thesis points remain intact. This feature is not built yet.'
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    navLabel: 'Watchlist',
    icon: 'watchlist',
    description:
      'Future local list for manually tracked companies or symbols. No live prices or automated alerts are included yet. This feature is not built yet.'
  },
  {
    id: 'theme-baskets',
    title: 'Theme Baskets',
    navLabel: 'Theme Baskets',
    icon: 'theme-baskets',
    description:
      'Future area for static educational groupings that help users organize research themes. This feature is not built yet.'
  },
  {
    id: 'reminders',
    title: 'Reminders',
    navLabel: 'Reminders',
    icon: 'reminders',
    description:
      'Local place for manually entered earnings, thesis review, and custom reminder dates.'
  },
  {
    id: 'settings-about',
    title: 'Settings/About',
    navLabel: 'Settings/About',
    icon: 'settings-about',
    description:
      'Future home for local app preferences, version details, and educational disclaimers. This feature is not built yet.'
  }
];

const navIconProps = {
  'aria-hidden': true,
  className: 'nav-item-icon',
  fill: 'none',
  height: 18,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.9,
  viewBox: '0 0 24 24',
  width: 18
};

function NavigationIcon({ icon }: { icon: NavigationIconId }): JSX.Element {
  switch (icon) {
    case 'dashboard':
      return (
        <svg {...navIconProps}>
          <rect height="7" rx="1.5" width="7" x="3" y="3" />
          <rect height="7" rx="1.5" width="7" x="14" y="3" />
          <rect height="7" rx="1.5" width="7" x="3" y="14" />
          <rect height="7" rx="1.5" width="7" x="14" y="14" />
        </svg>
      );
    case 'mbs-scorer':
      return (
        <svg {...navIconProps}>
          <path d="M8 7h8" />
          <path d="M8 12h4" />
          <path d="m15 13 1.5 1.5L20 11" />
          <rect height="18" rx="3" width="16" x="4" y="3" />
        </svg>
      );
    case 'portfolio-ranker':
      return (
        <svg {...navIconProps}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      );
    case 'thesis-monitor':
      return (
        <svg {...navIconProps}>
          <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
        </svg>
      );
    case 'watchlist':
      return (
        <svg {...navIconProps}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case 'theme-baskets':
      return (
        <svg {...navIconProps}>
          <path d="m7 10 5-6 5 6" />
          <path d="M4 10h16l-2 10H6L4 10z" />
          <path d="M9 14v2M15 14v2" />
        </svg>
      );
    case 'reminders':
      return (
        <svg {...navIconProps}>
          <path d="M14 4 20 10" />
          <path d="m10 8 6 6" />
          <path d="m12 16-6 4 4-6" />
          <path d="m8 6 10 10" />
        </svg>
      );
    case 'settings-about':
      return (
        <svg {...navIconProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 0 1-4 0v-.07a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.05-.05A2 2 0 1 1 7.05 4.3l.05.05A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.49a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.65 1.65 0 0 0 19.4 9c.18.52.67.88 1.22.88H21a2 2 0 0 1 0 4h-.38A1.65 1.65 0 0 0 19.4 15z" />
        </svg>
      );
  }
}

export function App(): JSX.Element {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(() =>
    hasCompletedOnboarding()
  );

  function completeOnboarding(): void {
    markOnboardingCompleted();
    setIsOnboardingComplete(true);
  }

  function resetOnboarding(): void {
    resetOnboardingCompletion();
    setIsOnboardingComplete(false);
  }

  if (!isOnboardingComplete) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return <AppShell onResetOnboarding={resetOnboarding} />;
}

type OnboardingScreenProps = {
  onComplete: () => void;
};

function OnboardingScreen({
  onComplete
}: OnboardingScreenProps): JSX.Element {
  return (
    <main className="onboarding-screen" style={themeCssVariables}>
      <div className="onboarding-layout">
        <PageHeader
          badge={<Badge variant="accent">Offline-first</Badge>}
          description="A Windows-first desktop app for building investment discipline through user-directed scoring, thesis notes, and manual tracking."
          eyebrow="Welcome"
          title="Thesis Investing"
        />

        <Card
          footer={
            <Button onClick={onComplete} type="button">
              Continue
            </Button>
          }
          title="Invest with a thesis."
        >
          <div className="onboarding-copy">
            <p>
              Thesis Investing is educational software for organizing your own
              research process. It does not provide personalized financial
              advice, investment recommendations, or instructions to buy, sell,
              or hold any security.
            </p>

            <ul>
              <li>No brokerage connections or trading execution.</li>
              <li>No live stock APIs or automated market data yet.</li>
              <li>Offline-first workflows built around manual user input.</li>
            </ul>
          </div>
        </Card>
      </div>
    </main>
  );
}

type AppShellProps = {
  onResetOnboarding: () => void;
};

function AppShell({ onResetOnboarding }: AppShellProps): JSX.Element {
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
                <span className="nav-item-icon-shell">
                  <NavigationIcon icon={view.icon} />
                </span>
                <span className="nav-item-label">{view.navLabel}</span>
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
        {selectedView.id === 'dashboard' ? (
          <DashboardScreen onOpenWorkspace={setSelectedViewId} />
        ) : selectedView.id === 'mbs-scorer' ? (
          <ManualMbsScorerScreen />
        ) : selectedView.id === 'portfolio-ranker' ? (
          <PortfolioRankerScreen onOpenWorkspace={setSelectedViewId} />
        ) : selectedView.id === 'thesis-monitor' ? (
          <ThesisMonitorScreen />
        ) : selectedView.id === 'watchlist' ? (
          <WatchlistScreen />
        ) : selectedView.id === 'theme-baskets' ? (
          <ThemeBasketsScreen />
        ) : selectedView.id === 'reminders' ? (
          <RemindersScreen />
        ) : (
          <div className="planned-workspace-screen">
            <PageHeader
              badge={<Badge variant="accent">Not built yet</Badge>}
              description={selectedView.description}
              eyebrow="Phase 1 Offline Windows MVP"
              title={selectedView.title}
            />

            <Card className="planned-workspace-card" title="Planned workspace">
              <div className="planned-workspace-empty">
                <span aria-hidden="true">+</span>
                <div>
                  <h2>{selectedView.title}</h2>
                  <p>
                    This placeholder reserves space for a future offline MVP
                    screen. No portfolio workflows, scoring actions, live data,
                    or trading tools are available here.
                  </p>
                </div>
              </div>

              {selectedView.id === 'settings-about' ? (
                <div className="settings-actions">
                  <Button
                    onClick={onResetOnboarding}
                    type="button"
                    variant="secondary"
                  >
                    Reset onboarding
                  </Button>
                </div>
              ) : null}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
