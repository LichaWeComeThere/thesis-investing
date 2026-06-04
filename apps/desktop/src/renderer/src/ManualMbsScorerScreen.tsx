import {
  calculateMbsScore,
  MBS_CATEGORIES,
  MBS_CATEGORY_MAX_SCORE,
  MBS_CATEGORY_MIN_SCORE,
  type ManualBusinessScoreCategory,
  type ManualBusinessScoreRating
} from '@thesis-investing/core';
import {
  Badge,
  type BadgeVariant,
  Button,
  Card,
  PageHeader
} from '@thesis-investing/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  buildManualMbsInput,
  createInitialMbsCategoryValues,
  type ManualMbsCategoryValueState
} from './manualMbsScorerInput';
import {
  cloneMockTheses,
  createMockThesisFromMbsScore,
  saveMockMbsScoreToThesis,
  type CreateMockThesisInput,
  type MockThesis
} from './data/mockTheses';
import {
  buildMbsScoreSnapshot,
  getDefaultMbsScoreSnapshotsStorageClient,
  type MbsScoreSnapshotsStorageClient
} from './mbsScoreSnapshotsStorageClient';
import type { MbsScoreSnapshot } from '@thesis-investing/core';

type ManualMbsScorerScreenProps = {
  initialCategoryValues?: ManualMbsCategoryValueState;
  initialInvestmentIdeas?: MockThesis[];
  initialNotes?: string;
  initialSavedSnapshots?: MbsScoreSnapshot[];
  initialSnapshotStorageErrors?: string[];
  onCreateThesis?: (input: CreateMockThesisInput) => MockThesis;
  onUpdateThesisScore?: (
    thesisId: string,
    nextScore: number,
    updatedAt: string
  ) => void;
  storageClient?: MbsScoreSnapshotsStorageClient | null;
  theses?: MockThesis[];
};

const CREATE_NEW_THESIS_ID = '__create-new-thesis__';

const categoryLabels: Record<ManualBusinessScoreCategory, string> = {
  businessQuality: 'Business quality',
  moat: 'Moat',
  management: 'Management',
  balanceSheet: 'Balance sheet',
  growth: 'Growth',
  valuation: 'Valuation',
  risk: 'Risk'
};

const categoryDescriptions: Record<ManualBusinessScoreCategory, string> = {
  businessQuality: 'Durability, margins, customer value, and operating quality.',
  moat: 'Competitive advantages, switching costs, brand, scale, or network effects.',
  management: 'Capital allocation, execution, incentives, and communication.',
  balanceSheet: 'Debt, liquidity, resilience, and financial flexibility.',
  growth: 'User-assessed revenue, earnings, cash flow, or market expansion quality.',
  valuation: 'Manual view of price paid relative to business quality and prospects.',
  risk: 'Manual view of downside, cyclicality, concentration, disruption, or fragility.'
};

type ScoreDriver = {
  category: ManualBusinessScoreCategory;
  label: string;
  value: number;
};

type ScoreStatus = {
  label: string;
  rating: ManualBusinessScoreRating | 'expensive';
  variant: BadgeVariant;
};

function getCompletedDrivers(
  input: Partial<Record<ManualBusinessScoreCategory, number>>
): ScoreDriver[] {
  return MBS_CATEGORIES.flatMap((category) => {
    const value = input[category];

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < MBS_CATEGORY_MIN_SCORE ||
      value > MBS_CATEGORY_MAX_SCORE
    ) {
      return [];
    }

    return [
      {
        category,
        label: categoryLabels[category],
        value
      }
    ];
  });
}

function getStrongestDrivers(
  input: Partial<Record<ManualBusinessScoreCategory, number>>,
  limit = 2
): ScoreDriver[] {
  return [...getCompletedDrivers(input)]
    .sort((first, second) => second.value - first.value)
    .slice(0, limit);
}

function getWeakestDrivers(
  input: Partial<Record<ManualBusinessScoreCategory, number>>,
  limit = 2
): ScoreDriver[] {
  return [...getCompletedDrivers(input)]
    .sort((first, second) => first.value - second.value)
    .slice(0, limit);
}

function isValuationWeakestDriver(weakestDrivers: ScoreDriver[]): boolean {
  return weakestDrivers.some((driver) => driver.category === 'valuation');
}

