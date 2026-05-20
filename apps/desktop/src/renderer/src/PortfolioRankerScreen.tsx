import {
  PORTFOLIO_RANKER_MAX_SCORE,
  PORTFOLIO_RANKER_MIN_SCORE,
  rankManualPortfolioItems,
  type ManualPortfolioRankedItem
} from '@thesis-investing/core';
import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import { useMemo, useState } from 'react';
import {
  buildPortfolioRankerInput,
  createEmptyPortfolioRankerRow,
  type PortfolioRankerRowState
} from './portfolioRankerInput';

type PortfolioRankerScreenProps = {
  initialRows?: PortfolioRankerRowState[];
  onOpenWorkspace?: (workspaceId: string) => void;
};

const defaultRows = [
  createEmptyPortfolioRankerRow('idea-1'),
  createEmptyPortfolioRankerRow('idea-2'),
  createEmptyPortfolioRankerRow('idea-3')
];

const weakestIdeaMockup = {
  ticker: 'CRWD',
  score: 65,
  message:
    'Mock example: CRWD has the lowest score and may need review. Revisit the thesis, score assumptions, or notes before comparing it with stronger ideas.'
};

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
        badge={<Badge variant="accent">Manual ranking only</Badge>}
        description="Enter your own holdings or ideas and a manual score from 0 to 100. Rankings are deterministic, educational, and non-advisory; they are not buy, sell, or hold recommendations."
        eyebrow="Phase 1 Portfolio Ranker"
        title="Portfolio Ranker"
      />

      <div className="portfolio-ranker-layout">
        <Card className="portfolio-ranker-workspace-card" title="Holdings workspace">
          <div className="portfolio-ranker-disclaimer">
            Inputs are manually entered by the user. No live data, brokerage
            connection, trading execution, external API, or AI analysis is used.
          </div>

          <div className="portfolio-ranker-toolbar">
            <div>
              <h2>Manual holdings</h2>
              <p>
                Compact cards keep each idea scannable. Expand a card when you
                need to edit its ticker, score, company, or notes.
              </p>
            </div>
            <Button onClick={addRow} type="button">
              + Add holding
            </Button>
          </div>

          <div className="portfolio-ranker-filter-row">
            <label className="portfolio-ranker-search">
              <span>Search</span>
              <input
                aria-label="Search holdings"
                placeholder="Search holdings..."
                readOnly
                type="search"
              />
            </label>
            <label className="portfolio-ranker-filter">
              <span>Filter</span>
              <select aria-label="Filter holdings" defaultValue="all">
                <option value="all">All entries</option>
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

              return (
                <article className="portfolio-ranker-row" key={row.id}>
                  <div className="portfolio-ranker-row-header">
                    <div className="portfolio-ranker-rank-badge">
                      {rankedItem?.rank ?? index + 1}
                    </div>
                    <div className="portfolio-ranker-row-summary">
                      <span className="portfolio-ranker-entry-number">
                        Entry {index + 1}
                      </span>
                      <h3>{formatTickerPreview(row)}</h3>
                      <p>{formatCompanyPreview(row)}</p>
                      <span className="portfolio-ranker-sector-badge">
                        Manual thesis
                      </span>
                    </div>
                    <div className="portfolio-ranker-row-stats">
                      <span>
                        Score <strong>{formatRowScorePreview(row)}</strong>
                      </span>
                      <span>
                        Rank{' '}
                        <strong>
                          {rankedItem?.rank ?? formatStatus(rankedItem)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="portfolio-ranker-row-body">
                    <div>
                      <span>Notes</span>
                      <p>{formatNotesPreview(row)}</p>
                    </div>
                    <div>
                      <span>Last updated</span>
                      <p>Local draft</p>
                    </div>
                  </div>

                  <div className="portfolio-ranker-row-actions">
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
              + Add another holding
            </Button>
            <Button onClick={clearRows} type="button" variant="secondary">
              Clear entries
            </Button>
          </div>
        </Card>

        <Card
          className="portfolio-ranker-output-card"
          emphasis
          title="Deterministic ranking output"
        >
          <div className="portfolio-ranker-output-hero">
            <div>
              <span>Ranked holdings</span>
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
                    <span>{item.normalizedTicker}</span>
                    <span>{item.companyName ?? 'Not provided'}</span>
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
                            {item.normalizedTicker || 'Untitled entry'}:{' '}
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
              <h3>No positions ranked yet</h3>
              <p>
                Add your first holding with a ticker and manual score to generate
                a deterministic ranking.
              </p>
            </div>
          )}

          <div className="portfolio-ranker-score-guide">
            <h3>Scoring guide</h3>
            <div>
              <span className="portfolio-ranker-guide-dot portfolio-ranker-guide-dot--risk" />
              <p>
                <strong>0</strong> Very weak thesis / high risk
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
                <strong>100</strong> Very strong thesis / high conviction
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
                  onClick={() => onOpenWorkspace?.('thesis-monitor')}
                  type="button"
                >
                  Re-evaluate your thesis
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
                  <span>Score</span>
                  <strong>
                    {weakestIdea.manualScore} / {PORTFOLIO_RANKER_MAX_SCORE}
                  </strong>
                </div>
                <p>
                  {weakestIdea.normalizedTicker} has the lowest valid score and
                  may need review. Revisit the thesis, score assumptions, or
                  notes before comparing it with stronger ideas.
                </p>
              </>
            ) : validRankedItems.length === 1 ? (
              <p>
                Only one holding ranked. Add more holdings to compare weakest
                ideas.
              </p>
            ) : (
              <>
                <div className="portfolio-ranker-weakest-score">
                  <span>{weakestIdeaMockup.ticker}</span>
                  <strong>
                    {weakestIdeaMockup.score} / {PORTFOLIO_RANKER_MAX_SCORE}
                  </strong>
                </div>
                <p>{weakestIdeaMockup.message}</p>
              </>
            )}

            {hasIncompleteRankerItems ? (
              <small>
                Incomplete holdings are excluded until they have a valid score.
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
  return ticker || 'Untitled holding';
}

function formatCompanyPreview(row: PortfolioRankerRowState): string {
  const companyName = row.companyName.trim();
  return companyName || 'Company not provided';
}

function formatNotesPreview(row: PortfolioRankerRowState): string {
  return row.notes.trim()
    ? row.notes.trim()
    : 'No notes added yet. Add user-entered context for this manual score.';
}

function formatRowScorePreview(row: PortfolioRankerRowState): string {
  return row.manualScore.trim()
    ? `${row.manualScore.trim()} / ${PORTFOLIO_RANKER_MAX_SCORE}`
    : 'Missing';
}

function formatRank(item: ManualPortfolioRankedItem): string {
  return item.rank === null ? formatStatus(item) : String(item.rank);
}

function formatScore(item: ManualPortfolioRankedItem): string {
  return item.manualScore === undefined
    ? 'Missing'
    : `${item.manualScore} / ${PORTFOLIO_RANKER_MAX_SCORE}`;
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
