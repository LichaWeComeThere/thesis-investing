import type { EntityId, IsoTimestampString } from './domain';
import { isValidIsoTimestamp, type ValidationResult } from './validation';

export const LIVING_THESIS_DECISION_SCHEMA_VERSION = 1 as const;
export const LIVING_THESIS_DECISION_KINDS = ['research_note', 'review_conclusion'] as const;
export const LIVING_THESIS_DECISION_TITLE_MAX_LENGTH = 160;
export const LIVING_THESIS_DECISION_RATIONALE_MAX_LENGTH = 10_000;

export type LivingThesisDecisionKind = typeof LIVING_THESIS_DECISION_KINDS[number];

/** An immutable record of the user's reasoning; it does not change the thesis. */
export type LivingThesisDecision = {
  readonly id: EntityId;
  readonly thesisId: EntityId;
  readonly schemaVersion: typeof LIVING_THESIS_DECISION_SCHEMA_VERSION;
  readonly kind: LivingThesisDecisionKind;
  readonly title: string;
  readonly rationale: string;
  readonly reviewSessionId?: EntityId;
  readonly createdAt: IsoTimestampString;
};

/** Validates unknown storage/backup input and trims prose without rewriting identity. */
export function parseLivingThesisDecision(input: unknown):
  { ok: true; value: LivingThesisDecision } | { ok: false; errors: readonly string[] } {
  if (!isRecord(input)) return { ok: false, errors: ['Decision must be an object.'] };
  const errors: string[] = [];
  const textFields = ['id', 'thesisId', 'kind', 'title', 'rationale', 'createdAt'] as const;
  const allowedFields: readonly string[] = [...textFields, 'schemaVersion', 'reviewSessionId'];
  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    errors.push('Decision contains unsupported fields.');
  }
  for (const field of textFields) {
    if (typeof input[field] !== 'string') errors.push(`Decision.${field} must be text.`);
  }
  if (input.reviewSessionId !== undefined && typeof input.reviewSessionId !== 'string') {
    errors.push('Decision.reviewSessionId must be text when supplied.');
  }
  if (input.schemaVersion !== LIVING_THESIS_DECISION_SCHEMA_VERSION) {
    errors.push('Unsupported decision schema version.');
  }
  if (errors.length) return { ok: false, errors };

  const decision = input as unknown as LivingThesisDecision;
  if (!decision.id.trim() || !decision.thesisId.trim() ||
      (decision.reviewSessionId !== undefined && !decision.reviewSessionId.trim())) {
    errors.push('Decision, thesis, and supplied review session IDs must not be blank.');
  }
  if (!(LIVING_THESIS_DECISION_KINDS as readonly string[]).includes(decision.kind)) {
    errors.push('Unsupported decision kind.');
  } else if ((decision.kind === 'review_conclusion') !== (decision.reviewSessionId !== undefined)) {
    errors.push('A review conclusion requires a review session link; a research note cannot have one.');
  }
  const title = decision.title.trim();
  const rationale = decision.rationale.trim();
  if (!title || title.length > LIVING_THESIS_DECISION_TITLE_MAX_LENGTH) {
    errors.push(`Decision must contain 1–${LIVING_THESIS_DECISION_TITLE_MAX_LENGTH} characters.`);
  }
  if (!rationale || rationale.length > LIVING_THESIS_DECISION_RATIONALE_MAX_LENGTH) {
    errors.push(`Reason must contain 1–${LIVING_THESIS_DECISION_RATIONALE_MAX_LENGTH} characters.`);
  }
  if (!isValidIsoTimestamp(decision.createdAt)) {
    errors.push('Decision time must be a canonical UTC timestamp.');
  }
  return errors.length ? { ok: false, errors } : {
    ok: true,
    value: {
      id: decision.id,
      thesisId: decision.thesisId,
      schemaVersion: LIVING_THESIS_DECISION_SCHEMA_VERSION,
      kind: decision.kind,
      title,
      rationale,
      ...(decision.reviewSessionId !== undefined ? { reviewSessionId: decision.reviewSessionId } : {}),
      createdAt: decision.createdAt
    }
  };
}

export function validateLivingThesisDecision(input: unknown): ValidationResult {
  const parsed = parseLivingThesisDecision(input);
  return parsed.ok ? { valid: true, errors: [] } : { valid: false, errors: [...parsed.errors] };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === 'object' && !Array.isArray(input);
}
