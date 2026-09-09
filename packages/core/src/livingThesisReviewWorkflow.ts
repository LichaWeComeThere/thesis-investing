import type { ManualBusinessScoreInput } from './domain';
import type {
  LivingThesis,
  LivingThesisCatalyst,
  LivingThesisRisk
} from './livingThesis';
import { validateLivingThesis } from './livingThesis';
import { calculateMbsScore } from './scoring';
import type { ValidationResult } from './validation';

export const LIVING_THESIS_REVIEW_WORKFLOW_STEPS = [
  { id: 'start_review', label: 'Start review' },
  { id: 'review_thesis_summary', label: 'Review thesis summary and cases' },
  { id: 'review_risks_and_catalysts', label: 'Review risks and catalysts' },
  { id: 'review_mbs_score', label: 'Review MBS score' },
  { id: 'review_assessment', label: 'Review assessment and schedule' },
  { id: 'preview_changes', label: 'Preview changes' },
  { id: 'complete_review', label: 'Complete review' }
] as const;

export type LivingThesisReviewWorkflowStepId =
  (typeof LIVING_THESIS_REVIEW_WORKFLOW_STEPS)[number]['id'];

const SECTION_FIELDS = {
  review_thesis_summary: [
    'ticker', 'entityName', 'title', 'theme', 'summary', 'bullCase', 'bearCase'
  ],
  review_risks_and_catalysts: ['risks', 'catalysts'],
  review_assessment: [
    'lifecycle', 'conviction', 'riskLevel', 'reviewCadenceDays', 'nextReviewAt'
  ]
} as const;

const DRAFT_FIELDS = [
  ...SECTION_FIELDS.review_thesis_summary,
  ...SECTION_FIELDS.review_risks_and_catalysts,
  ...SECTION_FIELDS.review_assessment
] as const;

export type LivingThesisReviewSection = keyof typeof SECTION_FIELDS;
export type LivingThesisReviewDraft = Pick<
  LivingThesis,
  (typeof DRAFT_FIELDS)[number]
>;
export type LivingThesisReviewSectionInput<K extends LivingThesisReviewSection> =
  Pick<LivingThesisReviewDraft, (typeof SECTION_FIELDS)[K][number]>;

/** A skip is explicit; a missing score is never replaced with invented ratings. */
export type LivingThesisReviewScoreDraft =
  | { readonly kind: 'pending' }
  | { readonly kind: 'skip' }
  | {
      readonly kind: 'score';
      readonly input: Readonly<ManualBusinessScoreInput>;
    };

/** Pure in-memory workflow state. Stage 6 owns durable session IDs and timestamps. */
export type LivingThesisReviewWorkflow = {
  readonly status: 'in_progress' | 'completed' | 'abandoned';
  readonly baseline: LivingThesis;
  readonly draft: LivingThesisReviewDraft;
  readonly activeStep: LivingThesisReviewWorkflowStepId;
  readonly completedSteps: readonly LivingThesisReviewWorkflowStepId[];
  readonly reviewReason: string;
  readonly notes: string;
  readonly scoreDraft: LivingThesisReviewScoreDraft;
};

export type LivingThesisReviewResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };

export type LivingThesisReviewPreview = {
  readonly before: LivingThesisReviewDraft;
  readonly after: LivingThesisReviewDraft;
  readonly changedFields: readonly (keyof LivingThesisReviewDraft)[];
  readonly reviewReason: string;
  readonly notes: string;
  readonly scoreDraft: LivingThesisReviewScoreDraft;
};

export function startLivingThesisReviewWorkflow(
  thesis: LivingThesis
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const errors = [...validateLivingThesis(thesis).errors];
  if (thesis.lifecycle === 'archived') {
    errors.push('Unarchive the thesis before starting a review.');
  }
  if (errors.length > 0) return failure(errors);

  return success({
    status: 'in_progress',
    baseline: copyThesis(thesis),
    draft: copyDraft(thesis),
    activeStep: 'start_review',
    completedSteps: [],
    reviewReason: '',
    notes: '',
    scoreDraft: { kind: 'pending' }
  });
}

