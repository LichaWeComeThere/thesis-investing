import type {
  ManualBusinessScoreInput,
  ManualBusinessScoreOutput
} from './domain';

const SCORE_FIELDS: Array<keyof ManualBusinessScoreInput> = [
  'businessQuality',
  'moat',
  'management',
  'balanceSheet',
  'growth',
  'valuation',
  'risk'
];

export function calculateMbsScore(
  input: ManualBusinessScoreInput = {}
): ManualBusinessScoreOutput {
  return {
    score: 0,
    maxScore: 100,
    rating: 'not-scored',
    completedCriteria: SCORE_FIELDS.filter(
      (field) => typeof input[field] === 'number'
    ).length,
    input
  };
}
