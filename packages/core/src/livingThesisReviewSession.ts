import type { EntityId, IsoTimestampString } from './domain';
import {
  LIVING_THESIS_CATALYST_STATUSES,
  LIVING_THESIS_CONVICTIONS,
  LIVING_THESIS_LIFECYCLES,
  LIVING_THESIS_RISK_LEVELS,
  LIVING_THESIS_RISK_STATUSES,
  type LivingThesis
} from './livingThesis';
import {
  validateLivingThesisReviewWorkflowState,
  type LivingThesisReviewResult,
  type LivingThesisReviewWorkflow
} from './livingThesisReviewWorkflow';
import { MBS_CATEGORIES } from './scoring';
import { isValidIsoTimestamp, type ValidationResult } from './validation';

export const LIVING_THESIS_REVIEW_SESSION_SCHEMA_VERSION = 1 as const;

/** Version counts draft saves independently from workflow.baseline.version. */
export type LivingThesisReviewSession = {
  readonly id: EntityId;
  readonly thesisId: EntityId;
  readonly schemaVersion: typeof LIVING_THESIS_REVIEW_SESSION_SCHEMA_VERSION;
  readonly version: number;
  readonly startedAt: IsoTimestampString;
  readonly updatedAt: IsoTimestampString;
  readonly abandonedAt?: IsoTimestampString;
  readonly workflow: LivingThesisReviewWorkflow;
};

export type LivingThesisChildReference = {
  readonly id: EntityId;
  readonly thesisId: EntityId;
  readonly kind: 'risk' | 'catalyst';
};

export function getLivingThesisChildReferences(
  thesis: Pick<LivingThesis, 'risks' | 'catalysts'>
): LivingThesisChildReference[] {
  return [
    ...thesis.risks.map(({ id, thesisId }) => ({ id, thesisId, kind: 'risk' as const })),
    ...thesis.catalysts.map(({ id, thesisId }) => ({ id, thesisId, kind: 'catalyst' as const }))
  ];
}

export function getLivingThesisReviewSessionChildReferences(
  session: LivingThesisReviewSession
): LivingThesisChildReference[] {
  return [
    ...getLivingThesisChildReferences(session.workflow.baseline),
    ...getLivingThesisChildReferences(session.workflow.draft)
  ];
}