function getScoreStatusLabel(
  output: ReturnType<typeof calculateMbsScore>,
  weakestDrivers: ScoreDriver[]
): ScoreStatus {
  if (output.missingCriteria.length > 0 || output.errors.length > 0) {
    return {
      label: 'Incomplete',
      rating: 'incomplete',
      variant: 'warning'
    };
  }

  if (output.percentage >= 85) {
    return {
      label: 'Exceptional thesis',
      rating: 'exceptional',
      variant: 'success'
    };
  }

  if (output.percentage >= 70 && isValuationWeakestDriver(weakestDrivers)) {
    return {
      label: 'Strong but expensive',
      rating: 'expensive',
      variant: 'warning'
    };
  }

  if (output.percentage >= 70) {
    return {
      label: 'Strong thesis',
      rating: 'strong',
      variant: 'accent'
    };
  }

  if (output.percentage >= 50) {
    return {
      label: 'Mixed thesis',
      rating: 'mixed',
      variant: 'neutral'
    };
  }

  return {
    label: 'Weak thesis',
    rating: 'weak',
    variant: 'risk'
  };
}

function getScoreInterpretation(
  output: ReturnType<typeof calculateMbsScore>,
  strongestDrivers: ScoreDriver[],
  weakestDrivers: ScoreDriver[]
): string {
  if (output.missingCriteria.length > 0 || output.errors.length > 0) {
    return 'The thesis is incomplete. Add missing category scores before relying on the output.';
  }

  if (output.percentage >= 85) {
    return 'Exceptional thesis profile. The strongest categories suggest high conviction, but still review risks and valuation.';
  }

  if (output.percentage >= 70 && isValuationWeakestDriver(weakestDrivers)) {
    return 'High-quality thesis, but valuation may limit upside.';
  }

  if (output.percentage >= 70) {
    return 'Strong thesis profile supported by the highest-scoring categories.';
  }

  if (output.percentage >= 50) {
    return 'Mixed thesis. Some strengths exist, but weaker categories need review.';
  }

  const weakestDriverLabel = weakestDrivers[0]?.label.toLowerCase();

  return weakestDriverLabel
    ? `Weak thesis profile. Review ${weakestDriverLabel} before ranking this idea.`
    : 'Weak thesis profile. Review the lowest-scoring categories before ranking this idea.';
}

