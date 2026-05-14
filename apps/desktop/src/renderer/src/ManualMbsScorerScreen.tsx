import {
  calculateMbsScore,
  MBS_CATEGORIES,
  MBS_CATEGORY_MAX_SCORE,
  MBS_CATEGORY_MIN_SCORE,
  MBS_CATEGORY_WEIGHTS,
  type ManualBusinessScoreCategory,
  type ManualBusinessScoreOutput,
  type ManualBusinessScoreRating
} from '@thesis-investing/core';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  type BadgeVariant
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

type ScoringBucketId = 'economics' | 'execution' | 'outlook';

type ScoringBucket = {
  id: ScoringBucketId;
  title: string;
  bucketDescription: string;
  categories: readonly ManualBusinessScoreCategory[];
};

const SCORING_BUCKETS: ScoringBucket[] = [
  {
    id: 'economics',
    title: 'Economics & defensibility',
    bucketDescription:
      'How durable the business model is and how hard it would be for rivals to take share or compress margins.',
    categories: ['businessQuality', 'moat']
  },
  {
    id: 'execution',
    title: 'Leadership & financial footing',
    bucketDescription:
      'How leadership allocates capital and communicates, plus debt, cash, and room to maneuver if conditions worsen.',
    categories: ['management', 'balanceSheet']
  },
  {
    id: 'outlook',
    title: 'Growth, price, and downside',
    bucketDescription:
      'What you expect from the business ahead, how demanding the current price is, and how you see fragility or downside.',
    categories: ['growth', 'valuation', 'risk']
  }
];

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
  businessQuality:
    'Your read on margins, repeat demand, pricing power, and how well the company runs day to day.',
  moat: 'Your read on how protected profits are from competition over the next several years.',
  management:
    'Your read on incentives, candor, M&A discipline, buybacks versus reinvestment, and follow-through.',
  balanceSheet:
    'Your read on leverage, liquidity, refinancing risk, and cushion if revenue slips.',
  growth:
    'Your read on revenue, earnings, cash flow, or runway—not a forecast, just quality of opportunity.',
  valuation:
    'Your read on what you pay today versus what the business is likely to deliver (not a model output).',
  risk:
    'Your read on cyclicality, concentration, regulation, disruption, or anything that could impair the thesis.'
};

const termTooltips: Record<ManualBusinessScoreCategory, string> = {
  businessQuality:
    'In this tool, “business quality” means your holistic judgment of how attractive and resilient the economics are—not a single accounting ratio.',
  moat:
    'Investors often say “moat” for durable competitive advantages—things like brand, scale, switching costs, or network effects that make it hard for rivals to win.',
  management:
    'Here this means your confidence in leadership: capital allocation, execution, alignment with shareholders, and transparency—not personality.',
  balanceSheet:
    'The balance sheet is assets versus liabilities: debt levels, cash, maturities, and whether the company can fund itself through a rough patch.',
  growth:
    '“Growth” here is your qualitative view of how revenue, profit, or cash generation can expand—not a growth-rate forecast from data feeds.',
  valuation:
    '“Valuation” is your judgment of price versus fundamentals—multiples, yield, or scenario value—based on what you already believe about the business.',
  risk:
    '“Risk” captures downside you care about: macro, industry, customer concentration, balance sheet, or disruption—not a statistical VaR number.'
};

const ratingPresentation: Record<
  ManualBusinessScoreRating,
  { headline: string; detail: string }
> = {
  incomplete: {
    headline: 'Incomplete',
    detail:
      'Some categories are empty or invalid, so the headline score does not yet reflect a full manual picture.'
  },
  weak: {
    headline: 'Below average conviction',
    detail: 'On your own inputs, the weighted score sits in the lower part of the 0–100 range.'
  },
  mixed: {
    headline: 'Mixed profile',
    detail: 'On your own inputs, the weighted score sits in the middle band—strengths and trade-offs together.'
  },
  strong: {
    headline: 'Strong profile',
    detail: 'On your own inputs, the weighted score sits in the upper-middle band before the very top tier.'
  },
  exceptional: {
    headline: 'Top tier on your rubric',
    detail: 'On your own inputs, the weighted score sits in the highest band this screen allows.'
  }
};

