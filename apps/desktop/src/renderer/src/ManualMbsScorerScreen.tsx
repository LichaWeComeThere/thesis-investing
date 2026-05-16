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

const scoreRatingBadgeVariants: Record<ManualBusinessScoreRating, BadgeVariant> = {
  exceptional: 'success',
  incomplete: 'warning',
  mixed: 'neutral',
  strong: 'accent',
  weak: 'risk'
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
  const completedPercent = Math.round(
    (scoreOutput.completedCriteria / MBS_CATEGORIES.length) * 100
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

      <div className="mbs-workspace-grid">
        <Card className="mbs-form-card" title="Guided manual scoring">
          <div className="mbs-disclaimer">
            Values are manually entered by the user. No live data, brokerage
            connection, trading execution, or AI analysis is used.
          </div>

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
                placeholder="Write context for your manual scoring assumptions."
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
            <Button onClick={clearInputs} type="button" variant="secondary">
              Clear inputs
            </Button>
          }
          title="Live score output"
        >
          <div className="mbs-output-panel">
            <div className={`mbs-hero-score mbs-hero-score--${scoreOutput.rating}`}>
              <span className="mbs-score-label">Manual Business Score</span>
              <strong>
                {scoreOutput.score} / {scoreOutput.maxScore}
              </strong>
              <Badge
                className={`mbs-rating-badge mbs-rating-badge--${scoreOutput.rating}`}
                variant={scoreRatingBadgeVariants[scoreOutput.rating]}
              >
                {scoreOutput.rating}
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

            <details className="mbs-output-section mbs-output-section--missing" open>
              <summary>Missing criteria</summary>
              {scoreOutput.missingCriteria.length > 0 ? (
                <ul className="mbs-chip-list">
                  {scoreOutput.missingCriteria.map((category) => (
                    <li className="mbs-chip" key={category}>
                      {categoryLabels[category]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No missing criteria.</p>
              )}
            </details>

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
          </div>
        </Card>
      </div>
    </div>
  );
}