export function updateLivingThesisReviewReason(
  workflow: LivingThesisReviewWorkflow,
  reviewReason: string
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const errors = inProgressErrors(workflow);
  if (errors.length > 0) return failure(errors);
  const value = reviewReason.trim();
  const next = value === workflow.reviewReason
    ? copyWorkflow(workflow)
    : rewind(workflow, 'start_review');
  return success({ ...next, reviewReason: value });
}

export function updateLivingThesisReviewNotes(
  workflow: LivingThesisReviewWorkflow,
  notes: string
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const errors = inProgressErrors(workflow);
  if (errors.length > 0) return failure(errors);
  const value = notes.trim();
  const next = value === workflow.notes
    ? copyWorkflow(workflow)
    : rewind(workflow, 'preview_changes');
  return success({ ...next, notes: value });
}

/** Replaces one section, including clearing optional fields. Invalid drafts may be edited. */
export function updateLivingThesisReviewSection<K extends LivingThesisReviewSection>(
  workflow: LivingThesisReviewWorkflow,
  section: K,
  input: LivingThesisReviewSectionInput<K>
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const errors = inProgressErrors(workflow);
  if (!Object.hasOwn(SECTION_FIELDS, section)) {
    errors.push('The review section is not supported.');
  }
  if (errors.length > 0) return failure(errors);

  const fields = pickFields(input, SECTION_FIELDS[section]);
  const next = sameValue(pickFields(workflow.draft, SECTION_FIELDS[section]), fields)
    ? copyWorkflow(workflow)
    : rewind(workflow, section);
  return success({ ...next, draft: copyDraft({ ...next.draft, ...fields }) });
}

export function updateLivingThesisReviewScoreDraft(
  workflow: LivingThesisReviewWorkflow,
  scoreDraft: LivingThesisReviewScoreDraft
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const errors = inProgressErrors(workflow);
  if (!['pending', 'skip', 'score'].includes(scoreDraft.kind)) {
    errors.push('The score review choice is not supported.');
  }
  if (errors.length > 0) return failure(errors);
  const next = sameValue(workflow.scoreDraft, scoreDraft)
    ? copyWorkflow(workflow)
    : rewind(workflow, 'review_mbs_score');
  return success({ ...next, scoreDraft: copyScore(scoreDraft) });
}

export function returnToLivingThesisReviewStep(
  workflow: LivingThesisReviewWorkflow,
  step: LivingThesisReviewWorkflowStepId
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const errors = inProgressErrors(workflow);
  if (stepIndex(step) < 0 || stepIndex(step) > stepIndex(workflow.activeStep)) {
    errors.push('Only the current step or a previously reviewed step can be opened.');
  }
  if (errors.length > 0) return failure(errors);
  return success(rewind(workflow, step));
}

export function completeLivingThesisReviewWorkflowStep(
  workflow: LivingThesisReviewWorkflow,
  step: LivingThesisReviewWorkflowStepId
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const errors = inProgressErrors(workflow);
  if (step !== workflow.activeStep) {
    errors.push('Review steps must be completed in order.');
  }
  if (step === 'complete_review') {
    errors.push('Complete the review with the current saved thesis to check its version.');
  }
  if (errors.length > 0) return failure(errors);
  const validation = stepErrors(workflow, step);
  if (validation.length > 0) return failure(validation);

  const next = copyWorkflow(workflow);
  return success({
    ...next,
    activeStep: LIVING_THESIS_REVIEW_WORKFLOW_STEPS[stepIndex(step) + 1].id,
    completedSteps: [...next.completedSteps, step]
  });
}

