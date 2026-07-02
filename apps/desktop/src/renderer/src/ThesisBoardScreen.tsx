import {
  calculateMbsScore,
  MBS_CATEGORIES,
  MBS_CATEGORY_MAX_SCORE,
  MBS_CATEGORY_MIN_SCORE,
  rankManualPortfolioItems,
  type ManualBusinessScoreCategory,
  type ManualPortfolioRankedItem
} from '@thesis-investing/core';
import {
  Badge,
  type BadgeVariant,
  Card,
  PageHeader
} from '@thesis-investing/ui';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { mockTheses, type MockThesis } from './data/mockTheses';

type ThesisBoardScreenProps = {
  theses?: MockThesis[];
};

type ThesisBoardRow = {
  id: string;
  ticker: string;
  companyName: string;
  theme: string;
  ideaStatus: string;
  thesisStatus: string;
  conviction: string;
  riskLevel: string;
  thesisSummary: string;
  bullCase: string;
  bearCase: string;
  keyRisks: string;
  catalysts: string;
  lastReviewedDate: string;
  nextReviewDate: string;
  previousMbsScore: number;
  categoryValues: Record<ManualBusinessScoreCategory, string>;
};

type ScoreDriver = {
  category: ManualBusinessScoreCategory;
  label: string;
  value: number;
};

const categoryLabels: Record<ManualBusinessScoreCategory, string> = {
  businessQuality: 'Business quality',
  moat: 'Moat',
  management: 'Management',
  balanceSheet: 'Balance sheet',
  growth: 'Growth',
  valuation: 'Valuation',
  risk: 'Risk'
};

const categoryHelpers: Record<ManualBusinessScoreCategory, string> = {
  businessQuality: 'Operating quality and repeatability.',
  moat: 'Durability of competitive advantage.',
  management: 'Execution, incentives, and capital allocation.',
  balanceSheet: 'Financial resilience and flexibility.',
  growth: 'Durability of future expansion.',
  valuation: 'Reasonableness of price versus quality.',
  risk: 'Higher score means lower thesis risk.'
};

