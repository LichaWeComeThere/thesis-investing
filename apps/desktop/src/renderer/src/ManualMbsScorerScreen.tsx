import {
  calculateMbsScore,
  MBS_CATEGORIES,
  MBS_CATEGORY_MAX_SCORE,
  MBS_CATEGORY_MIN_SCORE,
  type ManualBusinessScoreCategory
} from '@thesis-investing/core';
import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import { useMemo, useState } from 'react';
import {
  buildManualMbsInput,
  createInitialMbsCategoryValues,
  type ManualMbsCategoryValueState
} from './manualMbsScorerInput';

type ManualMbsScorerScreenProps = {
  initialCategoryValues?: ManualMbsCategoryValueState;
  initialNotes?: string;
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

const categoryDescriptions: Record<ManualBusinessScoreCategory, string> = {
  businessQuality: 'Durability, margins, customer value, and operating quality.',
  moat: 'Competitive advantages, switching costs, brand, scale, or network effects.',
  management: 'Capital allocation, execution, incentives, and communication.',
  balanceSheet: 'Debt, liquidity, resilience, and financial flexibility.',
  growth: 'User-assessed revenue, earnings, cash flow, or market expansion quality.',
  valuation: 'Manual view of price paid relative to business quality and prospects.',
  risk: 'Manual view of downside, cyclicality, concentration, disruption, or fragility.'
};

export function ManualMbsScorerScreen({
  initialCategoryValues,
  initialNotes = ''
}: ManualMbsScorerScreenProps): JSX.Element {
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

  return (
    <div className="mbs-screen">
      <PageHeader
        badge={<Badge variant="accent">Manual inputs only</Badge>}
        description="Enter your own category scores from 0 to 10. Thesis Investing uses deterministic local scoring only; this is educational software, not a buy, sell, or hold recommendation."
        eyebrow="Phase 1 Manual Business Score"
        title="MBS Scorer"
      />

      <Card title="Manual category inputs">
        <div className="mbs-disclaimer">
          Values are manually entered by the user. No live data, brokerage
          connection, trading execution, or AI analysis is used.
        </div>

        <div className="mbs-input-grid">
          {MBS_CATEGORIES.map((category) => (
            <label className="mbs-field" key={category}>
              <span className="mbs-field-label">{categoryLabels[category]}</span>
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

        <label className="mbs-notes-field">
          <span className="mbs-field-label">Optional notes</span>
          <span className="mbs-field-description">
            Notes are saved only in this screen state for now and do not affect
            the score.
          </span>
          <textarea
            onChange={(event) => setNotes(event.currentTarget.value)}
            placeholder="Write context for your manual scoring assumptions."
            rows={4}
            value={notes}
          />
        </label>
      </Card>

      <Card
        footer={
          <Button onClick={clearInputs} type="button" variant="secondary">
            Clear inputs
          </Button>
        }
        title="Deterministic score output"
      >
        <div className="mbs-score-summary">
          <div className="mbs-score-card">
            <span className="mbs-score-label">Score</span>
            <strong>
              {scoreOutput.score} / {scoreOutput.maxScore}
            </strong>
          </div>
          <div className="mbs-score-card">
            <span className="mbs-score-label">Percentage</span>
            <strong>{scoreOutput.percentage}%</strong>
          </div>
          <div className="mbs-score-card">
            <span className="mbs-score-label">Rating</span>
            <strong>{scoreOutput.rating}</strong>
          </div>
          <div className="mbs-score-card">
            <span className="mbs-score-label">Completed criteria</span>
            <strong>
              {scoreOutput.completedCriteria} / {MBS_CATEGORIES.length}
            </strong>
          </div>
        </div>

        <div className="mbs-output-section">
          <h3>Missing criteria</h3>
          {scoreOutput.missingCriteria.length > 0 ? (
            <ul>
              {scoreOutput.missingCriteria.map((category) => (
                <li key={category}>{categoryLabels[category]}</li>
              ))}
            </ul>
          ) : (
            <p>No missing criteria.</p>
          )}
        </div>

        <div className="mbs-output-section">
          <h3>Warnings and errors</h3>
          {scoreOutput.warnings.length > 0 || scoreOutput.errors.length > 0 ? (
            <ul>
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
        </div>
      </Card>
    </div>
  );
}
