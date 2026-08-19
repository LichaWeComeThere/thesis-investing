import type {
  EntityId,
  IsoDateString,
  TickerSymbol
} from './domain';
import {
  isValidIsoDate,
  isValidTickerSymbol,
  normalizeTickerSymbol
} from './validation';
import type { ValidationResult } from './validation';

export const LIVING_THESIS_LIFECYCLES = [
  'draft',
  'active',
  'monitoring',
  'paused',
  'archived'
] as const;

export const LIVING_THESIS_CONVICTIONS = [
  'unrated',
  'low',
  'medium',
  'high'
] as const;

export const LIVING_THESIS_RISK_LEVELS = [
  'unrated',
  'low',
  'medium',
  'high'
] as const;

export const LIVING_THESIS_RISK_STATUSES = [
  'open',
  'resolved',
  'retired'
] as const;

export const LIVING_THESIS_CATALYST_STATUSES = [
  'open',
  'observed',
  'retired'
] as const;

export type LivingThesisLifecycle =
  (typeof LIVING_THESIS_LIFECYCLES)[number];
export type LivingThesisConviction =
  (typeof LIVING_THESIS_CONVICTIONS)[number];
export type LivingThesisRiskLevel =
  (typeof LIVING_THESIS_RISK_LEVELS)[number];
export type LivingThesisRiskStatus =
  (typeof LIVING_THESIS_RISK_STATUSES)[number];
export type LivingThesisCatalystStatus =
  (typeof LIVING_THESIS_CATALYST_STATUSES)[number];

export type LivingThesisRisk = {
  readonly id: EntityId;
  readonly thesisId: EntityId;
  readonly title: string;
  readonly detail?: string;
  readonly status: LivingThesisRiskStatus;
  readonly severity: LivingThesisRiskLevel;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
};

export type LivingThesisCatalyst = {
  readonly id: EntityId;
  readonly thesisId: EntityId;
  readonly title: string;
  readonly detail?: string;
  readonly status: LivingThesisCatalystStatus;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
};

export type LivingThesis = {
  readonly id: EntityId;
  readonly version: number;
  readonly ticker?: TickerSymbol;
  readonly entityName: string;
  readonly title: string;
  readonly theme?: string;
  readonly summary: string;
  readonly bullCase?: string;
  readonly bearCase?: string;
  readonly lifecycle: LivingThesisLifecycle;
  readonly conviction: LivingThesisConviction;
  readonly riskLevel: LivingThesisRiskLevel;
  readonly risks: readonly LivingThesisRisk[];
  readonly catalysts: readonly LivingThesisCatalyst[];
  readonly reviewCadenceDays?: number;
  readonly nextReviewAt?: IsoDateString;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
  readonly archivedAt?: IsoDateString;
};

const LIFECYCLES = new Set<LivingThesisLifecycle>(
  LIVING_THESIS_LIFECYCLES
);
const CONVICTIONS = new Set<LivingThesisConviction>(
  LIVING_THESIS_CONVICTIONS
);
const RISK_LEVELS = new Set<LivingThesisRiskLevel>(
  LIVING_THESIS_RISK_LEVELS
);
const RISK_STATUSES = new Set<LivingThesisRiskStatus>(
  LIVING_THESIS_RISK_STATUSES
);
const CATALYST_STATUSES = new Set<LivingThesisCatalystStatus>(
  LIVING_THESIS_CATALYST_STATUSES
);

/** Returns a trimmed copy without generating identity or reading runtime state. */
export function normalizeLivingThesis(thesis: LivingThesis): LivingThesis {
  const ticker = thesis.ticker?.trim();

  return {
    ...thesis,
    ...(ticker ? { ticker: normalizeTickerSymbol(ticker) } : { ticker: undefined }),
    entityName: thesis.entityName.trim(),
    title: thesis.title.trim(),
    ...(thesis.theme !== undefined ? { theme: thesis.theme.trim() } : {}),
    summary: thesis.summary.trim(),
    ...(thesis.bullCase !== undefined
      ? { bullCase: thesis.bullCase.trim() }
      : {}),
    ...(thesis.bearCase !== undefined
      ? { bearCase: thesis.bearCase.trim() }
      : {}),
    risks: thesis.risks.map(normalizeLivingThesisRisk),
    catalysts: thesis.catalysts.map(normalizeLivingThesisCatalyst)
  };
}

