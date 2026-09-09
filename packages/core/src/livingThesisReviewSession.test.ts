import { describe, expect, it } from 'vitest';
import {
  abandonLivingThesisReviewWorkflow, completeLivingThesisReviewWorkflowStep,
  parseLivingThesisReviewSession, startLivingThesisReviewWorkflow, updateLivingThesisReviewReason,
  type LivingThesis, type LivingThesisReviewResult, type LivingThesisReviewSession
} from './index';

const time = '2026-09-09T12:00:00.000Z';
function session(): LivingThesisReviewSession {
  const baseline: LivingThesis = {
    id: 'thesis', version: 1, entityName: 'Example', title: 'Research', summary: 'Evidence',
    lifecycle: 'active', conviction: 'medium', riskLevel: 'medium', createdAt: time, updatedAt: time,
    risks: [{ id: 'risk', thesisId: 'thesis', title: 'Demand', status: 'open', severity: 'high', createdAt: time, updatedAt: time }],
    catalysts: []
  };
  return { id: 'session', thesisId: 'thesis', schemaVersion: 1, version: 1,
    startedAt: time, updatedAt: time, workflow: value(startLivingThesisReviewWorkflow(baseline)) };
}
function value<T>(result: LivingThesisReviewResult<T>): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}
const patchWorkflow = (patch: Record<string, unknown>) => ({ ...session(), workflow: { ...session().workflow, ...patch } });

describe('durable review session validation', () => {
  it('preserves unfinished text, dates, cadence, and partial scores without normalizing edits', () => {
    const original = session();
    const input = { ...original, workflow: { ...original.workflow, notes: '  unfinished\nnotes  ',
      draft: { ...original.workflow.draft, risks: [...original.workflow.draft.risks],
        title: '', nextReviewAt: '2026-', reviewCadenceDays: -1 },
      scoreDraft: { kind: 'score' as const, input: { moat: 12, notes: 'still assessing' } } } };
    const parsed = value(parseLivingThesisReviewSession(input));
    expect(parsed).toEqual(JSON.parse(JSON.stringify(input)));
    input.workflow.draft.risks[0] = { ...input.workflow.draft.risks[0], title: 'Changed' };
    input.workflow.scoreDraft.input.moat = 3;
    expect(parsed.workflow.draft.risks[0].title).toBe('Demand');
    expect(parsed.workflow.scoreDraft).toMatchObject({ input: { moat: 12 } });
  });

  it.each([
    ['null root', null], ['array root', []], ['missing workflow', { ...session(), workflow: undefined }],
    ['null baseline', patchWorkflow({ baseline: null })], ['null draft', patchWorkflow({ draft: null })],
    ['null child', patchWorkflow({ draft: { ...session().workflow.draft, risks: [null] } })],
    ['missing steps', patchWorkflow({ completedSteps: undefined })], ['null score', patchWorkflow({ scoreDraft: null })],
    ['missing factors', patchWorkflow({ scoreDraft: { kind: 'score' } })],
    ...[NaN, Infinity, null].map<[string, unknown]>((moat) => [`invalid factor ${String(moat)}`, patchWorkflow({ scoreDraft: { kind: 'score', input: { moat } } })]),
    ['unknown schema', { ...session(), schemaVersion: 2 }], ['fractional version', { ...session(), version: 1.5 }],
    ['unsafe version', { ...session(), version: Number.MAX_SAFE_INTEGER + 1 }], ['wrong parent', { ...session(), thesisId: 'other' }],
    ['noncanonical time', { ...session(), updatedAt: '2026-09-09' }],
    ['time reversal', { ...session(), updatedAt: '2026-09-08T12:00:00.000Z' }],
    ['unsupported fields', { ...session(), ignoredResearch: 'must not lose me' }],
    ['completed workflow', patchWorkflow({ status: 'completed' })],
    ['invalid progress', patchWorkflow({ activeStep: 'review_mbs_score', completedSteps: [] })]
  ])('rejects %s without throwing', (_label, input) => {
    expect(() => parseLivingThesisReviewSession(input)).not.toThrow();
    expect(parseLivingThesisReviewSession(input).ok).toBe(false);
  });

  it('revalidates confirmed sections but permits the current section to remain incomplete', () => {
    const original = session();
    let workflow = value(updateLivingThesisReviewReason(original.workflow, 'Quarterly review'));
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, 'start_review'));
    expect(parseLivingThesisReviewSession({ ...original, workflow: { ...workflow, draft: { ...workflow.draft, title: '' } } }).ok).toBe(true);
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, 'review_thesis_summary'));
    expect(parseLivingThesisReviewSession({ ...original, workflow: { ...workflow, draft: { ...workflow.draft, title: '' } } }).ok).toBe(false);
    expect(parseLivingThesisReviewSession({ ...original, workflow: { ...workflow, reviewReason: '' } }).ok).toBe(false);
  });

  it('requires stable child ownership and kinds throughout the review', () => {
    const original = session();
    const risk = original.workflow.draft.risks[0];
    for (const draft of [
      { ...original.workflow.draft, risks: [{ ...risk, thesisId: 'other' }] },
      { ...original.workflow.draft, risks: [risk, risk] },
      { ...original.workflow.draft, risks: [], catalysts: [{ id: risk.id, thesisId: risk.thesisId, title: '', status: 'open', createdAt: time, updatedAt: time }] }
    ]) expect(parseLivingThesisReviewSession({ ...original, workflow: { ...original.workflow, draft } }).ok).toBe(false);
  });

  it('preserves abandoned drafts with a matching terminal timestamp', () => {
    const original = session();
    const workflow = value(abandonLivingThesisReviewWorkflow(original.workflow));
    expect(parseLivingThesisReviewSession({ ...original, workflow }).ok).toBe(false);
    expect(parseLivingThesisReviewSession({ ...original, workflow, abandonedAt: time }).ok).toBe(true);
    expect(parseLivingThesisReviewSession({ ...original, abandonedAt: time }).ok).toBe(false);
  });
});
