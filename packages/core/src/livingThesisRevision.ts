import type { EntityId, IsoTimestampString } from './domain';
import {
  normalizeLivingThesis, validateLivingThesis,
  type LivingThesis, type LivingThesisCatalyst, type LivingThesisRisk
} from './livingThesis';
import {
  getLivingThesisChildReferences, type LivingThesisChildReference
} from './livingThesisReviewSession';
import {
  validateLivingThesisReviewWorkflowState,
  type LivingThesisReviewResult, type LivingThesisReviewWorkflow
} from './livingThesisReviewWorkflow';
import { isValidIsoTimestamp, type ValidationResult } from './validation';

export const LIVING_THESIS_REVISION_SCHEMA_VERSION = 1 as const;

/** Immutable snapshots from one completed review; later Board edits do not rewrite them. */
export type LivingThesisRevision = {
  readonly id: EntityId;
  readonly thesisId: EntityId;
  readonly reviewSessionId: EntityId;
  readonly schemaVersion: typeof LIVING_THESIS_REVISION_SCHEMA_VERSION;
  readonly createdAt: IsoTimestampString;
  readonly before: LivingThesis;
  readonly after: LivingThesis;
  readonly scoreSnapshotId?: EntityId;
};

export function getLivingThesisRevisionChildReferences(
  revision: LivingThesisRevision
): LivingThesisChildReference[] {
  return [
    ...getLivingThesisChildReferences(revision.before),
    ...getLivingThesisChildReferences(revision.after)
  ];
}

/** Builds the saved aggregate without reading a clock, generating IDs, or mutating a draft. */
export function buildLivingThesisReviewAfter(
  workflow: LivingThesisReviewWorkflow,
  completedAt: IsoTimestampString
): LivingThesisReviewResult<LivingThesis> {
  const errors = [...validateLivingThesisReviewWorkflowState(workflow).errors];
  if (!['in_progress', 'completed'].includes(workflow.status) || workflow.activeStep !== 'complete_review') {
    errors.push('Confirm every review section and the final preview before applying changes.');
  }
  if (!isValidIsoTimestamp(completedAt)) errors.push('Completion time must be a canonical UTC timestamp.');
  if (!Number.isSafeInteger(workflow.baseline.version + 1)) errors.push('The next thesis version is outside the supported range.');
  const times = [workflow.baseline.createdAt, workflow.baseline.updatedAt,
    ...[...workflow.baseline.risks, ...workflow.baseline.catalysts, ...workflow.draft.risks, ...workflow.draft.catalysts]
      .flatMap((child) => [child.createdAt, child.updatedAt])];
  if (times.some((time) => !isValidIsoTimestamp(time) || time > completedAt)) {
    errors.push('Completion time cannot precede the thesis or its review children.');
  }
  if (errors.length) return { ok: false, errors };

  const before = workflow.baseline;
  const normalized = normalizeLivingThesis({ ...before, ...workflow.draft });
  const after: LivingThesis = {
    ...normalized,
    id: before.id,
    version: before.version + 1,
    createdAt: before.createdAt,
    updatedAt: completedAt,
    archivedAt: normalized.lifecycle === 'archived' ? completedAt : undefined,
    risks: completedChildren(before.risks, normalized.risks, completedAt),
    catalysts: completedChildren(before.catalysts, normalized.catalysts, completedAt)
  };
  errors.push(...transitionErrors(before, after, completedAt));
  return errors.length ? { ok: false, errors } : { ok: true, value: after };
}

/** Rejects malformed or inconsistent backup records without throwing. */
export function parseLivingThesisRevision(input: unknown): LivingThesisReviewResult<LivingThesisRevision> {
  const errors: string[] = [];
  checkObject(input, {
    text: ['id', 'thesisId', 'reviewSessionId', 'createdAt'],
    optionalText: ['scoreSnapshotId'], numbers: ['schemaVersion'], nested: ['before', 'after']
  }, 'Revision', errors);
  if (!isRecord(input)) return { ok: false, errors };
  checkSnapshot(input.before, 'Revision before', errors);
  checkSnapshot(input.after, 'Revision after', errors);
  if (errors.length) return { ok: false, errors };

  const revision = input as unknown as LivingThesisRevision;
  if (revision.schemaVersion !== LIVING_THESIS_REVISION_SCHEMA_VERSION) errors.push('Unsupported revision schema version.');
  if (!revision.id.trim() || !revision.thesisId.trim() || !revision.reviewSessionId.trim() ||
      (revision.scoreSnapshotId !== undefined && !revision.scoreSnapshotId.trim())) {
    errors.push('Revision, thesis, review session, and supplied score IDs must not be blank.');
  }
  if (!isValidIsoTimestamp(revision.createdAt)) errors.push('Revision time must be a canonical UTC timestamp.');
  if (revision.before.id !== revision.thesisId || revision.after.id !== revision.thesisId) {
    errors.push('Revision snapshots must belong to the referenced thesis.');
  }
  errors.push(...transitionErrors(revision.before, revision.after, revision.createdAt));
  return errors.length ? { ok: false, errors } : {
    ok: true, value: JSON.parse(JSON.stringify(revision)) as LivingThesisRevision
  };
}

export function validateLivingThesisRevision(input: unknown): ValidationResult {
  const parsed = parseLivingThesisRevision(input);
  return parsed.ok ? { valid: true, errors: [] } : { valid: false, errors: [...parsed.errors] };
}