export function validateLivingThesis(thesis: LivingThesis): ValidationResult {
  const errors: string[] = [];

  requireText(thesis.id, 'Living Thesis id is required.', errors);
  requireText(
    thesis.entityName,
    'Living Thesis entity name is required.',
    errors
  );
  requireText(thesis.title, 'Living Thesis title is required.', errors);
  requireText(thesis.summary, 'Living Thesis summary is required.', errors);

  if (!Number.isInteger(thesis.version) || thesis.version < 1) {
    errors.push('Living Thesis version must be a positive integer.');
  }

  if (thesis.ticker !== undefined && !isValidTickerSymbol(thesis.ticker)) {
    errors.push('Living Thesis ticker must be a valid ticker symbol.');
  }

  if (!LIFECYCLES.has(thesis.lifecycle)) {
    errors.push('Living Thesis lifecycle is not supported.');
  }

  if (!CONVICTIONS.has(thesis.conviction)) {
    errors.push('Living Thesis conviction is not supported.');
  }

  if (!RISK_LEVELS.has(thesis.riskLevel)) {
    errors.push('Living Thesis risk level is not supported.');
  }

  validateOptionalText(thesis.theme, 'Living Thesis theme', errors);
  validateOptionalText(thesis.bullCase, 'Living Thesis bull case', errors);
  validateOptionalText(thesis.bearCase, 'Living Thesis bear case', errors);

  if (
    thesis.reviewCadenceDays !== undefined &&
    (!Number.isInteger(thesis.reviewCadenceDays) ||
      thesis.reviewCadenceDays < 1)
  ) {
    errors.push(
      'Living Thesis review cadence must be a positive whole number of days.'
    );
  }

  validateDate(thesis.createdAt, 'Living Thesis created date', errors);
  validateDate(thesis.updatedAt, 'Living Thesis updated date', errors);
  validateOptionalDate(
    thesis.nextReviewAt,
    'Living Thesis next review date',
    errors
  );
  validateOptionalDate(
    thesis.archivedAt,
    'Living Thesis archived date',
    errors
  );

  const childIds = new Set<EntityId>();

  if (!Array.isArray(thesis.risks)) {
    errors.push('Living Thesis risks must be an array.');
  } else {
    for (const risk of thesis.risks) {
      appendChildErrors('Risk', validateLivingThesisRisk(risk), errors);
      validateChildRelationship(
        risk.id,
        risk.thesisId,
        thesis.id,
        childIds,
        errors
      );
    }
  }

  if (!Array.isArray(thesis.catalysts)) {
    errors.push('Living Thesis catalysts must be an array.');
  } else {
    for (const catalyst of thesis.catalysts) {
      appendChildErrors(
        'Catalyst',
        validateLivingThesisCatalyst(catalyst),
        errors
      );
      validateChildRelationship(
        catalyst.id,
        catalyst.thesisId,
        thesis.id,
        childIds,
        errors
      );
    }
  }

  return toValidationResult(errors);
}

export function validateLivingThesisRisk(
  risk: LivingThesisRisk
): ValidationResult {
  const errors: string[] = [];

  requireText(risk.id, 'id is required.', errors);
  requireText(risk.thesisId, 'thesis id is required.', errors);
  requireText(risk.title, 'title is required.', errors);
  validateOptionalText(risk.detail, 'detail', errors);

  if (!RISK_STATUSES.has(risk.status)) {
    errors.push('status is not supported.');
  }

  if (!RISK_LEVELS.has(risk.severity)) {
    errors.push('severity is not supported.');
  }

  validateDate(risk.createdAt, 'created date', errors);
  validateDate(risk.updatedAt, 'updated date', errors);

  return toValidationResult(errors);
}

export function validateLivingThesisCatalyst(
  catalyst: LivingThesisCatalyst
): ValidationResult {
  const errors: string[] = [];

  requireText(catalyst.id, 'id is required.', errors);
  requireText(catalyst.thesisId, 'thesis id is required.', errors);
  requireText(catalyst.title, 'title is required.', errors);
  validateOptionalText(catalyst.detail, 'detail', errors);

  if (!CATALYST_STATUSES.has(catalyst.status)) {
    errors.push('status is not supported.');
  }

  validateDate(catalyst.createdAt, 'created date', errors);
  validateDate(catalyst.updatedAt, 'updated date', errors);

  return toValidationResult(errors);
}

function normalizeLivingThesisRisk(
  risk: LivingThesisRisk
): LivingThesisRisk {
  return {
    ...risk,
    title: risk.title.trim(),
    ...(risk.detail !== undefined ? { detail: risk.detail.trim() } : {})
  };
}

function normalizeLivingThesisCatalyst(
  catalyst: LivingThesisCatalyst
): LivingThesisCatalyst {
  return {
    ...catalyst,
    title: catalyst.title.trim(),
    ...(catalyst.detail !== undefined
      ? { detail: catalyst.detail.trim() }
      : {})
  };
}

function validateChildRelationship(
  childId: EntityId,
  childThesisId: EntityId,
  thesisId: EntityId,
  childIds: Set<EntityId>,
  errors: string[]
): void {
  if (childThesisId !== thesisId) {
    errors.push(
      `Living Thesis child ${childId || '(missing id)'} must reference its parent thesis id.`
    );
  }

  if (childId && childIds.has(childId)) {
    errors.push(`Living Thesis child id ${childId} must be unique.`);
  }

  if (childId) {
    childIds.add(childId);
  }
}

function appendChildErrors(
  label: 'Risk' | 'Catalyst',
  result: ValidationResult,
  errors: string[]
): void {
  errors.push(...result.errors.map((error) => `${label} ${error}`));
}

function requireText(value: string, message: string, errors: string[]): void {
  if (!value.trim()) {
    errors.push(message);
  }
}

function validateOptionalText(
  value: string | undefined,
  label: string,
  errors: string[]
): void {
  if (value !== undefined && !value.trim()) {
    errors.push(`${label} cannot be blank when provided.`);
  }
}

function validateDate(value: string, label: string, errors: string[]): void {
  if (!isValidIsoDate(value)) {
    errors.push(`${label} must use YYYY-MM-DD format.`);
  }
}

function validateOptionalDate(
  value: string | undefined,
  label: string,
  errors: string[]
): void {
  if (value !== undefined) {
    validateDate(value, label, errors);
  }
}

function toValidationResult(errors: string[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors
  };
}