function categoryContributionPoints(
  category: ManualBusinessScoreCategory,
  value: number
): number {
  return (value / MBS_CATEGORY_MAX_SCORE) * MBS_CATEGORY_WEIGHTS[category];
}

function parseCategoryCell(raw: string | undefined): number | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return undefined;
  }
  if (value < MBS_CATEGORY_MIN_SCORE || value > MBS_CATEGORY_MAX_SCORE) {
    return undefined;
  }
  return value;
}

function formatPointsLabel(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function bucketMaxPoints(bucket: ScoringBucket): number {
  return bucket.categories.reduce((sum, c) => sum + MBS_CATEGORY_WEIGHTS[c], 0);
}

function bucketEarnedPoints(
  bucket: ScoringBucket,
  values: ManualMbsCategoryValueState
): number {
  let sum = 0;
  for (const category of bucket.categories) {
    const value = parseCategoryCell(values[category]);
    if (value === undefined) {
      continue;
    }
    sum += categoryContributionPoints(category, value);
  }
  return Math.round(sum * 100) / 100;
}

function simpleAverageOnHundred(
  values: ManualMbsCategoryValueState
): number | undefined {
  const nums: number[] = [];
  for (const category of MBS_CATEGORIES) {
    const value = parseCategoryCell(values[category]);
    if (value === undefined) {
      continue;
    }
    nums.push(value);
  }
  if (nums.length === 0) {
    return undefined;
  }
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.round(avg * 10 * 100) / 100;
}

const bucketTooltips: Record<ScoringBucketId, string> = {
  economics:
    'This bucket captures how strong the business is on its own and how well it can defend profits—both use your 0–10 judgments, then the app applies fixed weights.',
  execution:
    'This bucket blends people risk (management) and financial flexibility (balance sheet). Each line is still just your opinion on a 0–10 scale.',
  outlook:
    'This bucket covers growth expectations, what you pay today, and downside risks. It is the widest bucket, so the progress bar can move quickly as you fill lines.'
};

const actionSignalByRating: Record<
  ManualBusinessScoreRating,
  { label: string; sentence: string }
> = {
  incomplete: {
    label: 'Finish inputs',
    sentence: 'Fill and fix every category so the headline score reflects the full rubric.'
  },
  weak: {
    label: 'Cautious signal',
    sentence: 'On your entries, the weighted score sits in the lower band—double-check any low marks you were unsure about.'
  },
  mixed: {
    label: 'Balanced signal',
    sentence: 'Your scores mix highs and lows; the total sits near the middle of the 0–100 range.'
  },
  strong: {
    label: 'Constructive signal',
    sentence: 'Your weighted inputs land in the upper-middle band before the very top tier.'
  },
  exceptional: {
    label: 'Very constructive signal',
    sentence: 'Your weighted inputs reach the highest band this screen allows on your own rubric.'
  }
};

function mbsRatingBadgeVariant(rating: ManualBusinessScoreRating): BadgeVariant {
  if (rating === 'incomplete') {
    return 'neutral';
  }
  if (rating === 'weak' || rating === 'mixed') {
    return 'accent';
  }
  return 'success';
}

function InfoTip({
  id,
  label,
  text
}: {
  id: string;
  label: string;
  text: string;
}): JSX.Element {
  return (
    <span className="mbs-tooltip">
      <button
        aria-describedby={id}
        className="mbs-tooltip-trigger"
        type="button"
      >
        <span className="mbs-tooltip-trigger-inner">i</span>
        <span className="mbs-visually-hidden">About {label}</span>
      </button>
      <span className="mbs-tooltip-popover" id={id} role="tooltip">
        {text}
      </span>
    </span>
  );
}

type ScoringBucketBlockProps = {
  bucket: ScoringBucket;
  categoryValues: ManualMbsCategoryValueState;
  earned: number;
  isOpen: boolean;
  maxPts: number;
  onToggle: (id: ScoringBucketId) => void;
  updateCategoryValue: (
    category: ManualBusinessScoreCategory,
    value: string
  ) => void;
};

function ScoringBucketBlock({
  bucket,
  categoryValues,
  earned,
  isOpen,
  maxPts,
  onToggle,
  updateCategoryValue
}: ScoringBucketBlockProps): JSX.Element {
  const progressPct =
    maxPts > 0 ? Math.min(100, Math.max(0, (earned / maxPts) * 100)) : 0;

  return (
    <section
      className={`mbs-bucket mbs-bucket--accordion${isOpen ? ' mbs-bucket--open' : ''}`}
    >
      <button
        aria-expanded={isOpen}
        className="mbs-bucket-toggle"
        onClick={() => onToggle(bucket.id)}
        type="button"
      >
        <span className="mbs-bucket-summary-main">
          <span className="mbs-bucket-title-wrap">
            <span className="mbs-bucket-title">{bucket.title}</span>
            <InfoTip
              id={`tip-bucket-${bucket.id}`}
              label={bucket.title}
              text={bucketTooltips[bucket.id]}
            />
          </span>
          <span className="mbs-bucket-points" aria-label="Weighted points earned in this bucket">
            {formatPointsLabel(earned)} / {maxPts} pts
          </span>
          <span aria-hidden className="mbs-bucket-chevron">
            {isOpen ? '▾' : '▸'}
          </span>
        </span>
        <span className="mbs-bucket-description">{bucket.bucketDescription}</span>
        <div
          aria-valuemax={maxPts}
          aria-valuemin={0}
          aria-valuenow={Math.round(earned * 10) / 10}
          className="mbs-bucket-progress"
          role="progressbar"
        >
          <div
            className="mbs-bucket-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </button>
      {isOpen ? (
        <div className="mbs-bucket-panel">
          <div className="mbs-bucket-grid">
            {bucket.categories.map((category) => (
              <label className="mbs-field" key={category}>
                <span className="mbs-field-label-row">
                  <span className="mbs-field-label">{categoryLabels[category]}</span>
                  <InfoTip
                    id={`tip-${category}`}
                    label={categoryLabels[category]}
                    text={termTooltips[category]}
                  />
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
                  placeholder="0–10"
                  type="text"
                  value={categoryValues[category] ?? ''}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type WhySection = {
  id: string;
  title: string;
  body: string;
};

type BucketStrengthRow = {
  bucket: ScoringBucket;
  scoredCount: number;
  slotCount: number;
  sumPoints: number;
  avgPointsPerScoredField: number;
};

function getBucketStrengthRows(output: ManualBusinessScoreOutput): BucketStrengthRow[] {
  return SCORING_BUCKETS.map((bucket) => {
    let sumPoints = 0;
    let scoredCount = 0;
    for (const category of bucket.categories) {
      const value = output.input[category];
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < MBS_CATEGORY_MIN_SCORE ||
        value > MBS_CATEGORY_MAX_SCORE
      ) {
        continue;
      }
      scoredCount += 1;
      sumPoints += categoryContributionPoints(category, value);
    }
    const slotCount = bucket.categories.length;
    const avgPointsPerScoredField =
      scoredCount > 0 ? sumPoints / scoredCount : 0;
    return {
      bucket,
      scoredCount,
      slotCount,
      sumPoints,
      avgPointsPerScoredField
    };
  });
}

function formatBucketList(rows: BucketStrengthRow[]): string {
  return rows.map((row) => row.bucket.title).join(' and ');
}

function buildWhyThisScoreSections(output: ManualBusinessScoreOutput): WhySection[] {
  const bucketRows = getBucketStrengthRows(output);
  const rowsWithScores = bucketRows.filter((row) => row.scoredCount > 0);
  const complete = output.missingCriteria.length === 0 && output.errors.length === 0;
  const ratingLine = ratingPresentation[output.rating];

  let overallBody: string;
  if (complete) {
    overallBody = `Your weighted total is ${output.score} out of ${output.maxScore} (${output.percentage}%), labeled “${ratingLine.headline.toLowerCase()}.” ${ratingLine.detail}`;
  } else {
    overallBody = `Right now the sheet shows ${output.score} out of ${output.maxScore} (${output.percentage}%) with an “${ratingLine.headline.toLowerCase()}” label because something is still blank or invalid. ${ratingLine.detail}`;
  }

  let strongestBody: string;
  if (rowsWithScores.length === 0) {
    strongestBody =
      'Once you enter valid 0–10 scores, this line will highlight which theme bucket is adding the most impact per field you filled.';
  } else {
    const maxAvg = Math.max(...rowsWithScores.map((row) => row.avgPointsPerScoredField));
    const strongest = rowsWithScores.filter(
      (row) => row.avgPointsPerScoredField === maxAvg
    );
    const names = formatBucketList(strongest);
    const tiePhrase =
      strongest.length > 1
        ? `${names} tie for the highest average weighted contribution per scored line among the buckets you started.`
        : `${names} carries the highest average weighted contribution per scored line among the buckets you started.`;
    strongestBody = tiePhrase;
  }

  let weakestBody: string;
  if (rowsWithScores.length === 0) {
    weakestBody =
      'Add at least one valid score to see which bucket is pulling the average down relative to the others.';
  } else if (rowsWithScores.length === 1) {
    weakestBody =
      'Only one bucket has scores so far. Add another bucket to compare which area looks softer on your rubric.';
  } else {
    const minAvg = Math.min(...rowsWithScores.map((row) => row.avgPointsPerScoredField));
    const weakest = rowsWithScores.filter(
      (row) => row.avgPointsPerScoredField === minAvg
    );
    const tiedStrongWeak =
      weakest.length === rowsWithScores.length &&
      rowsWithScores.every(
        (row) => row.avgPointsPerScoredField === rowsWithScores[0].avgPointsPerScoredField
      );
    if (tiedStrongWeak) {
      weakestBody =
        'Every scored bucket is contributing evenly on average, so no single bucket stands out as softer yet.';
    } else {
      weakestBody = `${formatBucketList(weakest)} ${
        weakest.length > 1 ? 'look' : 'looks'
      } comparatively softer on the averages of the lines you already filled.`;
    }
  }

  const missingLines: string[] = [];
  if (output.missingCriteria.length > 0) {
    const names = output.missingCriteria.map((c) => categoryLabels[c]).join(', ');
    missingLines.push(`Still blank: ${names}.`);
  }
  if (output.errors.length > 0) {
    const names = output.errors.map((e) => categoryLabels[e.category]).join(', ');
    missingLines.push(`Out of range—use whole numbers from 0 through 10 for: ${names}.`);
  }
  const missingBody =
    missingLines.length > 0
      ? missingLines.join(' ')
      : 'Every category has a valid score, so nothing is missing from the weighted total.';

  let reviewBody: string;
  if (output.errors.length > 0) {
    reviewBody =
      'Correct the highlighted inputs first so each line counts toward the same 0–10 scale.';
  } else if (output.missingCriteria.length > 0) {
    const labels = output.missingCriteria.map((c) => categoryLabels[c]);
    const preview =
      labels.length <= 3
        ? labels.join(', ')
        : `${labels.slice(0, 3).join(', ')}, and ${labels.length - 3} more`;
    reviewBody = `Complete ${preview} next so the rubric can include every weighted line.`;
  } else if (rowsWithScores.length > 1) {
    const minAvg = Math.min(...rowsWithScores.map((row) => row.avgPointsPerScoredField));
    const weakest = rowsWithScores.filter(
      (row) => row.avgPointsPerScoredField === minAvg
    );
    const tiedAll =
      weakest.length === rowsWithScores.length &&
      rowsWithScores.every(
        (row) => row.avgPointsPerScoredField === rowsWithScores[0].avgPointsPerScoredField
      );
    if (tiedAll) {
      reviewBody =
        'Re-read any score that feels uncertain; when every bucket matches, small edits in any line move the total.';
    } else {
      reviewBody = `Re-check the judgments behind ${formatBucketList(
        weakest
      )}—that is where your current numbers lean lowest before changing anything else.`;
    }
  } else {
    reviewBody =
      'Continue filling the other buckets so the story across economics, execution, and outlook stays consistent.';
  }

  return [
    { id: 'overall', title: 'Overall result', body: overallBody },
    { id: 'strongest', title: 'Strongest buckets', body: strongestBody },
    { id: 'weakest', title: 'Weakest buckets', body: weakestBody },
    { id: 'missing', title: 'Missing information', body: missingBody },
    { id: 'next', title: 'What to review next', body: reviewBody }
  ];
}

function WhyThisScoreCard({
  output
}: {
  output: ManualBusinessScoreOutput;
}): JSX.Element {
  const sections = buildWhyThisScoreSections(output);

  return (
    <div className="mbs-why-card">
      <div className="mbs-why-card-header">
        <h3 className="mbs-why-card-title">Why this score?</h3>
        <p className="mbs-why-card-sub">
          Rule-based summary from your entries and the built-in weights only—no AI, APIs,
          or new data.
        </p>
      </div>
      <ol className="mbs-why-section-list">
        {sections.map((section) => (
          <li className="mbs-why-section" key={section.id}>
            <h4 className="mbs-why-section-title">{section.title}</h4>
            <p className="mbs-why-section-body">{section.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ManualMbsScorerScreen({
  initialCategoryValues,
  initialNotes = ''
}: ManualMbsScorerScreenProps): JSX.Element {
  const [categoryValues, setCategoryValues] =
    useState<ManualMbsCategoryValueState>(() =>
      createInitialMbsCategoryValues(initialCategoryValues)
    );
  const [notes, setNotes] = useState(initialNotes);

  const [openBuckets, setOpenBuckets] = useState<Record<ScoringBucketId, boolean>>(
    () => ({
      economics: true,
      execution: false,
      outlook: false
    })
  );

  function toggleBucket(id: ScoringBucketId): void {
    setOpenBuckets((current) => ({ ...current, [id]: !current[id] }));
  }

  const rawHundred = useMemo(
    () => simpleAverageOnHundred(categoryValues),
    [categoryValues]
  );

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
    setOpenBuckets({
      economics: true,
      execution: false,
      outlook: false
    });
  }

  const completionLabel = `${scoreOutput.completedCriteria} / ${MBS_CATEGORIES.length}`;

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
          Values are manually entered by you. No live data, brokerage connection,
          trading execution, or AI analysis is used. “MBS” here means{' '}
          <span className="mbs-inline-def">
            Manual Business Score
            <InfoTip
              id="tip-mbs-acronym"
              label="MBS acronym"
              text="In this app, MBS is a Manual Business Score—a structured checklist you fill in—not mortgage-backed securities."
            />
          </span>
          .
        </div>

        <div className="mbs-buckets">
          {SCORING_BUCKETS.map((bucket) => {
            const maxPts = bucketMaxPoints(bucket);
            const earned = bucketEarnedPoints(bucket, categoryValues);
            return (
              <ScoringBucketBlock
                bucket={bucket}
                categoryValues={categoryValues}
                earned={earned}
                isOpen={openBuckets[bucket.id]}
                key={bucket.id}
                maxPts={maxPts}
                onToggle={toggleBucket}
                updateCategoryValue={updateCategoryValue}
              />
            );
          })}
        </div>

        <label className="mbs-notes-field">
          <span className="mbs-field-label-row">
            <span className="mbs-field-label">Optional notes</span>
            <InfoTip
              id="tip-notes"
              label="Optional notes"
              text="Notes are for your own context. They ride along in the input object but do not change the numeric score in this build."
            />
          </span>
          <span className="mbs-field-description">
            Capture assumptions, time horizon, or reminders. In this build, notes do not
            change the numeric score.
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
        emphasis
        footer={
          <Button onClick={clearInputs} type="button" variant="secondary">
            Clear inputs
          </Button>
        }
        title="Score from your entries"
      >
        <div className="mbs-output-layout">
          <div className="mbs-score-hero">
            <div className="mbs-score-hero-primary">
              <div className="mbs-score-hero-primary-label">
                <span className="mbs-score-hero-eyebrow">Adjusted MBS</span>
                <InfoTip
                  id="tip-adjusted-mbs"
                  label="Adjusted MBS"
                  text="This is the official weighted Manual Business Score: each valid 0–10 line is multiplied by its fixed weight, summed, and rounded—the same deterministic output as before, now labeled for clarity."
                />
              </div>
              <div className="mbs-score-hero-value-row mbs-score-hero-value-row--primary">
                <span className="mbs-score-hero-number mbs-score-hero-number--xl">
                  {scoreOutput.score}
                  <span className="mbs-score-hero-max"> / {scoreOutput.maxScore}</span>
                </span>
              </div>
              <p className="mbs-score-hero-microcopy">
                Weighted total from your valid entries and the built-in rubric weights—the
                headline figure for this screen.
              </p>
            </div>

            <div className="mbs-score-hero-secondary">
              <div className="mbs-score-secondary-head">
                <span className="mbs-score-secondary-label">Raw MBS</span>
                <InfoTip
                  id="tip-raw-mbs"
                  label="Raw MBS"
                  text="Teaching view only: take the average of your valid 0–10 scores and multiply by 10 so it reads on a 0–100 scale. It ignores how much each category counts in the official weighted total."
                />
              </div>
              <p className="mbs-score-secondary-value">
                {rawHundred === undefined
                  ? '—'
                  : `${formatPointsLabel(rawHundred)} / 100`}
              </p>
              <p className="mbs-score-secondary-hint">
                Simple “pulse check” for beginners—not the weighted formula.
              </p>
            </div>

            <div className="mbs-score-market-row">
              <div className="mbs-score-market-label">
                <strong>Market condition adjustment</strong>
                <InfoTip
                  id="tip-market-adj"
                  label="Market condition adjustment"
                  text="Some products nudge scores up or down when markets look stretched. This build keeps that adjustment at zero so nothing beyond your manual lines changes the weighted score."
                />
              </div>
              <p className="mbs-score-market-value">+0 pts</p>
              <p className="mbs-score-market-note">
                No live macro overlay yet—Adjusted MBS reflects only your entries and the local
                weights.
              </p>
            </div>

            <div className="mbs-score-action">
              <Badge
                className="mbs-score-signal-badge"
                variant={mbsRatingBadgeVariant(scoreOutput.rating)}
              >
                {actionSignalByRating[scoreOutput.rating].label}
              </Badge>
              <p className="mbs-score-action-copy">
                {actionSignalByRating[scoreOutput.rating].sentence}
              </p>
            </div>

            <div className="mbs-score-hero-rating-strip">
              <Badge
                className="mbs-score-profile-badge"
                variant={mbsRatingBadgeVariant(scoreOutput.rating)}
              >
                {ratingPresentation[scoreOutput.rating].headline}
              </Badge>
              <span className="mbs-score-hero-rating-caption">
                {ratingPresentation[scoreOutput.rating].detail}
              </span>
            </div>

            <dl className="mbs-score-meta">
              <div className="mbs-score-meta-item">
                <dt>Share of the rubric</dt>
                <dd>{scoreOutput.percentage}%</dd>
              </div>
              <div className="mbs-score-meta-item">
                <dt>Categories counted</dt>
                <dd>{completionLabel}</dd>
              </div>
              <div className="mbs-score-meta-item">
                <dt>Machine label</dt>
                <dd className="mbs-score-meta-mono">{scoreOutput.rating}</dd>
              </div>
            </dl>
          </div>

          <WhyThisScoreCard output={scoreOutput} />
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
