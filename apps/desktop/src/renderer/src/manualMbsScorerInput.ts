import {
  MBS_CATEGORIES,
  type ManualBusinessScoreCategory,
  type ManualBusinessScoreInput
} from '@thesis-investing/core';

export type ManualMbsCategoryValueState = Partial<
  Record<ManualBusinessScoreCategory, string>
>;

export function createInitialMbsCategoryValues(
  values: ManualMbsCategoryValueState = {}
): ManualMbsCategoryValueState {
  return MBS_CATEGORIES.reduce<ManualMbsCategoryValueState>(
    (initialValues, category) => {
      initialValues[category] = values[category] ?? '';
      return initialValues;
    },
    {}
  );
}

export function buildManualMbsInput(
  categoryValues: ManualMbsCategoryValueState,
  notes: string
): ManualBusinessScoreInput {
  const input: ManualBusinessScoreInput = {};

  for (const category of MBS_CATEGORIES) {
    const value = categoryValues[category]?.trim();

    if (!value) {
      continue;
    }

    input[category] = Number(value);
  }

  if (notes.trim()) {
    input.notes = notes;
  }

  return input;
}
