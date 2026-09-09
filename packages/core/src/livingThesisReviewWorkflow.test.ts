import { describe, expect, it } from 'vitest';
import type { ManualBusinessScoreInput } from './domain';
import type { LivingThesis } from './livingThesis';
import {
  abandonLivingThesisReviewWorkflow,
  completeLivingThesisReviewWorkflow,
  completeLivingThesisReviewWorkflowStep,
  getLivingThesisReviewPreview,
  returnToLivingThesisReviewStep,
  startLivingThesisReviewWorkflow,
  updateLivingThesisReviewNotes,
  updateLivingThesisReviewReason,
  updateLivingThesisReviewScoreDraft,
  updateLivingThesisReviewSection,
  validateLivingThesisReviewCompletion
} from './index';
import type {
  LivingThesisReviewResult,
  LivingThesisReviewSection,
  LivingThesisReviewWorkflow,
  LivingThesisReviewWorkflowStepId
} from './index';

const timestamp = '2026-09-01T10:00:00.000Z';
const completeScore: ManualBusinessScoreInput = {
  businessQuality: 8, moat: 7, management: 6, balanceSheet: 7,
  growth: 6, valuation: 5, risk: 7
};

function thesis(overrides: Partial<LivingThesis> = {}): LivingThesis {
  return {
    id: 'thesis-1', version: 4, entityName: 'Example research subject',
    title: 'Durable customer relationships', summary: 'Recurring demand supports the thesis.',
    lifecycle: 'active', conviction: 'medium', riskLevel: 'medium',
    risks: [{
      id: 'risk-1', thesisId: 'thesis-1', title: 'Concentrated customer base',
      status: 'open', severity: 'high', createdAt: timestamp, updatedAt: timestamp
    }],
    catalysts: [{
      id: 'catalyst-1', thesisId: 'thesis-1', title: 'Product expansion',
      status: 'open', createdAt: timestamp, updatedAt: timestamp
    }],
    reviewCadenceDays: 90, nextReviewAt: '2026-12-01',
    createdAt: timestamp, updatedAt: timestamp, ...overrides
  };
}

function value<T>(result: LivingThesisReviewResult<T>): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

function atStep(
  step: LivingThesisReviewWorkflowStepId,
  source = thesis()
): LivingThesisReviewWorkflow {
  let workflow = value(startLivingThesisReviewWorkflow(source));
  workflow = value(updateLivingThesisReviewReason(workflow, 'Scheduled evidence review'));
  workflow = value(updateLivingThesisReviewScoreDraft(workflow, { kind: 'skip' }));
  for (let attempt = 0; attempt < 7; attempt += 1) {
    if (workflow.activeStep === step) return workflow;
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep));
  }
  throw new Error('Requested step was not reached.');
}

function freeze<T>(input: T): T {
  if (input && typeof input === 'object') {
    Object.freeze(input);
    for (const item of Object.values(input)) freeze(item);
  }
  return input;
}

