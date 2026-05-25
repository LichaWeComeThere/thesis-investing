import {
  PORTFOLIO_RANKER_MAX_SCORE,
  PORTFOLIO_RANKER_MIN_SCORE,
  rankManualPortfolioItems,
  type ManualPortfolioRankedItem
} from '@thesis-investing/core';
import {
  Badge,
  type BadgeVariant,
  Button,
  Card,
  PageHeader
} from '@thesis-investing/ui';
import { useMemo, useState } from 'react';
import {
  buildPortfolioRankerInput,
  createEmptyPortfolioRankerRow,
  type PortfolioRankerRowState
} from './portfolioRankerInput';
import {
  formatScoreChange,
  mockTheses,
  type MockThesis
} from './data/mockTheses';

type PortfolioRankerScreenProps = {
  initialRows?: PortfolioRankerRowState[];
  onOpenWorkspace?: (workspaceId: string) => void;
};

type ThesisStatusDisplay = {
  label: string;
  variant: BadgeVariant;
};

const defaultRows = mockTheses.map(mockThesisToPortfolioRankerRow);

const mockThesesById = new Map(
  mockTheses.map((thesis) => [thesis.id, thesis])
);

export function PortfolioRankerScreen({
  initialRows = defaultRows,
  onOpenWorkspace
}: PortfolioRankerScreenProps): JSX.Element {
  const [rows, setRows] = useState<PortfolioRankerRowState[]>(() =>
    initialRows.map((row) => ({ ...row }))
  );
  const [nextRowNumber, setNextRowNumber] = useState(initialRows.length + 1);

  const rankerInput = useMemo(() => buildPortfolioRankerInput(rows), [rows]);
  const rankedItems = useMemo(
    () => rankManualPortfolioItems(rankerInput),
    [rankerInput]
  );
  const rankedItemsById = useMemo(
    () => new Map(rankedItems.map((item) => [item.id, item])),
    [rankedItems]
  );
  const validRankedItems = useMemo(
    () =>
      rankedItems.filter(
        (
          item
        ): item is ManualPortfolioRankedItem & { manualScore: number } =>
          item.status === 'ranked' && typeof item.manualScore === 'number'
      ),
    [rankedItems]
  );
  const rankedCount = rankedItems.filter((item) => item.status === 'ranked').length;
  const topRankedItem =
    rankedItems.find((item) => item.status === 'ranked') ?? null;
  const weakestIdea =
    validRankedItems.length > 1
      ? validRankedItems.reduce((lowest, item) =>
          item.manualScore < lowest.manualScore ? item : lowest
        )
      : null;
  const weakestIdeaReason = weakestIdea
    ? getWeakestIdeaReason()
    : null;
  const hasIncompleteRankerItems = rankedItems.some(
    (item) => item.status !== 'ranked'
  );

  function updateRow(
    rowId: string,
    field: keyof Omit<PortfolioRankerRowState, 'id'>,
    value: string
  ): void {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  }

  function addRow(): void {
    setRows((currentRows) => [
      ...currentRows,
      createEmptyPortfolioRankerRow(`idea-${nextRowNumber}`)
    ]);
    setNextRowNumber((currentNumber) => currentNumber + 1);
  }

  function removeRow(rowId: string): void {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return [createEmptyPortfolioRankerRow(currentRows[0].id)];
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
  }

  function clearRows(): void {
    setRows(defaultRows.map((row) => ({ ...row })));
    setNextRowNumber(defaultRows.length + 1);
  }

  return (
    <div className="portfolio-ranker-screen">
      <PageHeader
        badge={<Badge variant="accent">Demo Rankings</Badge>}
        description="Rank investment ideas by thesis score, status, conviction, risk, and review priority."
        eyebrow="Idea Ranking Board"
        title="Thesis Rankings"
      />

      <div className="portfolio-ranker-layout">
        <Card className="portfolio-ranker-workspace-card" title="Thesis ranking board">
          <div className="portfolio-ranker-toolbar">
            <div>
              <h2>Investment ideas</h2>
              <p>
                Compact ranking cards keep score, thesis context, and review
                status visible while you compare ideas.
              </p>
            </div>
            <Button onClick={addRow} type="button">
              + Add idea
            </Button>
          </div>

          <div className="portfolio-ranker-filter-row">
            <label className="portfolio-ranker-search">
              <span>Search</span>
              <input
                aria-label="Search ideas"
                placeholder="Search ideas..."
                readOnly
                type="search"
              />
            </label>
            <label className="portfolio-ranker-filter">
              <span>Filter</span>
              <select aria-label="Filter ideas" defaultValue="all">
                <option value="all">All ideas</option>
              </select>
            </label>
            <label className="portfolio-ranker-filter">
              <span>Status</span>
              <select aria-label="Filter ranking status" defaultValue="all">
                <option value="all">All statuses</option>
              </select>
            </label>
          </div>

          <div className="portfolio-ranker-rows">
            {rows.map((row, index) => {
              const rankedItem = rankedItemsById.get(row.id);
              const thesis = mockThesesById.get(row.id);
              const thesisStatus = getThesisStatus(thesis);

              return (
                <article className="portfolio-ranker-row" key={row.id}>
                  <div className="portfolio-ranker-row-header">
                    <div className="portfolio-ranker-rank-badge">
                      {rankedItem?.rank ?? index + 1}
                    </div>
                    <div className="portfolio-ranker-row-summary">
                      <span className="portfolio-ranker-entry-number">
                        Idea {index + 1}
                      </span>
                      <h3>{formatTickerPreview(row)}</h3>
                      <p>{formatCompanyPreview(row)}</p>
                    </div>
                    <Badge
                      className={`portfolio-ranker-score-badge ${getScoreToneClass(rankedItem)}`}
                      variant={getScoreBadgeVariant(rankedItem)}
                    >
                      MBS {formatRowScorePreview(row)}
                    </Badge>
                  </div>

                  <div className="portfolio-ranker-thesis-meta">
                    <Badge variant={thesisStatus.variant}>
                      {thesisStatus.label}
                    </Badge>
                    <span className="portfolio-ranker-meta-chip">
                      Change: {thesis ? formatScoreChange(thesis) : 'Not set'}
                    </span>
                    <span className="portfolio-ranker-meta-chip">
                      Conviction: {thesis?.conviction ?? 'Not set'}
                    </span>
                    <span className="portfolio-ranker-meta-chip portfolio-ranker-meta-chip--risk">
                      Risk: {thesis?.riskLevel ?? 'Not set'}
                    </span>
                    <span className="portfolio-ranker-meta-chip">
                      Theme: {thesis?.theme ?? 'Not set'}
                    </span>
                  </div>

                  <div className="portfolio-ranker-row-actions">
                    <div className="portfolio-ranker-review-dates">
                      <span>
                        Last reviewed{' '}
                        <strong>{thesis?.lastReviewedDate ?? 'Not set'}</strong>
                      </span>
                      <span>
                        Next review{' '}
                        <strong>{thesis?.nextReviewDate ?? 'Not set'}</strong>
                      </span>
                    </div>
                    <details className="portfolio-ranker-editor">
                      <summary>Edit details</summary>
                      <div className="portfolio-ranker-entry-grid">
                        <label className="portfolio-ranker-field">
                          <span>Ticker</span>
                          <input
                            aria-label={`Ticker ${index + 1}`}
                            onChange={(event) =>
                              updateRow(row.id, 'ticker', event.currentTarget.value)
                            }
                            placeholder="MSFT"
                            type="text"
                            value={row.ticker}
                          />
                        </label>

                        <label className="portfolio-ranker-field">
                          <span>Company name</span>
                          <input
                            aria-label={`Company name ${index + 1}`}
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                'companyName',
                                event.currentTarget.value
                              )
                            }
                            placeholder="Optional"
                            type="text"
                            value={row.companyName}
                          />
                        </label>

                        <label className="portfolio-ranker-field">
                          <span>Manual score</span>
                          <input
                            aria-label={`Manual score ${index + 1}`}
                            inputMode="decimal"
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                'manualScore',
                                event.currentTarget.value
                              )
                            }
                            placeholder={`${PORTFOLIO_RANKER_MIN_SCORE}-${PORTFOLIO_RANKER_MAX_SCORE}`}
                            type="text"
                            value={row.manualScore}
                          />
                        </label>
                      </div>

                      <label className="portfolio-ranker-field portfolio-ranker-notes">
                        <span>Optional notes</span>
                        <textarea
                          aria-label={`Notes ${index + 1}`}
                          onChange={(event) =>
                            updateRow(row.id, 'notes', event.currentTarget.value)
                          }
                          placeholder="User-entered context for this score."
                          rows={3}
                          value={row.notes}
                        />
                      </label>
                    </details>
                    <Button
                      className="portfolio-ranker-remove-button"
                      onClick={() => removeRow(row.id)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Remove
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="portfolio-ranker-actions">
            <Button onClick={addRow} type="button" variant="secondary">
              + Add another idea
            </Button>
            <Button onClick={clearRows} type="button" variant="secondary">
              Clear entries
            </Button>
          </div>
        </Card>

        <Card
          className="portfolio-ranker-output-card"
          emphasis
          title="Ranking output"
        >
          <div className="portfolio-ranker-output-hero">
            <div>
              <span>Ranked ideas</span>
              <strong>
                {rankedCount} / {rows.length}
              </strong>
            </div>
            <div>
              <span>Current leader</span>
              <strong>
                {topRankedItem
                  ? topRankedItem.normalizedTicker
                  : 'None yet'}
              </strong>
            </div>
          </div>

          {rankedItems.length > 0 ? (
            <div className="portfolio-ranker-results">
              <div className="portfolio-ranker-preview-list">
                <div className="portfolio-ranker-preview-heading">
                  <span>Rank</span>
                  <span>Ticker</span>
                  <span>Company</span>
                  <span>Score</span>
                </div>
                {rankedItems.map((item) => (
                  <div className="portfolio-ranker-preview-row" key={item.id}>
                    <strong>{formatRank(item)}</strong>
                    <span>{formatPreviewTicker(item)}</span>
                    <span>{item.companyName ?? 'Not set'}</span>
                    <span>{formatScore(item)}</span>
                  </div>
                ))}
              </div>

              <div className="portfolio-ranker-feedback">
                {rankedItems.some((item) => item.errors.length > 0) ? (
                  <>
                    <h3>Items needing attention</h3>
                    <ul>
                      {rankedItems
                        .filter((item) => item.errors.length > 0)
                        .map((item) => (
                          <li key={item.id}>
                            {formatPreviewTicker(item)}:{' '}
                            {item.errors.join(' ')}
                          </li>
                        ))}
                    </ul>
                  </>
                ) : (
                  <p>No validation errors.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="portfolio-ranker-empty-state">
              <h3>No ideas ranked yet</h3>
              <p>
                Add your first idea with a ticker and manual score to generate
                a deterministic ranking.
              </p>
            </div>
          )}

          <div className="portfolio-ranker-score-guide">
            <h3>Scoring guide</h3>
            <div>
              <span className="portfolio-ranker-guide-dot portfolio-ranker-guide-dot--risk" />
              <p>
                <strong>0</strong> Weak thesis / high risk
              </p>
            </div>
            <div>
              <span className="portfolio-ranker-guide-dot portfolio-ranker-guide-dot--warning" />
              <p>
                <strong>50</strong> Average thesis / mixed factors
              </p>
            </div>
            <div>
              <span className="portfolio-ranker-guide-dot portfolio-ranker-guide-dot--growth" />
              <p>
                <strong>100</strong> Strong thesis / high conviction
              </p>
            </div>
          </div>

          <div
            className={`portfolio-ranker-weakest-card ${weakestIdea ? weakestIdeaToneClass(weakestIdea.manualScore) : ''}`}
          >
            <div className="portfolio-ranker-weakest-header">
              <div>
                <span>Review priority</span>
                <h3>Weakest idea</h3>
              </div>
              {weakestIdea || validRankedItems.length === 0 ? (
                <button
                  className="portfolio-ranker-weakest-action"
                  onClick={() => onOpenWorkspace?.('mbs-scorer')}
                  type="button"
                >
                  Re-evaluate thesis
                  <span className="portfolio-ranker-weakest-action-arrow" aria-hidden="true">
                    <svg
                      fill="none"
                      height="16"
                      viewBox="0 0 24 24"
                      width="16"
                    >
                      <path
                        d="M9 14 4 9l5-5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.25"
                      />
                      <path
                        d="M4 9h9.5a6.5 6.5 0 1 1 0 13H11"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.25"
                      />
                    </svg>
                  </span>
                </button>
              ) : null}
            </div>

            {weakestIdea ? (
              <>
                <div className="portfolio-ranker-weakest-score">
                  <span>{weakestIdea.normalizedTicker}</span>
                  <strong>
                    {weakestIdea.manualScore} / {PORTFOLIO_RANKER_MAX_SCORE}
                  </strong>
                </div>
                <dl className="portfolio-ranker-weakest-detail-list">
                  <div>
                    <dt>Reason</dt>
                    <dd>{weakestIdeaReason}</dd>
                  </div>
                  <div>
                    <dt>Action</dt>
                    <dd>Re-evaluate thesis</dd>
                  </div>
                </dl>
                <p>
                  {weakestIdea.normalizedTicker} is the lowest valid scored idea
                  on the current board.
                </p>
              </>
            ) : validRankedItems.length === 1 ? (
              <p>
                Add more ideas to compare weakest thesis.
              </p>
            ) : (
              <p>Add scores to identify the weakest idea.</p>
            )}

            {hasIncompleteRankerItems ? (
              <small>
                Incomplete ideas are excluded until they have a valid score.
              </small>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatTickerPreview(row: PortfolioRankerRowState): string {
  const ticker = row.ticker.trim();
  return ticker ? ticker.toUpperCase() : 'Add ticker';
}

function formatCompanyPreview(row: PortfolioRankerRowState): string {
  const companyName = row.companyName.trim();
  return companyName || 'New idea';
}

function formatRowScorePreview(row: PortfolioRankerRowState): string {
  return row.manualScore.trim()
    ? `${row.manualScore.trim()} / ${PORTFOLIO_RANKER_MAX_SCORE}`
    : 'Not set';
}

function formatRank(item: ManualPortfolioRankedItem): string {
  return item.rank === null ? formatStatus(item) : String(item.rank);
}

function formatScore(item: ManualPortfolioRankedItem): string {
  return item.manualScore === undefined
    ? 'Not set'
    : `${item.manualScore} / ${PORTFOLIO_RANKER_MAX_SCORE}`;
}

function formatPreviewTicker(item: ManualPortfolioRankedItem): string {
  return item.normalizedTicker || 'Add ticker';
}

function mockThesisToPortfolioRankerRow(
  thesis: MockThesis
): PortfolioRankerRowState {
  return {
    companyName: thesis.companyName,
    id: thesis.id,
    manualScore: String(thesis.mbsScore),
    notes: thesis.thesisSummary,
    ticker: thesis.ticker
  };
}

function getThesisStatus(thesis: MockThesis | undefined): ThesisStatusDisplay {
  if (!thesis) {
    return {
      label: 'Thesis: Not set',
      variant: 'neutral'
    };
  }

  if (thesis.thesisStatus === 'Strong' || thesis.thesisStatus === 'Improving') {
    return {
      label: `Thesis: ${thesis.thesisStatus}`,
      variant: 'success'
    };
  }

  if (thesis.thesisStatus === 'Weakening') {
    return {
      label: `Thesis: ${thesis.thesisStatus}`,
      variant: 'warning'
    };
  }

  if (thesis.thesisStatus === 'Broken') {
    return {
      label: `Thesis: ${thesis.thesisStatus}`,
      variant: 'risk'
    };
  }

  return {
    label: `Thesis: ${thesis.thesisStatus}`,
    variant: 'neutral'
  };
}

function getScoreBadgeVariant(
  item: ManualPortfolioRankedItem | undefined
): BadgeVariant {
  if (!item || item.status === 'incomplete') {
    return 'warning';
  }

  if (item.status === 'invalid') {
    return 'risk';
  }

  if ((item.manualScore ?? 0) >= 70) {
    return 'success';
  }

  if ((item.manualScore ?? 0) >= 50) {
    return 'accent';
  }

  return 'risk';
}

function getScoreToneClass(item: ManualPortfolioRankedItem | undefined): string {
  if (!item || item.status === 'incomplete') {
    return 'portfolio-ranker-score-badge--warning';
  }

  if (item.status === 'invalid') {
    return 'portfolio-ranker-score-badge--risk';
  }

  if ((item.manualScore ?? 0) >= 70) {
    return 'portfolio-ranker-score-badge--strong';
  }

  if ((item.manualScore ?? 0) >= 50) {
    return 'portfolio-ranker-score-badge--mixed';
  }

  return 'portfolio-ranker-score-badge--risk';
}

function getWeakestIdeaReason(): string {
  return 'Lowest current thesis score.';
}

function formatStatus(item: ManualPortfolioRankedItem | undefined): string {
  if (!item) {
    return 'Incomplete';
  }

  if (item.status === 'ranked') {
    return 'Ranked';
  }

  if (item.status === 'invalid') {
    return 'Invalid';
  }

  return 'Incomplete';
}

function weakestIdeaToneClass(score: number): string {
  if (score <= 39) {
    return 'portfolio-ranker-weakest-card--risk';
  }

  if (score <= 69) {
    return 'portfolio-ranker-weakest-card--warning';
  }

  return 'portfolio-ranker-weakest-card--steady';
}