type Child = LivingThesisRisk | LivingThesisCatalyst;

function completedChildren<T extends Child>(before: readonly T[], after: readonly T[], time: string): T[] {
  const previous = new Map(before.map((child) => [child.id, child]));
  return after.map((child) => {
    const prior = previous.get(child.id);
    return {
      ...child,
      createdAt: prior?.createdAt ?? time,
      updatedAt: prior && sameChildContent(prior, child) ? prior.updatedAt : time
    };
  });
}

function sameChildContent(left: Child, right: Child): boolean {
  return left.title.trim() === right.title.trim() && left.detail?.trim() === right.detail?.trim() &&
    left.status === right.status && ('severity' in left ? left.severity : undefined) ===
      ('severity' in right ? right.severity : undefined);
}

function transitionErrors(before: LivingThesis, after: LivingThesis, time: string): string[] {
  const errors = [...validateLivingThesis(before).errors, ...validateLivingThesis(after).errors];
  if (before.id !== after.id || before.createdAt !== after.createdAt) {
    errors.push('A revision must preserve the thesis identity and creation time.');
  }
  if (!Number.isSafeInteger(before.version) || !Number.isSafeInteger(after.version) || after.version !== before.version + 1) {
    errors.push('A revision must advance the thesis version exactly once.');
  }
  if (before.lifecycle === 'archived') errors.push('An archived thesis cannot complete a review.');
  if (after.updatedAt !== time || time < before.updatedAt || before.updatedAt < before.createdAt) {
    errors.push('Revision time must equal the saved thesis update and cannot reverse thesis time.');
  }
  if (after.lifecycle === 'archived' ? after.archivedAt !== time : after.archivedAt !== undefined) {
    errors.push('The completed thesis must use its completion time when archived.');
  }
  for (const children of [before.risks, before.catalysts, after.risks, after.catalysts]) {
    for (const child of children) {
      if (child.updatedAt < child.createdAt || child.updatedAt > time) {
        errors.push('Revision child timestamps must be ordered and cannot follow completion.');
      }
    }
  }
  const ownership = new Map<string, string>();
  for (const child of [...getLivingThesisChildReferences(before), ...getLivingThesisChildReferences(after)]) {
    const owner = `${child.kind}:${child.thesisId}`;
    if (ownership.has(child.id) && ownership.get(child.id) !== owner) errors.push('A revision child cannot change parent or kind.');
    ownership.set(child.id, owner);
  }
  for (const [previous, next] of [[before.risks, after.risks], [before.catalysts, after.catalysts]] as const) {
    const previousById = new Map<string, Child>(previous.map((child) => [child.id, child]));
    for (const child of previous) {
      if (!next.some((candidate) => candidate.id === child.id)) errors.push('A review must retain baseline children; retire them instead.');
    }
    for (const child of next) {
      const prior = previousById.get(child.id);
      if (prior) {
        const expectedUpdate = sameChildContent(prior, child) ? prior.updatedAt : time;
        if (child.createdAt !== prior.createdAt || child.updatedAt !== expectedUpdate) {
          errors.push('Retained child creation time must be preserved and update time must reflect content changes.');
        }
      } else if (child.createdAt !== time || child.updatedAt !== time) {
        errors.push('New review children must receive their creation and update times at completion.');
      }
    }
  }
  return errors;
}

function checkSnapshot(input: unknown, label: string, errors: string[]): void {
  checkObject(input, {
    text: ['id', 'entityName', 'title', 'summary', 'lifecycle', 'conviction', 'riskLevel', 'createdAt', 'updatedAt'],
    optionalText: ['ticker', 'theme', 'bullCase', 'bearCase', 'nextReviewAt', 'archivedAt'],
    numbers: ['version'], optionalNumbers: ['reviewCadenceDays'], nested: ['risks', 'catalysts']
  }, label, errors);
  if (!isRecord(input)) return;
  for (const field of ['risks', 'catalysts']) {
    const children = input[field];
    if (!Array.isArray(children)) { errors.push(`${label}.${field} must be an array.`); continue; }
    for (const child of children) checkObject(child, {
      text: ['id', 'thesisId', 'title', 'status', 'createdAt', 'updatedAt', ...(field === 'risks' ? ['severity'] : [])],
      optionalText: ['detail']
    }, `${label}.${field} child`, errors);
  }
}

function checkObject(input: unknown, fields: {
  text?: string[]; optionalText?: string[]; numbers?: string[]; optionalNumbers?: string[]; nested?: string[];
}, label: string, errors: string[]): void {
  if (!isRecord(input)) { errors.push(`${label} must be an object.`); return; }
  const allowed = Object.values(fields).flat();
  if (Object.keys(input).some((key) => !allowed.includes(key))) errors.push(`${label} contains unsupported fields.`);
  for (const key of fields.text ?? []) if (typeof input[key] !== 'string') errors.push(`${label}.${key} must be text.`);
  for (const key of fields.optionalText ?? []) {
    if (input[key] !== undefined && typeof input[key] !== 'string') errors.push(`${label}.${key} must be text when supplied.`);
  }
  for (const key of [...fields.numbers ?? [], ...fields.optionalNumbers ?? []]) {
    if ((fields.optionalNumbers ?? []).includes(key) && input[key] === undefined) continue;
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) errors.push(`${label}.${key} must be finite.`);
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === 'object' && !Array.isArray(input);
}