/** Readiness is rechecked by the completion operation, not entrusted to the caller. */
export function validateLivingThesisReviewCompletion(
  workflow: LivingThesisReviewWorkflow,
  currentThesis: LivingThesis
): ValidationResult {
  const errors = inProgressErrors(workflow);
  if (workflow.activeStep !== 'complete_review') {
    errors.push('Complete every review step and confirm the preview before finishing.');
  }
  errors.push(...validateLivingThesis(workflow.baseline).errors);
  errors.push(...validateLivingThesis(currentThesis).errors);
  if (
    workflow.baseline.lifecycle === 'archived' ||
    currentThesis.lifecycle === 'archived'
  ) {
    errors.push('An archived thesis cannot complete an active review.');
  }
  if (currentThesis.id !== workflow.baseline.id) {
    errors.push('The saved thesis does not belong to this review.');
  }
  if (currentThesis.version !== workflow.baseline.version) {
    errors.push('The saved thesis changed after this review started. Start a review from the current version.');
  }
  errors.push(...contentErrors(workflow));
  return { valid: errors.length === 0, errors };
}

/** Marks only this workflow complete. Persisting the result requires Stage 6's transaction. */
export function completeLivingThesisReviewWorkflow(
  workflow: LivingThesisReviewWorkflow,
  currentThesis: LivingThesis
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const validation = validateLivingThesisReviewCompletion(workflow, currentThesis);
  if (!validation.valid) return failure(validation.errors);
  const next = copyWorkflow(workflow);
  return success({
    ...next,
    status: 'completed',
    completedSteps: [...next.completedSteps, 'complete_review']
  });
}

export function abandonLivingThesisReviewWorkflow(
  workflow: LivingThesisReviewWorkflow
): LivingThesisReviewResult<LivingThesisReviewWorkflow> {
  const errors = inProgressErrors(workflow);
  if (errors.length > 0) return failure(errors);
  return success({ ...copyWorkflow(workflow), status: 'abandoned' });
}

export function getLivingThesisReviewPreview(
  workflow: LivingThesisReviewWorkflow
): LivingThesisReviewPreview {
  const before = copyDraft(workflow.baseline);
  const after = copyDraft(workflow.draft);
  return {
    before,
    after,
    changedFields: DRAFT_FIELDS.filter(
      (field) => !sameValue(before[field], after[field])
    ),
    reviewReason: workflow.reviewReason,
    notes: workflow.notes,
    scoreDraft: copyScore(workflow.scoreDraft)
  };
}

function stepIndex(step: LivingThesisReviewWorkflowStepId): number {
  return LIVING_THESIS_REVIEW_WORKFLOW_STEPS.findIndex(
    (candidate) => candidate.id === step
  );
}

function inProgressErrors(workflow: LivingThesisReviewWorkflow): string[] {
  const errors: string[] = [];
  if (workflow.status !== 'in_progress') {
    errors.push('This review is no longer in progress.');
  }
  const index = stepIndex(workflow.activeStep);
  const expected = LIVING_THESIS_REVIEW_WORKFLOW_STEPS.slice(0, index).map(
    (step) => step.id
  );
  if (index < 0 || !sameValue(workflow.completedSteps, expected)) {
    errors.push('Review progress must contain each preceding step exactly once and in order.');
  }
  return errors;
}

function stepErrors(
  workflow: LivingThesisReviewWorkflow,
  step: LivingThesisReviewWorkflowStepId
): string[] {
  if (step === 'start_review') return reasonErrors(workflow.reviewReason);
  if (step === 'review_mbs_score') return scoreErrors(workflow.scoreDraft);
  if (step === 'preview_changes') return contentErrors(workflow);
  if (step in SECTION_FIELDS) {
    const section = step as LivingThesisReviewSection;
    return draftErrors(workflow.baseline, {
      ...copyDraft(workflow.baseline),
      ...pickFields(workflow.draft, SECTION_FIELDS[section])
    });
  }
  return [];
}

function contentErrors(workflow: LivingThesisReviewWorkflow): string[] {
  return [
    ...reasonErrors(workflow.reviewReason),
    ...draftErrors(workflow.baseline, workflow.draft),
    ...scoreErrors(workflow.scoreDraft)
  ];
}

