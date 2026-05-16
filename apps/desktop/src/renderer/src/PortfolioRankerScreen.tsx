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
};

const defaultRows = [
  createEmptyPortfolioRankerRow('idea-1'),
  createEmptyPortfolioRankerRow('idea-2'),
  createEmptyPortfolioRankerRow('idea-3')
];

export function PortfolioRankerScreen({
  initialRows = defaultRows
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
  const rankedCount = rankedItems.filter((item) => item.status === 'ranked').length;
  const topRankedItem =
    rankedItems.find((item) => item.status === 'ranked') ?? null;

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
        <Card title="Holdings workspace">
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
            Add holding
          </Button>
        </div>

        <div className="portfolio-ranker-rows">
          {rows.map((row, index) => (
            <article className="portfolio-ranker-row" key={row.id}>
              <div className="portfolio-ranker-row-header">
                <div className="portfolio-ranker-row-summary">
                  <span className="portfolio-ranker-entry-number">
                    Entry {index + 1}
                  </span>
                  <h3>{formatTickerPreview(row)}</h3>
                  <p>{formatCompanyPreview(row)}</p>
                </div>
                <div className="portfolio-ranker-row-stats">
                  <span>
                    Score <strong>{row.manualScore || 'Missing'}</strong>
                  </span>
                  <span>{formatNotesPreview(row)}</span>
                </div>
                <Button
                  onClick={() => removeRow(row.id)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Remove
                </Button>
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
            </article>
          ))}
        </div>

        <div className="portfolio-ranker-actions">
          <Button onClick={clearRows} type="button" variant="secondary">
            Clear entries
          </Button>
        </div>
      </Card>

      <Card emphasis title="Deterministic ranking output">
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
            <table className="portfolio-ranker-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Ticker</th>
                  <th scope="col">Company</th>
                  <th scope="col">Manual score</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rankedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{formatRank(item)}</td>
                    <td>{item.normalizedTicker}</td>
                    <td>{item.companyName ?? 'Not provided'}</td>
                    <td>{formatScore(item)}</td>
                    <td>
                      <span
                        className={`portfolio-ranker-status ${item.status}`}
                      >
                        {formatStatus(item)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
  return row.notes.trim() ? 'Notes added' : 'No notes';
}

function formatRank(item: ManualPortfolioRankedItem): string {
  return item.rank === null ? formatStatus(item) : String(item.rank);
}

function formatScore(item: ManualPortfolioRankedItem): string {
  return item.manualScore === undefined ? 'Missing' : String(item.manualScore);
}

function formatStatus(item: ManualPortfolioRankedItem): string {
  if (item.status === 'ranked') {
    return 'Ranked';
  }

  if (item.status === 'invalid') {
    return 'Invalid';
  }

  return 'Incomplete';
}