/** Validates unknown storage/backup input without throwing or losing unfinished edits. */
export function parseLivingThesisReviewSession(
  input: unknown
): LivingThesisReviewResult<LivingThesisReviewSession> {
  const errors: string[] = [];
  checkFields(input, {
    strings: ['id', 'thesisId', 'startedAt', 'updatedAt'],
    optionalStrings: ['abandonedAt'], numbers: ['schemaVersion', 'version'],
    nested: ['workflow']
  }, 'Review session', errors);
  if (!isRecord(input)) return { ok: false, errors };
  const workflow = input.workflow;
  checkFields(workflow, {
    strings: ['status', 'activeStep', 'reviewReason', 'notes'],
    nested: ['baseline', 'draft', 'completedSteps', 'scoreDraft']
  }, 'Review workflow', errors);
  if (!isRecord(workflow)) return { ok: false, errors };
  checkThesisShape(workflow.baseline, false, errors);
  checkThesisShape(workflow.draft, true, errors);
  if (!Array.isArray(workflow.completedSteps) ||
      !workflow.completedSteps.every((step) => typeof step === 'string')) {
    errors.push('Review completed steps must be an array of text IDs.');
  }
  const score = workflow.scoreDraft;
  checkFields(score, { strings: ['kind'], nested: ['input'] }, 'Score draft', errors);
  if (isRecord(score)) {
    if (score.kind === 'score') {
      checkFields(score.input, {
        optionalNumbers: [...MBS_CATEGORIES], optionalStrings: ['notes']
      }, 'Score input', errors);
    } else if (!['pending', 'skip'].includes(String(score.kind)) || score.input !== undefined) {
      errors.push('A score draft must use pending, skip, or score with factor input.');
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const session = input as unknown as LivingThesisReviewSession;
  if (session.schemaVersion !== LIVING_THESIS_REVIEW_SESSION_SCHEMA_VERSION) {
    errors.push('Unsupported review session schema version.');
  }
  if (!Number.isSafeInteger(session.version) || session.version < 1) {
    errors.push('Review session version must be a positive safe integer.');
  }
  if (!session.id.trim() || !session.thesisId.trim()) {
    errors.push('Review session and thesis IDs are required.');
  }
  if (session.thesisId !== session.workflow.baseline.id) {
    errors.push('Review session must reference its baseline thesis ID.');
  }
  for (const [label, time] of [
    ['startedAt', session.startedAt], ['updatedAt', session.updatedAt],
    ...(session.abandonedAt !== undefined ? [['abandonedAt', session.abandonedAt]] : [])
  ]) {
    if (!isValidIsoTimestamp(time)) errors.push(`Review session ${label} must be a canonical UTC timestamp.`);
  }
  if (session.updatedAt < session.startedAt) errors.push('Review update cannot precede its start.');
  if (session.workflow.status === 'abandoned') {
    if (session.abandonedAt !== session.updatedAt) {
      errors.push('An abandoned review requires its abandonment time to equal its final update.');
    }
  } else if (session.workflow.status !== 'in_progress' || session.abandonedAt !== undefined) {
    errors.push('This session schema supports only in-progress and abandoned reviews.');
  }
  errors.push(...validateLivingThesisReviewWorkflowState(session.workflow).errors);

  // Draft text, dates, cadence, and partial scores can remain unfinished. Identity,
  // child ownership, enum choices, and child timestamps must remain well formed.
  const draft = session.workflow.draft;
  for (const [value, choices] of [
    [draft.lifecycle, LIVING_THESIS_LIFECYCLES],
    [draft.conviction, LIVING_THESIS_CONVICTIONS],
    [draft.riskLevel, LIVING_THESIS_RISK_LEVELS]
  ] as const) {
    if (!(choices as readonly string[]).includes(value)) errors.push('A draft assessment choice is not supported.');
  }
  const childIds = new Set<string>();
  for (const child of [...draft.risks, ...draft.catalysts]) {
    if (!child.id.trim() || childIds.has(child.id) || child.thesisId !== session.thesisId) {
      errors.push('Draft children require unique IDs and the session thesis as their parent.');
    }
    childIds.add(child.id);
    if (!isValidIsoTimestamp(child.createdAt) || !isValidIsoTimestamp(child.updatedAt)) {
      errors.push('Draft child timestamps must be canonical UTC timestamps.');
    }
  }
  for (const risk of draft.risks) {
    if (!(LIVING_THESIS_RISK_STATUSES as readonly string[]).includes(risk.status) ||
        !(LIVING_THESIS_RISK_LEVELS as readonly string[]).includes(risk.severity)) {
      errors.push('A draft risk choice is not supported.');
    }
  }
  for (const catalyst of draft.catalysts) {
    if (!(LIVING_THESIS_CATALYST_STATUSES as readonly string[]).includes(catalyst.status)) {
      errors.push('A draft catalyst choice is not supported.');
    }
  }
  const owners = new Map<string, string>();
  for (const child of getLivingThesisReviewSessionChildReferences(session)) {
    const owner = `${child.kind}:${child.thesisId}`;
    if (owners.has(child.id) && owners.get(child.id) !== owner) {
      errors.push('A review child ID cannot change its parent or kind.');
    }
    owners.set(child.id, owner);
  }
  return errors.length > 0 ? { ok: false, errors } : {
    ok: true,
    value: JSON.parse(JSON.stringify(session)) as LivingThesisReviewSession
  };
}

export function validateLivingThesisReviewSession(input: unknown): ValidationResult {
  const result = parseLivingThesisReviewSession(input);
  return result.ok ? { valid: true, errors: [] } : { valid: false, errors: [...result.errors] };
}

function checkThesisShape(value: unknown, draft: boolean, errors: string[]): void {
  checkFields(value, {
    strings: [
      'entityName', 'title', 'summary', 'lifecycle', 'conviction', 'riskLevel',
      ...(!draft ? ['id', 'createdAt', 'updatedAt'] : [])
    ],
    optionalStrings: ['ticker', 'theme', 'bullCase', 'bearCase', 'nextReviewAt', ...(!draft ? ['archivedAt'] : [])],
    numbers: draft ? [] : ['version'], optionalNumbers: ['reviewCadenceDays'],
    nested: ['risks', 'catalysts']
  }, draft ? 'Review draft' : 'Review baseline', errors);
  if (!isRecord(value)) return;
  for (const key of ['risks', 'catalysts']) {
    const items = value[key];
    if (!Array.isArray(items)) { errors.push(`${key} must be an array.`); continue; }
    for (const item of items) {
      checkFields(item, {
        strings: ['id', 'thesisId', 'title', 'status', 'createdAt', 'updatedAt', ...(key === 'risks' ? ['severity'] : [])],
        optionalStrings: ['detail']
      }, `Review ${key} item`, errors);
    }
  }
}

function checkFields(value: unknown, fields: {
  strings?: string[]; optionalStrings?: string[]; numbers?: string[];
  optionalNumbers?: string[]; nested?: string[];
}, label: string, errors: string[]): void {
  if (!isRecord(value)) { errors.push(`${label} must be an object.`); return; }
  const allowed = Object.values(fields).flat();
  if (Object.keys(value).some((key) => !allowed.includes(key))) errors.push(`${label} contains unsupported fields.`);
  for (const key of fields.strings ?? []) {
    if (typeof value[key] !== 'string') errors.push(`${label}.${key} must be text.`);
  }
  for (const key of fields.optionalStrings ?? []) {
    if (value[key] !== undefined && typeof value[key] !== 'string') errors.push(`${label}.${key} must be text when supplied.`);
  }
  for (const key of fields.numbers ?? []) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) errors.push(`${label}.${key} must be finite.`);
  }
  for (const key of fields.optionalNumbers ?? []) {
    if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key]))) {
      errors.push(`${label}.${key} must be finite when supplied.`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