export function ManualMbsScorerScreen({
  initialCategoryValues,
  initialInvestmentIdeas,
  initialNotes = '',
  initialSavedSnapshots = [],
  initialSnapshotStorageErrors = [],
  onCreateThesis,
  onUpdateThesisScore,
  storageClient,
  theses
}: ManualMbsScorerScreenProps): JSX.Element {
  const resolvedStorageClient =
    storageClient === undefined
      ? getDefaultMbsScoreSnapshotsStorageClient()
      : storageClient;
  const [fallbackInvestmentIdeas, setFallbackInvestmentIdeas] = useState<MockThesis[]>(
    () =>
      initialInvestmentIdeas
        ? initialInvestmentIdeas.map((idea) => ({
            ...idea,
            decisionLog: idea.decisionLog.map((entry) => ({ ...entry })),
            reviewTriggers: [...idea.reviewTriggers]
          }))
        : cloneMockTheses()
  );
  const investmentIdeas = theses ?? fallbackInvestmentIdeas;
  const [selectedThesisId, setSelectedThesisId] = useState(() =>
    investmentIdeas[0]?.id ?? CREATE_NEW_THESIS_ID
  );
  const [newThesisFields, setNewThesisFields] = useState({
    companyName: '',
    theme: '',
    ticker: ''
  });
  const [thesisActionMessage, setThesisActionMessage] = useState('');
  const [savedSnapshots, setSavedSnapshots] = useState<MbsScoreSnapshot[]>(
    () => initialSavedSnapshots.map((snapshot) => ({ ...snapshot }))
  );
  const [snapshotStorageErrors, setSnapshotStorageErrors] = useState(
    initialSnapshotStorageErrors
  );
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(
    Boolean(resolvedStorageClient)
  );
  const [isSnapshotWriting, setIsSnapshotWriting] = useState(false);
  const [categoryValues, setCategoryValues] =
    useState<ManualMbsCategoryValueState>(() =>
      createInitialMbsCategoryValues(initialCategoryValues)
  );
  const [notes, setNotes] = useState(initialNotes);

  const scoreInput = useMemo(
    () => buildManualMbsInput(categoryValues, notes),
    [categoryValues, notes]
  );
  const scoreOutput = useMemo(
    () => calculateMbsScore(scoreInput),
    [scoreInput]
  );
  const completedPercent = Math.round(
    (scoreOutput.completedCriteria / MBS_CATEGORIES.length) * 100
  );
  const strongestDrivers = useMemo(
    () => getStrongestDrivers(scoreOutput.input),
    [scoreOutput.input]
  );
  const weakestDrivers = useMemo(
    () => getWeakestDrivers(scoreOutput.input),
    [scoreOutput.input]
  );
  const scoreStatus = useMemo(
    () => getScoreStatusLabel(scoreOutput, weakestDrivers),
    [scoreOutput, weakestDrivers]
  );
  const scoreInterpretation = useMemo(
    () => getScoreInterpretation(scoreOutput, strongestDrivers, weakestDrivers),
    [scoreOutput, strongestDrivers, weakestDrivers]
  );
  const selectedThesis = useMemo(
    () => investmentIdeas.find((idea) => idea.id === selectedThesisId) ?? null,
    [investmentIdeas, selectedThesisId]
  );
  const isCreatingNewThesis = selectedThesisId === CREATE_NEW_THESIS_ID;
  const canSaveSnapshot =
    scoreOutput.rating !== 'incomplete' &&
    scoreOutput.missingCriteria.length === 0 &&
    scoreOutput.errors.length === 0;

  useEffect(() => {
    const client = resolvedStorageClient;

    if (!client) {
      setIsSnapshotLoading(false);
      return;
    }

    const activeClient = client;
    let isMounted = true;

    async function loadSnapshots(): Promise<void> {
      setIsSnapshotLoading(true);
      setSnapshotStorageErrors([]);

      try {
        const result = await activeClient.list();

        if (!isMounted) {
          return;
        }

        if (!result.ok) {
          setSnapshotStorageErrors(result.errors);
          return;
        }

        setSavedSnapshots(result.value.map((snapshot) => ({ ...snapshot })));
      } catch (error) {
        if (isMounted) {
          setSnapshotStorageErrors([
            error instanceof Error
              ? error.message
              : 'Unable to load saved MBS snapshots.'
          ]);
        }
      } finally {
        if (isMounted) {
          setIsSnapshotLoading(false);
        }
      }
    }

    void loadSnapshots();

    return () => {
      isMounted = false;
    };
  }, [resolvedStorageClient]);

  function updateCategoryValue(
    category: ManualBusinessScoreCategory,
    value: string
  ): void {
    setCategoryValues((currentValues) => ({
      ...currentValues,
      [category]: value
    }));
  }

  function clearInputs(): void {
    setCategoryValues(createInitialMbsCategoryValues());
    setNotes('');
  }

  function updateNewThesisField(
    field: keyof typeof newThesisFields,
    value: string
  ): void {
    setNewThesisFields((currentFields) => ({
      ...currentFields,
      [field]: value
    }));
  }

  function saveScoreToSelectedThesis(): void {
    if (!selectedThesis || isCreatingNewThesis) {
      return;
    }

    const updatedAt = new Date().toISOString();

    if (onUpdateThesisScore) {
      onUpdateThesisScore(selectedThesis.id, scoreOutput.score, updatedAt);
    } else {
      setFallbackInvestmentIdeas((currentIdeas) =>
        saveMockMbsScoreToThesis(
          currentIdeas,
          selectedThesis.id,
          scoreOutput.score,
          updatedAt
        )
      );
    }

    setThesisActionMessage('Score saved to thesis.');
  }

  function createNewThesisFromScore(): void {
    const createdAt = new Date().toISOString();
    const input: CreateMockThesisInput = {
      companyName: newThesisFields.companyName,
      createdAt,
      mbsScore: scoreOutput.score,
      notes,
      riskScore:
        typeof scoreOutput.input.risk === 'number'
          ? scoreOutput.input.risk
          : undefined,
      theme: newThesisFields.theme,
      ticker: newThesisFields.ticker
    };
    const nextIdea = onCreateThesis
      ? onCreateThesis(input)
      : createMockThesisFromMbsScore(investmentIdeas, input);

    if (!onCreateThesis) {
      setFallbackInvestmentIdeas((currentIdeas) => [...currentIdeas, nextIdea]);
    }

    setSelectedThesisId(nextIdea.id);
    setNewThesisFields({
      companyName: '',
      theme: '',
      ticker: ''
    });
    setThesisActionMessage('New thesis created.');
  }

  async function saveScoreSnapshot(): Promise<void> {
    setSnapshotStorageErrors([]);

    if (!resolvedStorageClient) {
      setSnapshotStorageErrors(['MBS snapshot storage is unavailable.']);
      return;
    }

    const createdAt = new Date().toISOString();
    const snapshot = buildMbsScoreSnapshot(scoreOutput, createdAt, {
      companyName: selectedThesis?.companyName ?? newThesisFields.companyName,
      thesisId: selectedThesis?.id,
      ticker: selectedThesis?.ticker ?? newThesisFields.ticker
    });

    if (!snapshot) {
      setSnapshotStorageErrors([
        'Complete every MBS criterion before saving a snapshot.'
      ]);
      return;
    }

    setIsSnapshotWriting(true);

    try {
      const result = await resolvedStorageClient.save(snapshot);

      if (!result.ok) {
        setSnapshotStorageErrors(result.errors);
        return;
      }

      setSavedSnapshots((currentSnapshots) => [
        result.value,
        ...currentSnapshots.filter((item) => item.id !== result.value.id)
      ]);
      setThesisActionMessage('MBS snapshot saved locally.');
    } catch (error) {
      setSnapshotStorageErrors([
        error instanceof Error
          ? error.message
          : 'Unable to save MBS snapshot.'
      ]);
    } finally {
      setIsSnapshotWriting(false);
    }
  }

  return (
    <div className="mbs-screen">
      <PageHeader
        badge={<Badge variant="accent">Local Scoring</Badge>}
        description="Score a business across seven core criteria and keep the thesis context beside the output."
        eyebrow="Business Score"
        title="MBS Scorer"
      />

      <div className="mbs-workspace-grid">
        <Card className="mbs-form-card" title="Guided manual scoring">
          <section className="mbs-thesis-link-panel" aria-label="Selected thesis">
            <div className="mbs-thesis-link-header">
              <div>
                <span>Investment Idea</span>
                <h2>Connect score to thesis</h2>
              </div>
              {thesisActionMessage ? (
                <Badge variant="success">{thesisActionMessage}</Badge>
              ) : null}
            </div>

            <label className="mbs-thesis-select-field">
              <span>Selected thesis</span>
              <select
                aria-label="Selected thesis"
                onChange={(event) => {
                  setSelectedThesisId(event.currentTarget.value);
                  setThesisActionMessage('');
                }}
                value={selectedThesisId}
              >
                {investmentIdeas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.ticker} - {idea.companyName}
                  </option>
                ))}
                <option value={CREATE_NEW_THESIS_ID}>
                  Create new thesis from this score
                </option>
              </select>
            </label>

            {selectedThesis && !isCreatingNewThesis ? (
              <div className="mbs-selected-thesis-card">
                <div>
                  <span>Ticker</span>
                  <strong>{selectedThesis.ticker}</strong>
                  <small>{selectedThesis.companyName}</small>
                </div>
                <div>
                  <span>Theme</span>
                  <strong>{selectedThesis.theme}</strong>
                  <small>{selectedThesis.ideaStatus}</small>
                </div>
                <div>
                  <span>Saved MBS</span>
                  <strong>{selectedThesis.mbsScore} / 100</strong>
                  <small>
                    Previous{' '}
                    {selectedThesis.previousMbsScore ?? 'Not available'}
                  </small>
                </div>
                <div>
                  <span>Conviction</span>
                  <strong>{selectedThesis.conviction}</strong>
                  <small>Risk: {selectedThesis.riskLevel}</small>
                </div>
              </div>
            ) : (
              <div className="mbs-new-thesis-grid">
                <label className="mbs-thesis-select-field">
                  <span>Ticker</span>
                  <input
                    aria-label="New thesis ticker"
                    onChange={(event) =>
                      updateNewThesisField('ticker', event.currentTarget.value)
                    }
                    placeholder="Optional"
                    type="text"
                    value={newThesisFields.ticker}
                  />
                </label>
                <label className="mbs-thesis-select-field">
                  <span>Company name</span>
                  <input
                    aria-label="New thesis company name"
                    onChange={(event) =>
                      updateNewThesisField(
                        'companyName',
                        event.currentTarget.value
                      )
                    }
                    placeholder="New thesis"
                    type="text"
                    value={newThesisFields.companyName}
                  />
                </label>
                <label className="mbs-thesis-select-field">
                  <span>Theme</span>
                  <input
                    aria-label="New thesis theme"
                    onChange={(event) =>
                      updateNewThesisField('theme', event.currentTarget.value)
                    }
                    placeholder="Uncategorized"
                    type="text"
                    value={newThesisFields.theme}
                  />
                </label>
              </div>
            )}

            <div className="mbs-thesis-actions">
              <Button
                disabled={!selectedThesis || isCreatingNewThesis}
                onClick={saveScoreToSelectedThesis}
                type="button"
              >
                Save score to selected thesis
              </Button>
              <Button
                onClick={createNewThesisFromScore}
                type="button"
                variant="secondary"
              >
                Create new thesis from score
              </Button>
            </div>
          </section>

          <div className="mbs-section-kicker">
            <Badge variant="neutral">Step 1</Badge>
            <span>Score the business across seven compact criteria.</span>
          </div>

          <div className="mbs-input-grid">
            {MBS_CATEGORIES.map((category) => (
              <label className="mbs-field mbs-category-card" key={category}>
                <span className="mbs-category-card-header">
                  <span className="mbs-field-label">
                    {categoryLabels[category]}
                  </span>
                  <span className="mbs-score-range">0-10</span>
                </span>
                <span className="mbs-field-description">
                  {categoryDescriptions[category]}
                </span>
                <input
                  aria-label={`${categoryLabels[category]} score`}
                  inputMode="decimal"
                  max={MBS_CATEGORY_MAX_SCORE}
                  min={MBS_CATEGORY_MIN_SCORE}
                  onChange={(event) =>
                    updateCategoryValue(category, event.currentTarget.value)
                  }
                placeholder="0-10"
                type="text"
                value={categoryValues[category] ?? ''}
              />
              </label>
            ))}
          </div>

          <div className="mbs-notes-panel">
            <div className="mbs-section-kicker">
              <Badge variant="neutral">Step 2</Badge>
              <span>Add thesis context without affecting the score.</span>
            </div>

            <label className="mbs-notes-field">
              <span className="mbs-field-label">Optional thesis notes</span>
              <span className="mbs-field-description">
                Notes are saved only in this screen state for now and do not
                affect the score.
              </span>
              <textarea
                onChange={(event) => setNotes(event.currentTarget.value)}
                placeholder="Write context for your scoring assumptions."
                rows={4}
                value={notes}
              />
            </label>
          </div>
        </Card>

        <Card
          className="mbs-score-panel-card"
          emphasis
          footer={
            <div className="mbs-thesis-actions">
              <Button
                disabled={
                  !canSaveSnapshot ||
                  isSnapshotLoading ||
                  isSnapshotWriting ||
                  !resolvedStorageClient
                }
                onClick={() => {
                  void saveScoreSnapshot();
                }}
                type="button"
              >
                {isSnapshotWriting ? 'Saving snapshot...' : 'Save snapshot'}
              </Button>
              <Button onClick={clearInputs} type="button" variant="secondary">
                Clear inputs
              </Button>
            </div>
          }
          title="Live score output"
        >
          <div className="mbs-output-panel">
            <div className={`mbs-hero-score mbs-hero-score--${scoreOutput.rating}`}>
              <span className="mbs-score-label">Score</span>
              <strong>
                {scoreOutput.score} / {scoreOutput.maxScore}
              </strong>
              <Badge
                className={`mbs-rating-badge mbs-rating-badge--${scoreStatus.rating}`}
                variant={scoreStatus.variant}
              >
                {scoreStatus.label}
              </Badge>
            </div>

            <div className="mbs-score-summary">
              <div className="mbs-score-card">
                <span className="mbs-score-label">Percentage</span>
                <strong>{scoreOutput.percentage}%</strong>
              </div>
              <div className="mbs-score-card">
                <span className="mbs-score-label">Completed</span>
                <strong>
                  {scoreOutput.completedCriteria} / {MBS_CATEGORIES.length}
                </strong>
              </div>
              <div className="mbs-score-card">
                <span className="mbs-score-label">Progress</span>
                <strong>{completedPercent}%</strong>
              </div>
            </div>

            <div className="mbs-driver-grid" aria-label="Score drivers">
              <section className="mbs-driver-card">
                <div className="mbs-driver-card-header">
                  <span className="mbs-score-label">Strongest drivers</span>
                </div>
                {strongestDrivers.length > 0 ? (
                  <ul className="mbs-driver-list">
                    {strongestDrivers.map((driver) => (
                      <li key={driver.category}>
                        <span>{driver.label}</span>
                        <strong>{driver.value}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No completed scores yet.</p>
                )}
              </section>

              <section className="mbs-driver-card mbs-driver-card--weakest">
                <div className="mbs-driver-card-header">
                  <span className="mbs-score-label">Weakest drivers</span>
                </div>
                {weakestDrivers.length > 0 ? (
                  <ul className="mbs-driver-list">
                    {weakestDrivers.map((driver) => (
                      <li key={driver.category}>
                        <span>{driver.label}</span>
                        <strong>{driver.value}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No completed scores yet.</p>
                )}
              </section>
            </div>

            <section className="mbs-interpretation-card">
              <span className="mbs-score-label">Interpretation</span>
              <p>{scoreInterpretation}</p>
            </section>

            {scoreOutput.missingCriteria.length > 0 ? (
              <details className="mbs-output-section mbs-output-section--missing">
                <summary>
                  <span>Missing criteria</span>
                  <Badge variant="warning">
                    {scoreOutput.missingCriteria.length}
                  </Badge>
                </summary>
                <ul className="mbs-chip-list">
                  {scoreOutput.missingCriteria.map((category) => (
                    <li className="mbs-chip" key={category}>
                      {categoryLabels[category]}
                    </li>
                  ))}
                </ul>
              </details>
            ) : scoreOutput.errors.length === 0 ? (
              <div className="mbs-complete-indicator">
                <span aria-hidden="true">OK</span>
                <strong>All criteria complete</strong>
              </div>
            ) : (
              <div className="mbs-complete-indicator mbs-complete-indicator--warning">
                <span aria-hidden="true">!</span>
                <strong>Review validation warnings</strong>
              </div>
            )}

            <details className="mbs-output-section mbs-output-section--warnings">
              <summary>Warnings and errors</summary>
              {scoreOutput.warnings.length > 0 || scoreOutput.errors.length > 0 ? (
                <ul className="mbs-message-list">
                  {scoreOutput.warnings.map((warning) => (
                    <li key={warning.code}>{warning.message}</li>
                  ))}
                  {scoreOutput.errors.map((error) => (
                    <li key={error.category}>
                      {categoryLabels[error.category]}: {error.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No warnings or validation errors.</p>
              )}
            </details>

            <section className="mbs-output-section" aria-label="Saved snapshots">
              <div className="mbs-driver-card-header">
                <span className="mbs-score-label">Saved snapshots</span>
                <Badge variant={savedSnapshots.length > 0 ? 'accent' : 'neutral'}>
                  {savedSnapshots.length}
                </Badge>
              </div>
              {isSnapshotLoading ? (
                <p>Loading saved snapshots...</p>
              ) : savedSnapshots.length > 0 ? (
                <ul className="mbs-driver-list">
                  {savedSnapshots.slice(0, 3).map((snapshot) => (
                    <li key={snapshot.id}>
                      <span>
                        {snapshot.ticker ?? snapshot.companyName ?? 'Manual score'}
                        {snapshot.createdAt ? ` - ${snapshot.createdAt}` : ''}
                      </span>
                      <strong>{snapshot.score}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No saved MBS snapshots yet.</p>
              )}
              {snapshotStorageErrors.length > 0 ? (
                <ul className="mbs-message-list" role="alert">
                  {snapshotStorageErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}