function reasonErrors(reason: string): string[] {
  return reason.trim() ? [] : ['A review reason is required.'];
}

function scoreErrors(score: LivingThesisReviewScoreDraft): string[] {
  if (score.kind === 'skip') return [];
  if (score.kind !== 'score') {
    return ['Choose a new score or explicitly continue without one.'];
  }
  const result = calculateMbsScore(score.input);
  return [
    ...result.errors.map((error) => error.message),
    ...(result.missingCriteria.length > 0
      ? ['Complete all seven MBS factors before using a new score.']
      : [])
  ];
}

function draftErrors(
  baseline: LivingThesis,
  draft: LivingThesisReviewDraft
): string[] {
  const candidate = { ...baseline, ...pickFields(draft, DRAFT_FIELDS) };
  return [
    ...validateLivingThesis(candidate).errors,
    ...retainedChildErrors(baseline.risks, draft.risks),
    ...retainedChildErrors(baseline.catalysts, draft.catalysts)
  ];
}

function retainedChildErrors(
  baseline: readonly (LivingThesisRisk | LivingThesisCatalyst)[],
  proposed: readonly (LivingThesisRisk | LivingThesisCatalyst)[]
): string[] {
  const errors: string[] = [];
  for (const child of baseline) {
    const next = proposed.find((candidate) => candidate.id === child.id);
    if (!next) {
      errors.push(`Retain child ${child.id}; use its retired status instead of removing it.`);
    } else if (next.createdAt !== child.createdAt || next.updatedAt !== child.updatedAt) {
      errors.push(`Child ${child.id} timestamps are owned by the save operation.`);
    }
  }
  return errors;
}

function rewind(
  workflow: LivingThesisReviewWorkflow,
  step: LivingThesisReviewWorkflowStepId
): LivingThesisReviewWorkflow {
  const index = Math.min(stepIndex(workflow.activeStep), stepIndex(step));
  return {
    ...copyWorkflow(workflow),
    activeStep: LIVING_THESIS_REVIEW_WORKFLOW_STEPS[index].id,
    completedSteps: workflow.completedSteps.slice(0, index)
  };
}

function copyThesis(thesis: LivingThesis): LivingThesis {
  return {
    ...thesis,
    risks: thesis.risks.map((risk) => ({ ...risk })),
    catalysts: thesis.catalysts.map((catalyst) => ({ ...catalyst }))
  };
}

function copyDraft(draft: LivingThesisReviewDraft): LivingThesisReviewDraft {
  return {
    ...pickFields(draft, DRAFT_FIELDS),
    risks: draft.risks.map((risk) => ({ ...risk })),
    catalysts: draft.catalysts.map((catalyst) => ({ ...catalyst }))
  };
}

function copyScore(
  score: LivingThesisReviewScoreDraft
): LivingThesisReviewScoreDraft {
  return score.kind === 'score'
    ? { kind: 'score', input: { ...score.input } }
    : { kind: score.kind };
}

function copyWorkflow(
  workflow: LivingThesisReviewWorkflow
): LivingThesisReviewWorkflow {
  return {
    ...workflow,
    baseline: copyThesis(workflow.baseline),
    draft: copyDraft(workflow.draft),
    completedSteps: [...workflow.completedSteps],
    scoreDraft: copyScore(workflow.scoreDraft)
  };
}

function pickFields<T, K extends keyof T>(
  source: T,
  fields: readonly K[]
): Pick<T, K> {
  return Object.fromEntries(
    fields.map((field) => [field, source[field]])
  ) as Pick<T, K>;
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
    );
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const first = left as Record<string, unknown>;
  const second = right as Record<string, unknown>;
  return [...new Set([...Object.keys(first), ...Object.keys(second)])]
    .every((key) => sameValue(first[key], second[key]));
}

function success<T>(value: T): LivingThesisReviewResult<T> {
  return { ok: true, value };
}

function failure(errors: readonly string[]): LivingThesisReviewResult<never> {
  return { ok: false, errors };
}
