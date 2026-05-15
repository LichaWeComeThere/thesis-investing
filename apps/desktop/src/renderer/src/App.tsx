import {
  Badge,
  Button,
  Card,
  PageHeader,
  themeCssVariables
} from '@thesis-investing/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  resetOnboardingCompletion
} from './onboardingState';
import { DashboardScreen } from './DashboardScreen';
import { ManualMbsScorerScreen } from './ManualMbsScorerScreen';
import { PortfolioRankerScreen } from './PortfolioRankerScreen';
import { ThemeBasketsScreen } from './ThemeBasketsScreen';
import { ThesisMonitorScreen } from './ThesisMonitorScreen';
import { WatchlistScreen } from './WatchlistScreen';

type NavigationView = {
  id: string;
  title: string;
  navLabel: string;
  navSubtitle: string;
  description: string;
};

const navigationViews: NavigationView[] = [
  {
    id: 'overview',
    title: 'Dashboard',
    navLabel: 'Dashboard',
    navSubtitle: 'Main overview',
    description:
<<<<<<< Updated upstream
      'Local overview of the offline MVP areas, current readiness, and product boundaries.'
=======
      'A single home for watchlist, thesis, and reminder signals will land here. This build routes each sidebar item to its own workspace—no long scrolling document.'
>>>>>>> Stashed changes
  },
  {
    id: 'mbs-scorer',
    title: 'MBS Scorer',
    navLabel: 'MBS Scorer',
    navSubtitle: 'Score stocks',
    description:
      'Enter seven category scores from 0–10. Thesis Investing applies fixed on-device weights for a deterministic Manual Business Score—educational software, not a buy, sell, or hold call.'
  },
  {
    id: 'positions',
    title: 'Portfolio Ranker',
    navLabel: 'Portfolio Ranker',
    navSubtitle: 'Rank positions',
    description:
      'Add tickers, optional names, and a manual 0–100 score for each idea. The app sorts your rows locally for side-by-side comparison—still non-advisory with no brokerage or market feeds.'
  },
  {
    id: 'thesis-desk',
    title: 'Thesis Monitor',
    navLabel: 'Thesis Monitor',
    navSubtitle: 'Track thesis',
    description:
      'Author thesis notes with conviction and status fields you control. Everything stays user-written and educational—no AI rewrites, cloud sync, or recommendations.'
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    navLabel: 'Watchlist',
    navSubtitle: 'Saved ideas',
    description:
      'Maintain a manual watchlist with optional context fields. There are no live quotes, alerts, brokerage hooks, or automated ingestion—just your entries in this session.'
  },
  {
    id: 'research',
    title: 'Theme Baskets',
    navLabel: 'Theme Baskets',
    navSubtitle: 'Research themes',
    description:
      'Browse curated, static baskets that group example tickers by research theme. They are teaching aids only—not model portfolios, personalized advice, or live strategies.'
  },
  {
    id: 'communications',
    title: 'Reminders',
    navLabel: 'Reminders',
    navSubtitle: 'Alerts & tasks',
    description:
      'Reminder lists and lightweight task trails will connect here in a future build. For now this workspace is a placeholder—no external APIs or sync.'
  },
  {
    id: 'settings',
    title: 'Settings/About',
    navLabel: 'Settings/About',
    navSubtitle: 'App settings',
    description:
      'App preferences, version metadata, and expanded disclaimers will move here. For now this workspace still exposes the onboarding reset control below.'
  }
];

const svgProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const
};

