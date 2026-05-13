import type {
  ManualBusinessScoreCategory,
  ManualBusinessScoreCategoryWeights,
  ManualBusinessScoreInput,
  ManualBusinessScoreOutput,
  ManualBusinessScoreRating,
  ManualBusinessScoreValidationError,
  ManualBusinessScoreWarning
} from './domain';

export const MBS_CATEGORIES: readonly ManualBusinessScoreCategory[] = [
  'businessQuality',
  'moat',
  'management',
  'balanceSheet',
  'growth',
  'valuation',
  'risk'
];

export const MBS_CATEGORY_WEIGHTS: ManualBusinessScoreCategoryWeights = {
  businessQuality: 20,
  moat: 15,
  management: 15,
  balanceSheet: 15,
  growth: 12,
  valuation: 13,
  risk: 10
};

export const MBS_CATEGORY_MIN_SCORE = 0;
export const MBS_CATEGORY_MAX_SCORE = 10;
export const MBS_MAX_SCORE = 100;

export function calculateMbsScore(
  input: ManualBusinessScoreInput = {}
): ManualBusinessScoreOutput {
  const missingCriteria: ManualBusinessScoreCategory[] = [];
  const errors: ManualBusinessScoreValidationError[] = [];
  let completedCriteria = 0;
  let weightedScore = 0;

  for (const category of MBS_CATEGORIES) {
    const value = input[category];

    if (value === undefined) {
      missingCriteria.push(category);
      continue;
    }

    if (!isValidCategoryValue(value)) {
      errors.push({
        category,
        message: `${category} must be a finite number from 0 to 10.`,
        value
      });
      continue;
    }

    completedCriteria += 1;
    weightedScore +=
      (value / MBS_CATEGORY_MAX_SCORE) * MBS_CATEGORY_WEIGHTS[category];
  }

  const score = roundScore(weightedScore);
  const percentage = roundScore((score / MBS_MAX_SCORE) * 100);
  const rating = getRating(percentage, missingCriteria.length, errors.length);

  return {
    score,
    maxScore: MBS_MAX_SCORE,
    percentage,
    rating,
    completedCriteria,
    missingCriteria,
    warnings: getWarnings(missingCriteria, errors),
    errors,
    input
  };
}

function isValidCategoryValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MBS_CATEGORY_MIN_SCORE &&
    value <= MBS_CATEGORY_MAX_SCORE
  );
}

function getRating(
  percentage: number,
  missingCriteriaCount: number,
  errorCount: number
): ManualBusinessScoreRating {
  if (missingCriteriaCount > 0 || errorCount > 0) {
    return 'incomplete';
  }

  if (percentage < 40) {
    return 'weak';
  }

  if (percentage < 65) {
    return 'mixed';
  }

  if (percentage < 85) {
    return 'strong';
  }

  return 'exceptional';
}

function getWarnings(
  missingCriteria: ManualBusinessScoreCategory[],
  errors: ManualBusinessScoreValidationError[]
): ManualBusinessScoreWarning[] {
  const warnings: ManualBusinessScoreWarning[] = [];

  if (missingCriteria.length > 0) {
    warnings.push({
      code: 'missing-criteria',
      message: 'Score is incomplete because one or more criteria are missing.',
      categories: missingCriteria
    });
  }

  if (errors.length > 0) {
    warnings.push({
      code: 'invalid-criteria-excluded',
      message: 'Invalid criteria were excluded from the weighted score.',
      categories: errors.map((error) => error.category)
    });
  }

  return warnings;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