describe('Living Thesis review workflow', () => {
  it('captures a tickerless baseline and an independent draft without generating metadata', () => {
    const source = freeze(thesis());
    const workflow = value(startLivingThesisReviewWorkflow(source));
    expect(workflow).toMatchObject({
      status: 'in_progress', activeStep: 'start_review', completedSteps: [],
      reviewReason: '', notes: '', scoreDraft: { kind: 'pending' }
    });
    expect(workflow.baseline).toEqual(source);
    expect(workflow.baseline.risks[0]).not.toBe(source.risks[0]);
    expect(workflow.draft.risks[0]).not.toBe(workflow.baseline.risks[0]);
    for (const field of ['id', 'version', 'createdAt', 'updatedAt', 'archivedAt', 'mbs']) {
      expect(workflow.draft).not.toHaveProperty(field);
    }
    expect(startLivingThesisReviewWorkflow(source)).toEqual({ ok: true, value: workflow });
  });

  it.each(['draft', 'active', 'monitoring', 'paused'] as const)(
    'allows an explicit review of a %s thesis', (lifecycle) => {
      expect(startLivingThesisReviewWorkflow(thesis({ lifecycle })).ok).toBe(true);
    }
  );

  it('rejects an invalid or archived baseline', () => {
    expect(startLivingThesisReviewWorkflow(thesis({ summary: ' ', version: 0 })).ok).toBe(false);
    expect(startLivingThesisReviewWorkflow(thesis({ lifecycle: 'archived', archivedAt: timestamp })).ok).toBe(false);
  });

  it('requires a nonblank reason at the first step', () => {
    const workflow = value(updateLivingThesisReviewReason(value(startLivingThesisReviewWorkflow(thesis())), ' \n '));
    expect(completeLivingThesisReviewWorkflowStep(workflow, 'start_review')).toEqual({
      ok: false, errors: ['A review reason is required.']
    });
  });

  it('enforces the full sequence and explicitly completes a review with no new score', () => {
    const source = freeze(thesis());
    let workflow = value(updateLivingThesisReviewReason(value(startLivingThesisReviewWorkflow(source)), ' New evidence '));
    workflow = value(updateLivingThesisReviewScoreDraft(workflow, { kind: 'skip' }));
    for (const step of [
      'start_review', 'review_thesis_summary', 'review_risks_and_catalysts',
      'review_mbs_score', 'review_assessment', 'preview_changes'
    ] as const) {
      expect(workflow.activeStep).toBe(step);
      expect(completeLivingThesisReviewWorkflow(workflow, source).ok).toBe(false);
      workflow = value(completeLivingThesisReviewWorkflowStep(freeze(workflow), step));
    }
    expect(workflow.status).toBe('in_progress');
    expect(validateLivingThesisReviewCompletion(workflow, source)).toEqual({ valid: true, errors: [] });
    const completed = value(completeLivingThesisReviewWorkflow(freeze(workflow), source));
    expect(completed.status).toBe('completed');
    expect(completed.completedSteps).toHaveLength(7);
    expect(completed.reviewReason).toBe('New evidence');
    expect(completed.baseline).toEqual(source);
    expect(source.version).toBe(4);
    expect(source.updatedAt).toBe(timestamp);
  });

  it('blocks jumping forward, repeating a step, and using ordinary advancement to finish', () => {
    const start = atStep('start_review');
    expect(returnToLivingThesisReviewStep(start, 'preview_changes').ok).toBe(false);
    expect(completeLivingThesisReviewWorkflowStep(start, 'preview_changes').ok).toBe(false);
    const summary = value(completeLivingThesisReviewWorkflowStep(start, 'start_review'));
    expect(completeLivingThesisReviewWorkflowStep(summary, 'start_review').ok).toBe(false);
    expect(completeLivingThesisReviewWorkflowStep(atStep('complete_review'), 'complete_review').ok).toBe(false);
  });

  it.each([
    { completedSteps: [] },
    { completedSteps: ['start_review', 'start_review'] },
    { completedSteps: ['review_thesis_summary', 'start_review'] }
  ] as const)('rejects fabricated progress $completedSteps even when completion is called directly', ({ completedSteps }) => {
    const workflow = { ...atStep('complete_review'), completedSteps };
    expect(completeLivingThesisReviewWorkflow(workflow, thesis()).ok).toBe(false);
  });

  it('rejects an unknown active step or section instead of advancing or editing', () => {
    const workflow = atStep('start_review');
    expect(completeLivingThesisReviewWorkflowStep({ ...workflow, activeStep: 'unknown' as LivingThesisReviewWorkflowStepId }, 'start_review').ok).toBe(false);
    expect(updateLivingThesisReviewSection(workflow, 'toString' as LivingThesisReviewSection, workflow.draft).ok).toBe(false);
  });

  it('allows incomplete text drafts but requires valid content before confirming that section', () => {
    let workflow = atStep('review_thesis_summary');
    workflow = value(updateLivingThesisReviewSection(workflow, 'review_thesis_summary', { ...workflow.draft, summary: '' }));
    expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_thesis_summary').ok).toBe(false);
    workflow = value(updateLivingThesisReviewSection(workflow, 'review_thesis_summary', { ...workflow.draft, summary: 'Updated evidence summary' }));
    expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_thesis_summary').ok).toBe(true);
    expect(workflow.baseline.summary).toBe(thesis().summary);
  });

  it.each(['risks', 'catalysts'] as const)('requires baseline %s to be retained', (field) => {
    const initial = atStep('review_risks_and_catalysts');
    const workflow = value(updateLivingThesisReviewSection(initial, 'review_risks_and_catalysts', { ...initial.draft, [field]: [] }));
    expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_risks_and_catalysts').ok).toBe(false);
  });

  it('accepts retirement and new children with supplied identity while preserving the baseline', () => {
    const initial = freeze(atStep('review_risks_and_catalysts'));
    const workflow = value(updateLivingThesisReviewSection(initial, 'review_risks_and_catalysts', {
      risks: [{ ...initial.draft.risks[0], status: 'retired' }],
      catalysts: [...initial.draft.catalysts, {
        id: 'catalyst-2', thesisId: 'thesis-1', title: 'New product evidence',
        status: 'open', createdAt: timestamp, updatedAt: timestamp
      }]
    }));
    expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_risks_and_catalysts').ok).toBe(true);
    expect(initial.baseline.risks[0].status).toBe('open');
    expect(initial.baseline.catalysts).toHaveLength(1);
  });

  it.each(['thesisId', 'id', 'createdAt', 'updatedAt'] as const)(
    'rejects changing an existing child’s %s', (field) => {
      const initial = atStep('review_risks_and_catalysts');
      const replacement = field.endsWith('At') ? '2026-09-02T10:00:00.000Z' : 'different-id';
      const workflow = value(updateLivingThesisReviewSection(initial, 'review_risks_and_catalysts', {
        risks: [{ ...initial.draft.risks[0], [field]: replacement }], catalysts: initial.draft.catalysts
      }));
      expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_risks_and_catalysts').ok).toBe(false);
    }
  );

  it('rejects IDs shared across risk and catalyst kinds', () => {
    const initial = atStep('review_risks_and_catalysts');
    const workflow = value(updateLivingThesisReviewSection(initial, 'review_risks_and_catalysts', {
      risks: initial.draft.risks,
      catalysts: [...initial.draft.catalysts, { ...initial.draft.catalysts[0], id: 'risk-1' }]
    }));
    expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_risks_and_catalysts').ok).toBe(false);
  });

  it('requires an explicit score choice and never fills missing factors', () => {
    const initial = atStep('review_mbs_score');
    for (const scoreDraft of [{ kind: 'pending' }, { kind: 'score', input: { moat: 7 } }] as const) {
      const workflow = value(updateLivingThesisReviewScoreDraft(initial, scoreDraft));
      expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_mbs_score').ok).toBe(false);
      expect(workflow.scoreDraft).toEqual(scoreDraft);
    }
  });

  it.each([-1, 11, Number.NaN, Number.POSITIVE_INFINITY])('rejects an invalid MBS factor %s', (moat) => {
    const workflow = value(updateLivingThesisReviewScoreDraft(atStep('review_mbs_score'), { kind: 'score', input: { ...completeScore, moat } }));
    expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_mbs_score').ok).toBe(false);
  });

  it('accepts complete zero-valued factors and keeps score input separate from current state', () => {
    let workflow = value(updateLivingThesisReviewScoreDraft(atStep('review_mbs_score'), {
      kind: 'score', input: { businessQuality: 0, moat: 0, management: 0, balanceSheet: 0, growth: 0, valuation: 0, risk: 0 }
    }));
    for (const step of ['review_mbs_score', 'review_assessment', 'preview_changes'] as const) {
      workflow = value(completeLivingThesisReviewWorkflowStep(workflow, step));
    }
    const completed = value(completeLivingThesisReviewWorkflow(workflow, thesis()));
    expect(completed.scoreDraft.kind).toBe('score');
    expect(completed.baseline).not.toHaveProperty('mbs');
    expect(completed.draft).not.toHaveProperty('score');
  });

  it('validates review scheduling and the approved lifecycle vocabulary', () => {
    const initial = atStep('review_assessment');
    for (const change of [{ nextReviewAt: '2026-02-30' }, { reviewCadenceDays: 0 }, { lifecycle: 'watch' as LivingThesis['lifecycle'] }]) {
      const workflow = value(updateLivingThesisReviewSection(initial, 'review_assessment', { ...initial.draft, ...change }));
      expect(completeLivingThesisReviewWorkflowStep(workflow, 'review_assessment').ok).toBe(false);
    }
  });

  it('can propose archival while leaving archival timestamps and saved versions to persistence', () => {
    let workflow = atStep('review_assessment');
    workflow = value(updateLivingThesisReviewSection(workflow, 'review_assessment', { ...workflow.draft, lifecycle: 'archived', nextReviewAt: undefined }));
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, 'review_assessment'));
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, 'preview_changes'));
    const completed = value(completeLivingThesisReviewWorkflow(workflow, thesis()));
    expect(completed.draft.lifecycle).toBe('archived');
    expect(completed.draft).not.toHaveProperty('archivedAt');
    expect(completed.baseline.version).toBe(4);
  });

  it('returns an ordered before/after preview and clears optional fields deliberately', () => {
    const initial = atStep('review_thesis_summary', thesis({ theme: 'Old theme' }));
    const workflow = value(updateLivingThesisReviewSection(initial, 'review_thesis_summary', {
      entityName: initial.draft.entityName, title: 'Revised title', summary: initial.draft.summary
    }));
    const preview = getLivingThesisReviewPreview(workflow);
    expect(preview.changedFields).toEqual(['title', 'theme']);
    expect(preview.before.theme).toBe('Old theme');
    expect(preview.after.theme).toBeUndefined();
    expect(preview.after.risks[0]).not.toBe(workflow.draft.risks[0]);
    expect(preview.before.risks[0]).not.toBe(workflow.baseline.risks[0]);
  });

  it.each([
    ['review_thesis_summary', { title: 'Revised title' }, 1],
    ['review_risks_and_catalysts', { risks: [{ ...thesis().risks[0], status: 'resolved' }] }, 2],
    ['review_assessment', { conviction: 'high' }, 4]
  ] as const)('reopens %s and invalidates subsequent confirmations after an edit', (section, change, count) => {
    const initial = freeze(atStep('complete_review'));
    const workflow = value(updateLivingThesisReviewSection(initial, section, { ...initial.draft, ...change }));
    expect(workflow.activeStep).toBe(section);
    expect(workflow.completedSteps).toEqual(initial.completedSteps.slice(0, count));
    expect(completeLivingThesisReviewWorkflow(workflow, thesis()).ok).toBe(false);
  });

  it('invalidates the appropriate confirmations for changes to reason, notes, and score', () => {
    const workflow = freeze(atStep('complete_review'));
    expect(value(updateLivingThesisReviewReason(workflow, 'Different evidence')).activeStep).toBe('start_review');
    expect(value(updateLivingThesisReviewNotes(workflow, 'A new conclusion')).activeStep).toBe('preview_changes');
    const scoreEdit = value(updateLivingThesisReviewScoreDraft(workflow, { kind: 'score', input: completeScore }));
    expect(scoreEdit.activeStep).toBe('review_mbs_score');
    expect(scoreEdit.completedSteps).toHaveLength(3);
    expect(value(updateLivingThesisReviewReason(workflow, ' Scheduled evidence review ')).activeStep).toBe('complete_review');
    expect(value(updateLivingThesisReviewSection(workflow, 'review_thesis_summary', workflow.draft)).activeStep).toBe('complete_review');
  });

  it('allows returning to an earlier step and requires reconfirmation afterward', () => {
    const workflow = value(returnToLivingThesisReviewStep(atStep('complete_review'), 'review_assessment'));
    expect(workflow.completedSteps).toHaveLength(4);
    expect(completeLivingThesisReviewWorkflow(workflow, thesis()).ok).toBe(false);
  });

  it('checks thesis identity and version at completion, including when tickers match', () => {
    const source = thesis({ ticker: 'EXAMPLE' });
    const workflow = atStep('complete_review', source);
    expect(completeLivingThesisReviewWorkflow(workflow, { ...source, version: 5 }).ok).toBe(false);
    const other = thesis({ id: 'another-thesis', ticker: 'EXAMPLE', risks: [], catalysts: [] });
    expect(validateLivingThesisReviewCompletion(workflow, other).valid).toBe(false);
    expect(completeLivingThesisReviewWorkflow(workflow, other).ok).toBe(false);
    expect(workflow.status).toBe('in_progress');
  });

  it('revalidates review content even if a caller retains confirmations on an invalid draft', () => {
    const ready = atStep('complete_review');
    const invalid = [
      { ...ready, reviewReason: ' ' },
      { ...ready, draft: { ...ready.draft, summary: '' } },
      { ...ready, draft: { ...ready.draft, risks: [] } },
      { ...ready, scoreDraft: { kind: 'score' as const, input: { moat: 1 } } }
    ];
    for (const workflow of invalid) {
      expect(completeLivingThesisReviewWorkflow(workflow, thesis()).ok).toBe(false);
    }
  });

  it('copies caller-owned child records and score input instead of retaining aliases', () => {
    const child = { ...thesis().risks[0] };
    const source = thesis({ risks: [child] });
    const started = value(startLivingThesisReviewWorkflow(source));
    child.title = 'Changed externally';
    expect(started.baseline.risks[0].title).not.toBe(child.title);
    expect(started.draft.risks[0].title).not.toBe(child.title);
    const input = { ...completeScore };
    const scored = value(updateLivingThesisReviewScoreDraft(started, { kind: 'score', input }));
    input.moat = 99;
    expect(scored.scoreDraft).toEqual({ kind: 'score', input: completeScore });
  });

  it('limits section updates to their editable fields and ignores supplied parent metadata', () => {
    const initial = atStep('review_thesis_summary');
    const fields = { ...initial.draft, id: 'another-id', version: 99, updatedAt: 'invalid', conviction: 'high' as const, title: 'Updated' };
    const workflow = value(updateLivingThesisReviewSection(initial, 'review_thesis_summary', fields));
    expect(workflow.baseline.id).toBe('thesis-1');
    expect(workflow.baseline.version).toBe(4);
    expect(workflow.draft.conviction).toBe('medium');
    expect(workflow.draft).not.toHaveProperty('id');
    expect(workflow.draft).not.toHaveProperty('version');
  });

  it.each(['completed', 'abandoned'] as const)('makes a %s workflow terminal for all editing and transition helpers', (status) => {
    const ready = atStep('complete_review');
    const terminal = freeze(value(status === 'completed'
      ? completeLivingThesisReviewWorkflow(ready, thesis())
      : abandonLivingThesisReviewWorkflow(ready)));
    const outcomes = [
      updateLivingThesisReviewReason(terminal, 'Another reason'),
      updateLivingThesisReviewNotes(terminal, 'Another note'),
      updateLivingThesisReviewScoreDraft(terminal, { kind: 'score', input: completeScore }),
      updateLivingThesisReviewSection(terminal, 'review_thesis_summary', terminal.draft),
      returnToLivingThesisReviewStep(terminal, 'start_review'),
      completeLivingThesisReviewWorkflowStep(terminal, 'complete_review'),
      completeLivingThesisReviewWorkflow(terminal, thesis()),
      abandonLivingThesisReviewWorkflow(terminal)
    ];
    expect(outcomes.every((result) => !result.ok)).toBe(true);
    expect(terminal.status).toBe(status);
  });
});
