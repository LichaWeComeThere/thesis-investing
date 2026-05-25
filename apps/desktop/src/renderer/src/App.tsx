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
      'Overview of the local research workspaces, saved state, and next actions.'
  },
  {
    id: 'mbs-scorer',
    title: 'MBS Scorer',
    navLabel: 'MBS Scorer',
    icon: 'mbs-scorer',
    description:
      'Score business quality, moat, management, balance sheet, growth, valuation, and risk.'
  },
  {
    id: 'portfolio-ranker',
    title: 'Thesis Rankings',
    navLabel: 'Thesis Rankings',
    icon: 'portfolio-ranker',
    description:
      'Compare saved ideas with user-entered thesis scores and focused ranking output.'
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
      'Track companies, tags, thesis references, and research notes in one local list.'
  },
  {
    id: 'theme-baskets',
    title: 'Theme Baskets',
    navLabel: 'Theme Baskets',
    icon: 'theme-baskets',
    description:
      'Browse research themes and example companies for organizing new ideas.'
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
    title: 'App Settings',
    navLabel: 'App Settings',
    icon: 'settings-about',
    description:
      'Review app mode, local-first boundaries, and workspace preferences.'
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
          description="A Windows-first workspace for building investment discipline through scoring, thesis notes, watchlists, and review dates."
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
              Thesis Investing keeps your research process structured before
              the app connects to live services. Start with local scoring,
              thesis notes, watchlists, and review workflows.
            </p>

            <ul>
              <li>Build a repeatable thesis workflow.</li>
              <li>Compare ideas with consistent local scoring.</li>
              <li>Keep review dates close to the research that matters.</li>
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
          <p className="brand-eyebrow">conviction</p>
          <h1>Invest with a thesis.</h1>
          <Badge className="local-mode-badge" variant="accent">
            Local Data Mode
          </Badge>
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
        ) : selectedView.id === 'settings-about' ? (
          <SettingsAboutScreen onResetOnboarding={onResetOnboarding} />
        ) : (
          <div className="planned-workspace-screen">
            <PageHeader
              badge={<Badge variant="accent">{selectedView.title}</Badge>}
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

function SettingsAboutScreen({
  onResetOnboarding
}: AppShellProps): JSX.Element {
  return (
    <div className="settings-about-screen">
      <PageHeader
        badge={<Badge variant="accent">App Settings</Badge>}
        description="Review the local workspace mode, app boundaries, and first-run onboarding controls."
        eyebrow="Settings/About"
        title="App Settings"
      />

      <div className="settings-about-grid">
        <Card title="Workspace mode">
          <div className="settings-mode-panel">
            <p>
              Thesis Investing currently runs as a local-first workspace. Your
              scoring, thesis notes, watchlist entries, theme browsing, and
              review dates are designed around local inputs while live
              integrations remain off.
            </p>
          </div>
        </Card>

        <Card title="Educational boundaries">
          <div className="settings-disclaimer">
            <p>
              Thesis Investing is educational software only. It is not financial
              advice, investment advice, a brokerage, a trading execution
              platform, or a recommendation to buy, sell, hold, size, rank, or
              allocate any security.
            </p>
            <p>
              The app does not connect to brokerage accounts, execute trades,
              sync to cloud services, or call live stock APIs in this version.
            </p>
          </div>
        </Card>

        <Card title="Onboarding">
          <div className="settings-actions">
            <Button onClick={onResetOnboarding} type="button" variant="secondary">
              Reset onboarding
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