export function ThesisBoardScreen({
  theses = mockTheses
}: ThesisBoardScreenProps): JSX.Element {
  const [rows, setRows] = useState<ThesisBoardRow[]>(() =>
    theses.map(thesisToBoardRow)
  );
  const [selectedRowId, setSelectedRowId] = useState(
    () => rows[0]?.id ?? ''
  );

  const scoredRows = useMemo(
    () =>
      rows.map((row) => ({
        row,
        scoreOutput: calculateMbsScore(buildMbsInput(row.categoryValues))
      })),
    [rows]
  );
  const rankedItems = useMemo(
    () =>
      rankManualPortfolioItems(
        scoredRows.map(({ row, scoreOutput }) => ({
          companyName: row.companyName,
          id: row.id,
          manualScore:
            scoreOutput.rating === 'incomplete' || scoreOutput.errors.length > 0
              ? undefined
              : scoreOutput.score,
          notes: row.thesisSummary,
          ticker: row.ticker
        }))
      ),
    [scoredRows]
  );
  const rankedItemsById = useMemo(
    () => new Map(rankedItems.map((item) => [item.id, item])),
    [rankedItems]
  );
  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows]
  );
  const scoreOutputsById = useMemo(
    () => new Map(scoredRows.map((item) => [item.row.id, item.scoreOutput])),
    [scoredRows]
  );
  const rankedRows = rankedItems
    .map((item) => rowsById.get(item.id))
    .filter((row): row is ThesisBoardRow => Boolean(row));
  const selectedRow =
    rows.find((row) => row.id === selectedRowId) ?? rankedRows[0] ?? rows[0];
  const selectedScoreOutput = selectedRow
    ? scoreOutputsById.get(selectedRow.id)
    : undefined;
  const selectedRankedItem = selectedRow
    ? rankedItemsById.get(selectedRow.id)
    : undefined;
  const strongestDrivers = selectedScoreOutput
    ? getScoreDrivers(selectedScoreOutput.input, 'strongest')
    : [];
  const weakestDrivers = selectedScoreOutput
    ? getScoreDrivers(selectedScoreOutput.input, 'weakest')
    : [];
  const selectedScoreChange = selectedRow
    ? formatBoardScoreChange(selectedRow)
    : '0';

  function updateSelectedField(
    field: keyof Omit<ThesisBoardRow, 'id' | 'categoryValues'>,
    value: string
  ): void {
    if (!selectedRow) {
      return;
    }

    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === selectedRow.id
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  }

  function updateSelectedCategory(
    category: ManualBusinessScoreCategory,
    value: string
  ): void {
    if (!selectedRow) {
      return;
    }

    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === selectedRow.id
          ? {
              ...row,
              categoryValues: {
                ...row.categoryValues,
                [category]: value
              }
            }
          : row
      )
    );
  }

  return (
    <div className="thesis-board-screen">
      <PageHeader
        badge={<Badge variant="accent">Prototype</Badge>}
        description="Review ranked investment ideas, thesis details, and editable local MBS score inputs in one workspace."
        eyebrow="Merged workflow"
        title="Thesis Board"
      />

      <div className="thesis-board-layout">
        <Card className="thesis-board-rank-card" title="Ranked theses">
          <div className="thesis-board-panel-kicker">
            <span>Rank Companies</span>
            <strong>{rankedRows.length} ideas</strong>
          </div>
          <div className="thesis-board-list" role="list">
            {rankedRows.map((row, index) => {
              const scoreOutput = scoreOutputsById.get(row.id);
              const rankedItem = rankedItemsById.get(row.id);
              const isSelected = row.id === selectedRow?.id;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`thesis-board-list-item${
                    isSelected ? ' thesis-board-list-item--selected' : ''
                  }`}
                  key={row.id}
                  onClick={() => setSelectedRowId(row.id)}
                  type="button"
                >
                  <span className="thesis-board-rank-number">
                    {formatRank(rankedItem, index)}
                  </span>
                  <span className="thesis-board-list-copy">
                    <strong>{row.ticker}</strong>
                    <span>{row.companyName}</span>
                    <small>{row.theme}</small>
                  </span>
                  <span className="thesis-board-list-score">
                    <strong>
                      {scoreOutput ? Math.round(scoreOutput.score) : '--'}
                    </strong>
                    <small>MBS</small>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {selectedRow && selectedScoreOutput ? (
          <>
            <Card className="thesis-board-detail-card" title="Thesis details">
              <div className="thesis-board-detail-header">
                <div>
                  <span>{selectedRow.theme}</span>
                  <h2>{selectedRow.companyName}</h2>
                  <p>{selectedRow.ticker}</p>
                </div>
                <div className="thesis-board-status-stack">
                  <Badge variant={getThesisStatusVariant(selectedRow.thesisStatus)}>
                    {selectedRow.thesisStatus}
                  </Badge>
                  <span>Review Thesis</span>
                </div>
              </div>

              <div className="thesis-board-metric-grid">
                <Metric label="MBS score" value={`${selectedScoreOutput.score}`} />
                <Metric label="Conviction" value={selectedRow.conviction} />
                <Metric label="Risk" value={selectedRow.riskLevel} />
                <Metric label="Rank" value={formatRank(selectedRankedItem, 0)} />
              </div>

              <div className="thesis-board-edit-grid">
                <label>
                  <span>Conviction</span>
                  <select
                    aria-label="Conviction"
                    onChange={(event) =>
                      updateSelectedField('conviction', event.currentTarget.value)
                    }
                    value={selectedRow.conviction}
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                    <option>Unrated</option>
                  </select>
                </label>
                <label>
                  <span>Risk</span>
                  <select
                    aria-label="Risk"
                    onChange={(event) =>
                      updateSelectedField('riskLevel', event.currentTarget.value)
                    }
                    value={selectedRow.riskLevel}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
                <label>
                  <span>Thesis status</span>
                  <select
                    aria-label="Thesis status"
                    onChange={(event) =>
                      updateSelectedField(
                        'thesisStatus',
                        event.currentTarget.value
                      )
                    }
                    value={selectedRow.thesisStatus}
                  >
                    <option>Strong</option>
                    <option>Stable</option>
                    <option>Improving</option>
                    <option>Weakening</option>
                    <option>Broken</option>
                  </select>
                </label>
                <label>
                  <span>Next review</span>
                  <input
                    aria-label="Next review date"
                    onChange={(event) =>
                      updateSelectedField(
                        'nextReviewDate',
                        event.currentTarget.value
                      )
                    }
                    type="date"
                    value={selectedRow.nextReviewDate}
                  />
                </label>
              </div>

              <section className="thesis-board-summary-card">
                <div>
                  <span>Thesis summary</span>
                  <strong>{selectedRow.thesisStatus} thesis</strong>
                </div>
                <textarea
                  aria-label="Thesis summary"
                  onChange={(event) =>
                    updateSelectedField('thesisSummary', event.currentTarget.value)
                  }
                  rows={3}
                  value={selectedRow.thesisSummary}
                />
              </section>

              <div className="thesis-board-case-grid">
                <ResearchNoteCard
                  label="Bull case"
                  onChange={(value) => updateSelectedField('bullCase', value)}
                  tone="growth"
                  value={selectedRow.bullCase}
                />
                <ResearchNoteCard
                  label="Bear case"
                  onChange={(value) => updateSelectedField('bearCase', value)}
                  tone="risk"
                  value={selectedRow.bearCase}
                />
                <ResearchNoteCard
                  label="Key risks"
                  onChange={(value) => updateSelectedField('keyRisks', value)}
                  tone="warning"
                  value={selectedRow.keyRisks}
                />
                <ResearchNoteCard
                  label="Catalysts"
                  onChange={(value) => updateSelectedField('catalysts', value)}
                  tone="data"
                  value={selectedRow.catalysts}
                />
              </div>
            </Card>

            <Card
              className="thesis-board-score-card"
              emphasis
              title="MBS score breakdown"
            >
              <div className="thesis-board-panel-kicker">
                <span>Evaluate Score</span>
                <strong>{selectedScoreOutput.completedCriteria} / 7 complete</strong>
              </div>
              <div
                className={`thesis-board-score-hero thesis-board-score-hero--${selectedScoreOutput.rating}`}
              >
                <span>Current MBS</span>
                <strong>{selectedScoreOutput.score}</strong>
                <small>/ 100</small>
                <Badge variant={getScoreVariant(selectedScoreOutput.rating)}>
                  {selectedScoreOutput.rating}
                </Badge>
              </div>

              <div className="thesis-board-score-context">
                <Metric label="Previous" value={`${selectedRow.previousMbsScore}`} />
                <Metric label="Change" value={selectedScoreChange} />
                <Metric label="Reviewed" value={selectedRow.lastReviewedDate} />
              </div>

              <div className="thesis-board-category-list">
                {MBS_CATEGORIES.map((category) => {
                  const categoryValue = selectedRow.categoryValues[category];

                  return (
                    <label className="thesis-board-category-row" key={category}>
                      <span>
                        <strong>{categoryLabels[category]}</strong>
                        <small>{categoryHelpers[category]}</small>
                        <span className="thesis-board-category-meter">
                          <span
                            style={
                              {
                                width: getCategoryScorePercent(categoryValue)
                              } as CSSProperties
                            }
                          />
                        </span>
                      </span>
                      <input
                        aria-label={`${categoryLabels[category]} score`}
                        inputMode="decimal"
                        max={MBS_CATEGORY_MAX_SCORE}
                        min={MBS_CATEGORY_MIN_SCORE}
                        onChange={(event) =>
                          updateSelectedCategory(
                            category,
                            event.currentTarget.value
                          )
                        }
                        type="number"
                        value={categoryValue}
                      />
                    </label>
                  );
                })}
              </div>

              <div className="thesis-board-driver-grid">
                <DriverList
                  drivers={strongestDrivers}
                  title="Strongest drivers"
                  tone="strong"
                />
                <DriverList
                  drivers={weakestDrivers}
                  title="Weakest drivers"
                  tone="weak"
                />
              </div>

              {selectedScoreOutput.missingCriteria.length > 0 ||
              selectedScoreOutput.errors.length > 0 ? (
                <div className="thesis-board-score-warning" role="alert">
                  Complete each 0-10 category score to rank this thesis.
                </div>
              ) : null}
            </Card>
          </>
        ) : (
          <Card className="thesis-board-detail-card" title="No theses available">
            <p>Add thesis ideas in the existing scorer or ranker workflows.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="thesis-board-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResearchNoteCard({
  label,
  onChange,
  tone,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  tone: 'data' | 'growth' | 'risk' | 'warning';
  value: string;
}): JSX.Element {
  return (
    <label className={`thesis-board-note-card thesis-board-note-card--${tone}`}>
      <span>{label}</span>
      <textarea
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={4}
        value={value}
      />
    </label>
  );
}

function DriverList({
  drivers,
  title,
  tone
}: {
  drivers: ScoreDriver[];
  title: string;
  tone: 'strong' | 'weak';
}): JSX.Element {
  return (
    <section
      className={`thesis-board-driver-card thesis-board-driver-card--${tone}`}
    >
      <h3>{title}</h3>
      {drivers.length > 0 ? (
        <ul>
          {drivers.map((driver) => (
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
  );
}

function thesisToBoardRow(thesis: MockThesis): ThesisBoardRow {
  const baseScore = String(thesis.mbsScore / 10);

  return {
    id: thesis.id,
    ticker: thesis.ticker,
    companyName: thesis.companyName,
    theme: thesis.theme,
    ideaStatus: thesis.ideaStatus,
    thesisStatus: thesis.thesisStatus,
    conviction: thesis.conviction,
    riskLevel: thesis.riskLevel,
    thesisSummary: thesis.thesisSummary,
    bullCase: thesis.bullCase,
    bearCase: thesis.bearCase,
    keyRisks: thesis.keyRisks,
    catalysts: thesis.catalysts,
    lastReviewedDate: thesis.lastReviewedDate,
    nextReviewDate: thesis.nextReviewDate,
    previousMbsScore: thesis.previousMbsScore,
    categoryValues: {
      balanceSheet: baseScore,
      businessQuality: baseScore,
      growth: baseScore,
      management: baseScore,
      moat: baseScore,
      risk: baseScore,
      valuation: baseScore
    }
  };
}

function buildMbsInput(
  values: Record<ManualBusinessScoreCategory, string>
): Partial<Record<ManualBusinessScoreCategory, number>> {
  return MBS_CATEGORIES.reduce<Partial<Record<ManualBusinessScoreCategory, number>>>(
    (input, category) => {
      const value = values[category].trim();

      if (value) {
        input[category] = Number(value);
      }

      return input;
    },
    {}
  );
}

function getScoreDrivers(
  input: Partial<Record<ManualBusinessScoreCategory, number>>,
  direction: 'strongest' | 'weakest'
): ScoreDriver[] {
  return MBS_CATEGORIES.flatMap((category) => {
    const value = input[category];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return [];
    }

    return [
      {
        category,
        label: categoryLabels[category],
        value
      }
    ];
  })
    .sort((first, second) =>
      direction === 'strongest'
        ? second.value - first.value
        : first.value - second.value
    )
    .slice(0, 3);
}

function getScoreVariant(rating: string): BadgeVariant {
  if (rating === 'exceptional') {
    return 'success';
  }

  if (rating === 'strong') {
    return 'accent';
  }

  if (rating === 'mixed') {
    return 'warning';
  }

  if (rating === 'weak') {
    return 'risk';
  }

  return 'neutral';
}

function getThesisStatusVariant(status: string): BadgeVariant {
  if (status === 'Strong' || status === 'Improving') {
    return 'success';
  }

  if (status === 'Weakening') {
    return 'warning';
  }

  if (status === 'Broken') {
    return 'risk';
  }

  return 'neutral';
}

function formatRank(
  rankedItem: ManualPortfolioRankedItem | undefined,
  fallbackIndex: number
): string {
  if (!rankedItem || rankedItem.rank === null) {
    return String(fallbackIndex + 1);
  }

  return String(rankedItem.rank);
}

function formatBoardScoreChange(row: ThesisBoardRow): string {
  const currentScore = calculateMbsScore(buildMbsInput(row.categoryValues)).score;
  const change = currentScore - row.previousMbsScore;

  if (change > 0) {
    return `+${change}`;
  }

  return String(change);
}

function getCategoryScorePercent(value: string): string {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return '0%';
  }

  const clampedValue = Math.min(
    MBS_CATEGORY_MAX_SCORE,
    Math.max(MBS_CATEGORY_MIN_SCORE, numberValue)
  );

  return `${(clampedValue / MBS_CATEGORY_MAX_SCORE) * 100}%`;
}