function NavGlyph({ navId }: { navId: string }): JSX.Element {
  switch (navId) {
    case 'overview':
      return (
        <svg {...svgProps}>
          <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      );
    case 'mbs-scorer':
      return (
        <svg {...svgProps}>
          <path d="M4 19V5M9 19V9m5 10V7m5 12v-8" />
        </svg>
      );
    case 'positions':
      return (
        <svg {...svgProps}>
          <path d="M3 3h7v7H3V3zm11 0h7v4h-7V3zM3 14h7v7H3v-7zm11 3h7v4h-7v-4z" />
        </svg>
      );
    case 'thesis-desk':
      return (
        <svg {...svgProps}>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      );
    case 'watchlist':
      return (
        <svg {...svgProps}>
          <path d="M9 5H7a2 2 0 00-2 2v12l7-4 7 4V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'research':
      return (
        <svg {...svgProps}>
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'communications':
      return (
        <svg {...svgProps}>
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}

function renderWorkspace(
  view: NavigationView,
  onResetOnboarding: () => void
): JSX.Element {
  switch (view.id) {
    case 'mbs-scorer':
      return <ManualMbsScorerScreen />;
    case 'positions':
      return <PortfolioRankerScreen />;
    case 'thesis-desk':
      return <ThesisMonitorScreen />;
    case 'watchlist':
      return <WatchlistScreen />;
    case 'research':
      return <ThemeBasketsScreen />;
    default:
      return (
        <>
          <PageHeader
            badge={<Badge variant="accent">Coming soon</Badge>}
            description={view.description}
            eyebrow="Thesis Investing"
            title={view.title}
          />

          <Card title="This workspace is not available yet">
            <p>
              The navigation entry is wired as its own module, but the full
              experience for this area is still in development. MBS Scorer,
              Portfolio Ranker, Thesis Monitor, Watchlist, and Theme Baskets
              already open in their own workspaces—without live market data,
              brokerage connectivity, or automated trading.
            </p>

            {view.id === 'settings' ? (
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
        </>
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
  const contentRef = useRef<HTMLElement>(null);

  const selectedView = useMemo(
    () =>
      navigationViews.find((v) => v.id === selectedViewId) ?? navigationViews[0],
    [selectedViewId]
  );

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      el.scrollTop = 0;
    }
  }, [selectedViewId]);

  return (
    <div className="app-shell" style={themeCssVariables}>
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-area">
          <p className="brand-eyebrow">Thesis Investing</p>
          <h1>Invest with a thesis.</h1>
        </div>

        <nav className="navigation-list" aria-label="Workspaces">
          {navigationViews.map((view) => {
            const isActive = view.id === selectedView.id;

            return (
              <Button
                aria-current={isActive ? 'page' : undefined}
                className={`nav-item nav-item--stack${isActive ? ' active' : ''}`}
                fullWidth
                isActive={isActive}
                key={view.id}
                onClick={() => setSelectedViewId(view.id)}
                title={view.description}
                type="button"
                variant="sidebar"
              >
                <span className="nav-item-row">
                  <span className="nav-item-icon-wrap">
                    <NavGlyph navId={view.id} />
                  </span>
                  <span className="nav-item-stack">
                    <span className="nav-item-label">{view.navLabel}</span>
                    <span className="nav-item-subtitle">{view.navSubtitle}</span>
                  </span>
                </span>
              </Button>
            );
          })}
        </nav>

        <p className="safety-note">
          Educational software—not personalized advice. No brokerage access or
          trade execution.
        </p>
      </aside>

<<<<<<< Updated upstream
      <main className="content-area">
        {selectedView.id === 'dashboard' ? (
          <DashboardScreen />
        ) : selectedView.id === 'mbs-scorer' ? (
          <ManualMbsScorerScreen />
        ) : selectedView.id === 'portfolio-ranker' ? (
          <PortfolioRankerScreen />
        ) : selectedView.id === 'thesis-monitor' ? (
          <ThesisMonitorScreen />
        ) : selectedView.id === 'watchlist' ? (
          <WatchlistScreen />
        ) : selectedView.id === 'theme-baskets' ? (
          <ThemeBasketsScreen />
        ) : (
          <>
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
          </>
        )}
=======
      <main ref={contentRef} className="content-area">
        <div key={selectedViewId} className="workspace-panel">
          {renderWorkspace(selectedView, onResetOnboarding)}
        </div>
>>>>>>> Stashed changes
      </main>
    </div>
  );
}
