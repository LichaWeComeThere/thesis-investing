import {
  Badge,
  Button,
  Card,
  PageHeader,
  themeCssVariables
} from '@thesis-investing/ui';
import { useEffect, useMemo, useState } from 'react';
import type {
  LocalDataExportOutcome,
  LocalDataInfo,
  LocalDataImportOutcome,
  LocalDataImportPreview
} from '../../shared/localDataStorage';
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
import {
  cloneMockTheses,
  createMockThesisFromMbsScore,
  saveMockMbsScoreToThesis,
  type CreateMockThesisInput,
  type MockThesis
} from './data/mockTheses';
import {
  getDefaultLocalDataStorageClient,
  type LocalDataStorageClient
} from './localDataStorageClient';

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
    title: 'Portfolio Ranker',
    navLabel: 'Portfolio Ranker',
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
      'Write, persist, and review local thesis notes while tracking user-defined thesis status.'
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
    title: 'Settings/About',
    navLabel: 'Settings/About',
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
  const [theses, setTheses] = useState<MockThesis[]>(() => cloneMockTheses());
  const selectedView = useMemo(
    () =>
      navigationViews.find((view) => view.id === selectedViewId) ??
      navigationViews[0],
    [selectedViewId]
  );

  function updateThesisScore(
    thesisId: string,
    nextScore: number,
    updatedAt: string
  ): void {
    setTheses((currentTheses) =>
      saveMockMbsScoreToThesis(currentTheses, thesisId, nextScore, updatedAt)
    );
  }

  function createThesisFromMbsScore(
    input: CreateMockThesisInput
  ): MockThesis {
    const nextThesis = createMockThesisFromMbsScore(theses, input);

    setTheses((currentTheses) => [...currentTheses, nextThesis]);

    return nextThesis;
  }

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

        <nav className="navigation-list" aria-label="Research workspaces">
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
          <DashboardScreen onOpenWorkspace={setSelectedViewId} theses={theses} />
        ) : selectedView.id === 'mbs-scorer' ? (
          <ManualMbsScorerScreen
            onCreateThesis={createThesisFromMbsScore}
            onUpdateThesisScore={updateThesisScore}
            theses={theses}
          />
        ) : selectedView.id === 'portfolio-ranker' ? (
          <PortfolioRankerScreen
            onOpenWorkspace={setSelectedViewId}
            theses={theses}
          />
        ) : selectedView.id === 'thesis-monitor' ? (
          <ThesisMonitorScreen theses={theses} />
        ) : selectedView.id === 'watchlist' ? (
          <WatchlistScreen theses={theses} />
        ) : selectedView.id === 'theme-baskets' ? (
          <ThemeBasketsScreen />
        ) : selectedView.id === 'reminders' ? (
          <RemindersScreen onOpenWorkspace={setSelectedViewId} />
        ) : selectedView.id === 'settings-about' ? (
          <SettingsAboutScreen onResetOnboarding={onResetOnboarding} />
        ) : (
          <div className="planned-workspace-screen">
            <PageHeader
              badge={<Badge variant="accent">{selectedView.title}</Badge>}
              description={selectedView.description}
              eyebrow="Local workspace"
              title={selectedView.title}
            />

            <Card className="planned-workspace-card" title="Planned workspace">
              <div className="planned-workspace-empty">
                <span aria-hidden="true">+</span>
                <div>
                  <h2>{selectedView.title}</h2>
                  <p>
                    This workspace is reserved for a future research screen.
                    No portfolio workflows, scoring actions, live data, or
                    trading tools are available here.
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

const persistedWorkflowFallback = [
  'Watchlist',
  'Thesis Notes',
  'Reminders',
  'Portfolio Ranker Inputs',
  'MBS Score Snapshots',
  'Dashboard summaries read persisted local data'
];

const localOnlyItemFallback = [
  'Theme Library uses included reference content',
  'Selected route, filters, search, and sort controls',
  'In-progress form drafts unless explicitly saved',
  'Onboarding preference is saved locally'
];

const localDataDisplayLabels: Record<string, string> = {
  'Onboarding completion currently uses localStorage':
    'Onboarding preference is saved locally',
  'Theme Baskets are static local content':
    'Theme Library uses included reference content'
};

function formatLocalDataDisplayLabel(label: string): string {
  return localDataDisplayLabels[label] ?? label;
}

type SettingsAboutScreenProps = AppShellProps & {
  initialLocalDataExportState?: LocalDataExportState;
  initialLocalDataImportState?: LocalDataImportState;
  initialLocalDataErrors?: string[];
  initialLocalDataInfo?: LocalDataInfo;
  localDataClient?: LocalDataStorageClient | null;
};

type LocalDataExportState =
  | {
      status: 'idle';
    }
  | {
      status: 'exporting';
    }
  | {
      outcome: Extract<LocalDataExportOutcome, { status: 'completed' }>;
      status: 'completed';
    }
  | {
      status: 'canceled';
    }
  | {
      errors: string[];
      status: 'error';
    };

type LocalDataImportState =
  | {
      status: 'idle';
    }
  | {
      status: 'selecting';
    }
  | {
      preview: LocalDataImportPreview;
      status: 'preview';
    }
  | {
      preview: LocalDataImportPreview;
      status: 'importing';
    }
  | {
      outcome: LocalDataImportOutcome;
      status: 'completed';
    }
  | {
      status: 'canceled';
    }
  | {
      errors: string[];
      status: 'error';
    };

export function SettingsAboutScreen({
  initialLocalDataExportState,
  initialLocalDataImportState,
  initialLocalDataErrors,
  initialLocalDataInfo,
  localDataClient,
  onResetOnboarding
}: SettingsAboutScreenProps): JSX.Element {
  const resolvedLocalDataClient = useMemo(
    () =>
      localDataClient === undefined
        ? getDefaultLocalDataStorageClient()
        : localDataClient,
    [localDataClient]
  );
  const [localDataInfo, setLocalDataInfo] = useState<LocalDataInfo | null>(
    () => initialLocalDataInfo ?? null
  );
  const [localDataErrors, setLocalDataErrors] = useState<string[]>(
    () => initialLocalDataErrors ?? []
  );
  const [isLocalDataLoading, setIsLocalDataLoading] = useState(
    () =>
      resolvedLocalDataClient !== null &&
      initialLocalDataInfo === undefined &&
      initialLocalDataErrors === undefined
  );
  const [localDataExportState, setLocalDataExportState] =
    useState<LocalDataExportState>(
      () => initialLocalDataExportState ?? { status: 'idle' }
    );
  const [localDataImportState, setLocalDataImportState] =
    useState<LocalDataImportState>(
      () => initialLocalDataImportState ?? { status: 'idle' }
    );

  useEffect(() => {
    if (
      initialLocalDataInfo !== undefined ||
      initialLocalDataErrors !== undefined
    ) {
      setIsLocalDataLoading(false);
      return;
    }

    if (!resolvedLocalDataClient) {
      setIsLocalDataLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLocalDataLoading(true);
    setLocalDataErrors([]);

    void resolvedLocalDataClient
      .get()
      .then((result) => {
        if (isCancelled) {
          return;
        }

        if (result.ok) {
          setLocalDataInfo(result.value);
          setLocalDataErrors([]);
        } else {
          setLocalDataErrors(result.errors);
        }
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setLocalDataErrors([
          error instanceof Error
            ? error.message
            : 'Unable to load local data status.'
        ]);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLocalDataLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [initialLocalDataErrors, initialLocalDataInfo, resolvedLocalDataClient]);

  const persistedWorkflows =
    localDataInfo?.persistedWorkflows ?? persistedWorkflowFallback;
  const localOnlyItems = localDataInfo?.localOnlyItems ?? localOnlyItemFallback;
  const isImportBusy =
    localDataImportState.status === 'selecting' ||
    localDataImportState.status === 'importing';
  const isExportDisabled =
    localDataExportState.status === 'exporting' ||
    isImportBusy ||
    !resolvedLocalDataClient;
  const isImportDisabled =
    localDataExportState.status === 'exporting' ||
    isImportBusy ||
    !resolvedLocalDataClient;
  const activeImportPreview =
    localDataImportState.status === 'preview' ||
    localDataImportState.status === 'importing'
      ? localDataImportState.preview
      : null;

  async function exportLocalData(): Promise<void> {
    if (!resolvedLocalDataClient) {
      setLocalDataExportState({
        status: 'error',
        errors: ['Local data export is available only inside the desktop app.']
      });
      return;
    }

    setLocalDataExportState({ status: 'exporting' });

    try {
      const result = await resolvedLocalDataClient.exportToJson();

      if (!result.ok) {
        setLocalDataExportState({
          status: 'error',
          errors: result.errors
        });
        return;
      }

      if (result.value.status === 'canceled') {
        setLocalDataExportState({ status: 'canceled' });
        return;
      }

      setLocalDataExportState({
        status: 'completed',
        outcome: result.value
      });
    } catch (error) {
      setLocalDataExportState({
        status: 'error',
        errors: [
          error instanceof Error
            ? error.message
            : 'Unable to export local data.'
        ]
      });
    }
  }

  async function previewLocalDataImport(): Promise<void> {
    if (!resolvedLocalDataClient) {
      setLocalDataImportState({
        status: 'error',
        errors: ['Local data import is available only inside the desktop app.']
      });
      return;
    }

    setLocalDataImportState({ status: 'selecting' });

    try {
      const result = await resolvedLocalDataClient.previewImportFromJson();

      if (!result.ok) {
        setLocalDataImportState({ status: 'error', errors: result.errors });
        return;
      }

      if (result.value.status === 'canceled') {
        setLocalDataImportState({ status: 'canceled' });
        return;
      }

      setLocalDataImportState({
        status: 'preview',
        preview: result.value.preview
      });
    } catch (error) {
      setLocalDataImportState({
        status: 'error',
        errors: [
          error instanceof Error
            ? error.message
            : 'Unable to preview local data import.'
        ]
      });
    }
  }

  async function confirmLocalDataImport(
    preview: LocalDataImportPreview
  ): Promise<void> {
    if (!resolvedLocalDataClient) {
      setLocalDataImportState({
        status: 'error',
        errors: ['Local data import is available only inside the desktop app.']
      });
      return;
    }

    setLocalDataImportState({ status: 'importing', preview });

    try {
      const result = await resolvedLocalDataClient.importFromJson(
        preview.previewId
      );

      if (!result.ok) {
        setLocalDataImportState({ status: 'error', errors: result.errors });
        return;
      }

      setLocalDataImportState({ status: 'completed', outcome: result.value });
    } catch (error) {
      setLocalDataImportState({
        status: 'error',
        errors: [
          error instanceof Error
            ? error.message
            : 'Unable to import local data.'
        ]
      });
    }
  }

  return (
    <div className="settings-about-screen">
      <PageHeader
        badge={<Badge variant="accent">Settings/About</Badge>}
        description="Review local workspace mode, data visibility, app boundaries, and onboarding controls."
        eyebrow="Settings/About"
        title="Settings/About"
      />

      <div className="settings-about-grid">
        <Card title="Workspace mode">
          <div className="settings-mode-panel">
            <p>
              Thesis Investing currently runs as a local-first, offline
              workspace. Saved records stay on this device while live
              integrations remain off.
            </p>
          </div>
        </Card>

        <Card title="Local data status">
          <div className="local-data-status-panel">
            <p>
              Your saved Thesis Investing records are stored locally on this
              computer. Export creates a JSON backup, while import accepts only
              Thesis Investing export files, previews them first, and appends
              records only after confirmation. Existing records are never
              overwritten or deleted.
            </p>

            <div className="local-data-status-grid">
              <section aria-label="Local storage location">
                <h2>Storage location</h2>
                {isLocalDataLoading ? (
                  <p className="local-data-status-message">
                    Loading local data status.
                  </p>
                ) : localDataErrors.length > 0 ? (
                  <div className="local-data-status-error" role="alert">
                    <strong>Unable to load local data status.</strong>
                    <ul>
                      {localDataErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : localDataInfo ? (
                  <dl className="local-data-status-list">
                    <div>
                      <dt>App data folder</dt>
                      <dd>
                        <code>{localDataInfo.userDataPath}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>SQLite database</dt>
                      <dd>
                        <code>{localDataInfo.databasePath}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Database file</dt>
                      <dd>
                        {localDataInfo.databaseFileExists
                          ? 'Created on this device'
                          : 'Not created yet'}
                      </dd>
                    </div>
                    <div>
                      <dt>Storage adapter</dt>
                      <dd>{localDataInfo.storageAdapter}</dd>
                    </div>
                    <div>
                      <dt>Status generated</dt>
                      <dd>{formatLocalDataTimestamp(localDataInfo.generatedAt)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="local-data-status-message">
                    Local data path is available only inside the desktop app.
                  </p>
                )}
              </section>

              <section aria-label="Persisted local workflows">
                <h2>Persisted locally</h2>
                <ul>
                  {persistedWorkflows.map((workflow) => (
                    <li key={workflow}>{workflow}</li>
                  ))}
                </ul>
              </section>

              <section aria-label="Local-only items">
                <h2>Local-only items</h2>
                <ul>
                  {localOnlyItems.map((item) => (
                    <li key={item}>{formatLocalDataDisplayLabel(item)}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section
              aria-label="Local data export"
              className="local-data-export-panel"
            >
              <div>
                <h2>Export local data</h2>
                <p>
                  Create a JSON backup of persisted local records: Watchlist,
                  Thesis Notes, Reminders, Portfolio Ranker Inputs, and MBS
                  Score Snapshots. Choose where to save the file. Exporting
                  copies these records without changing them in the app.
                  Static Theme Baskets, transient UI state, app logs, and raw
                  SQLite files are not included.
                </p>
              </div>

              <div className="local-data-export-actions">
                <Button
                  disabled={isExportDisabled}
                  onClick={() => {
                    void exportLocalData();
                  }}
                  type="button"
                  variant="secondary"
                >
                  {localDataExportState.status === 'exporting'
                    ? 'Exporting local data'
                    : 'Export local data'}
                </Button>

                {localDataExportState.status === 'completed' ? (
                  <div className="local-data-status-message" role="status">
                    <strong>Backup JSON saved.</strong>
                    <p>
                      A copy of your persisted local records was saved to{' '}
                      <code>{localDataExportState.outcome.filePath}</code>.
                      Your records in Thesis Investing were not changed.
                    </p>
                    <p>
                      Exported {localDataExportState.outcome.counts.watchlistItems}{' '}
                      watchlist items,{' '}
                      {localDataExportState.outcome.counts.thesisNotes} thesis
                      notes, {localDataExportState.outcome.counts.reminders}{' '}
                      reminders,{' '}
                      {
                        localDataExportState.outcome.counts
                          .portfolioRankerItems
                      }{' '}
                      portfolio ranker inputs, and{' '}
                      {
                        localDataExportState.outcome.counts
                          .mbsScoreSnapshots
                      }{' '}
                      MBS score snapshots.
                    </p>
                    <p>
                      Export generated{' '}
                      {formatLocalDataTimestamp(
                        localDataExportState.outcome.exportedAt
                      )}
                      .
                    </p>
                  </div>
                ) : null}

                {localDataExportState.status === 'canceled' ? (
                  <p className="local-data-status-message" role="status">
                    Export canceled. Nothing was changed and no backup file was
                    created.
                  </p>
                ) : null}

                {localDataExportState.status === 'error' ? (
                  <div className="local-data-status-error" role="alert">
                    <strong>Unable to export local data.</strong>
                    <p>
                      The backup file could not be saved. Choose another
                      location and try again.
                    </p>
                    <ul>
                      {localDataExportState.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>

            <section
              aria-label="Local data import"
              className="local-data-import-panel"
            >
              <div>
                <h2>Import local data</h2>
                <p>
                  Choose a JSON backup created by Thesis Investing. Other JSON
                  files are rejected. The app validates the file and previews
                  record counts before confirmation; no records are written
                  during preview. Confirmed imports append new records and never
                  overwrite or delete existing local data.
                </p>
              </div>

              <div className="local-data-import-actions">
                <Button
                  disabled={isImportDisabled}
                  onClick={() => {
                    void previewLocalDataImport();
                  }}
                  type="button"
                  variant="secondary"
                >
                  {localDataImportState.status === 'selecting'
                    ? 'Selecting import file'
                    : activeImportPreview
                      ? 'Choose another file'
                      : 'Import local data'}
                </Button>

                {activeImportPreview ? (
                  <div className="local-data-import-preview" role="status">
                    <strong>Import preview ready. No records have been written.</strong>
                    <p>
                      <code>{activeImportPreview.fileName}</code> uses export
                      format version {activeImportPreview.formatVersion} and was
                      generated{' '}
                      {formatLocalDataTimestamp(activeImportPreview.exportedAt)}.
                    </p>
                    <dl className="local-data-import-counts">
                      <div>
                        <dt>Watchlist items</dt>
                        <dd>{activeImportPreview.counts.watchlistItems}</dd>
                      </div>
                      <div>
                        <dt>Thesis Notes</dt>
                        <dd>{activeImportPreview.counts.thesisNotes}</dd>
                      </div>
                      <div>
                        <dt>Reminders</dt>
                        <dd>{activeImportPreview.counts.reminders}</dd>
                      </div>
                      <div>
                        <dt>Portfolio Ranker Inputs</dt>
                        <dd>
                          {activeImportPreview.counts.portfolioRankerItems}
                        </dd>
                      </div>
                      <div>
                        <dt>MBS Score Snapshots</dt>
                        <dd>{activeImportPreview.counts.mbsScoreSnapshots}</dd>
                      </div>
                    </dl>
                    {activeImportPreview.warnings.length > 0 ? (
                      <ul className="local-data-import-warnings">
                        {activeImportPreview.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p>
                      Review the counts above, then select Confirm import to add
                      these records. Existing records will not be overwritten,
                      and colliding IDs will be assigned new local IDs.
                    </p>
                    <div className="local-data-import-confirmation">
                      <Button
                        disabled={localDataImportState.status === 'importing'}
                        onClick={() => {
                          void confirmLocalDataImport(activeImportPreview);
                        }}
                        type="button"
                      >
                        {localDataImportState.status === 'importing'
                          ? 'Importing local data'
                          : 'Confirm import'}
                      </Button>
                      <Button
                        disabled={localDataImportState.status === 'importing'}
                        onClick={() => {
                          setLocalDataImportState({ status: 'idle' });
                        }}
                        type="button"
                        variant="secondary"
                      >
                        Cancel import
                      </Button>
                    </div>
                  </div>
                ) : null}

                {localDataImportState.status === 'completed' ? (
                  <div className="local-data-status-message" role="status">
                    <strong>Backup import complete.</strong>
                    <p>
                      The confirmed records were added to this local profile.
                      Existing records were not overwritten.
                    </p>
                    <p>
                      Imported {localDataImportState.outcome.imported.watchlistItems}{' '}
                      watchlist items,{' '}
                      {localDataImportState.outcome.imported.thesisNotes} thesis
                      notes, {localDataImportState.outcome.imported.reminders}{' '}
                      reminders,{' '}
                      {
                        localDataImportState.outcome.imported
                          .portfolioRankerItems
                      }{' '}
                      portfolio ranker inputs, and{' '}
                      {localDataImportState.outcome.imported.mbsScoreSnapshots}{' '}
                      MBS score snapshots.
                    </p>
                    {localDataImportState.outcome.warnings.length > 0 ? (
                      <ul className="local-data-import-warnings">
                        {localDataImportState.outcome.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                {localDataImportState.status === 'canceled' ? (
                  <p className="local-data-status-message" role="status">
                    Import canceled. No records were added or changed.
                  </p>
                ) : null}

                {localDataImportState.status === 'error' ? (
                  <div className="local-data-status-error" role="alert">
                    <strong>Unable to import local data.</strong>
                    <p>
                      The selected file could not be prepared for import. Choose
                      a JSON backup created by Thesis Investing and try again.
                    </p>
                    <ul>
                      {localDataImportState.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>

            <section
              aria-label="Backup guidance"
              className="local-data-backup-guidance"
            >
              <div>
                <h2>Backup guidance</h2>
                <ul>
                  <li>
                    Use Export local data to create a JSON backup of your saved
                    records.
                  </li>
                  <li>
                    Keep backup files in a location you trust. Thesis Investing
                    does not upload them or provide cloud backup.
                  </li>
                  <li>
                    On another computer or local profile, use Import local data
                    to preview and append records from a Thesis Investing backup.
                  </li>
                </ul>
              </div>
            </section>
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

function formatLocalDataTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
