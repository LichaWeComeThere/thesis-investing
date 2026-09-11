import { describe, expect, it } from 'vitest';
import {
  buildLivingThesisReviewAfter, completeLivingThesisReviewWorkflow, completeLivingThesisReviewWorkflowStep,
  getLivingThesisRevisionChildReferences, parseLivingThesisRevision, startLivingThesisReviewWorkflow,
  updateLivingThesisReviewReason, updateLivingThesisReviewScoreDraft, validateLivingThesisRevision,
  type LivingThesis, type LivingThesisReviewResult, type LivingThesisReviewWorkflow, type LivingThesisRevision
} from './index';

const createdAt = '2026-09-01T12:00:00.000Z';
const priorUpdate = '2026-09-04T12:00:00.000Z';
const completedAt = '2026-09-11T12:00:00.000Z';
const later = '2026-09-12T12:00:00.000Z';

function value<T>(result: LivingThesisReviewResult<T>): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

function baseline(): LivingThesis {
  return {
    id: 'thesis', version: 4, entityName: 'Example', title: 'Research', summary: 'Evidence',
    lifecycle: 'active', conviction: 'medium', riskLevel: 'medium', createdAt, updatedAt: priorUpdate,
    risks: [{ id: 'risk', thesisId: 'thesis', title: 'Demand', status: 'open', severity: 'high', createdAt, updatedAt: priorUpdate }],
    catalysts: [{ id: 'catalyst', thesisId: 'thesis', title: 'Renewals', status: 'open', createdAt, updatedAt: priorUpdate }]
  };
}

function ready(patch: Partial<LivingThesisReviewWorkflow['draft']> = {}): LivingThesisReviewWorkflow {
  let workflow = value(startLivingThesisReviewWorkflow(baseline()));
  workflow = { ...workflow, draft: { ...workflow.draft, ...patch } };
  workflow = value(updateLivingThesisReviewReason(workflow, 'Quarterly review'));
  workflow = value(updateLivingThesisReviewScoreDraft(workflow, { kind: 'skip' }));
  while (workflow.activeStep !== 'complete_review') {
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep));
  }
  return workflow;
}

function revision(): LivingThesisRevision {
  const workflow = ready({ summary: 'Updated evidence' });
  return { id: 'revision', thesisId: 'thesis', reviewSessionId: 'review', schemaVersion: 1,
    createdAt: completedAt, before: workflow.baseline, after: value(buildLivingThesisReviewAfter(workflow, completedAt)) };
}

describe('review completion snapshots', () => {
  it('builds detached snapshots with one version increment and timestamps only for material child changes', () => {
    const original = baseline();
    const workflow = ready({
      summary: '  Updated evidence  ',
      risks: [{ ...original.risks[0], title: '  Demand  ' }],
      catalysts: [{ ...original.catalysts[0], status: 'observed' }, {
        id: 'new-catalyst', thesisId: 'thesis', title: '  Product launch  ', status: 'open',
        createdAt: priorUpdate, updatedAt: priorUpdate
      }]
    });
    const frozenCopy = JSON.stringify(workflow);
    const after = value(buildLivingThesisReviewAfter(workflow, completedAt));
    expect(after).toMatchObject({ id: 'thesis', version: 5, summary: 'Updated evidence', createdAt, updatedAt: completedAt });
    expect(after.risks[0]).toEqual(original.risks[0]);
    expect(after.catalysts[0]).toMatchObject({ createdAt, updatedAt: completedAt, status: 'observed' });
    expect(after.catalysts[1]).toMatchObject({ createdAt: completedAt, updatedAt: completedAt, title: 'Product launch' });
    expect(after.risks[0]).not.toBe(workflow.draft.risks[0]);
    expect(JSON.stringify(workflow)).toBe(frozenCopy);
    expect(value(buildLivingThesisReviewAfter(value(completeLivingThesisReviewWorkflow(workflow, workflow.baseline)), completedAt))).toEqual(after);
    expect(parseLivingThesisRevision({ ...revision(), before: workflow.baseline, after }).ok).toBe(true);
  });

  it('records a review even when thesis content stays the same', () => {
    const workflow = ready();
    const after = value(buildLivingThesisReviewAfter(workflow, completedAt));
    expect(after.version).toBe(workflow.baseline.version + 1);
    expect(after.updatedAt).toBe(completedAt);
    expect(after.risks).toEqual(workflow.baseline.risks);
    expect(after.catalysts).toEqual(workflow.baseline.catalysts);
  });

  it('sets archive time only for a review that archives the thesis', () => {
    const after = value(buildLivingThesisReviewAfter(ready({ lifecycle: 'archived' }), completedAt));
    expect(after.archivedAt).toBe(completedAt);
    expect(parseLivingThesisRevision({ ...revision(), after }).ok).toBe(true);
    expect(value(buildLivingThesisReviewAfter(ready(), completedAt)).archivedAt).toBeUndefined();
  });

  it('refuses unconfirmed, abandoned, invalid, or future-dated review changes', () => {
    const valid = ready();
    const inputs = [
      value(startLivingThesisReviewWorkflow(baseline())), { ...valid, status: 'abandoned' as const },
      { ...valid, reviewReason: '' }, { ...valid, draft: { ...valid.draft, risks: [] } },
      { ...valid, draft: { ...valid.draft, catalysts: [{ ...valid.draft.catalysts[0], createdAt: later }] } },
      { ...valid, draft: { ...valid.draft, risks: [...valid.draft.risks, {
        ...valid.draft.risks[0], id: 'new-risk', createdAt: later, updatedAt: later
      }] } },
      { ...valid, baseline: { ...valid.baseline, version: Number.MAX_SAFE_INTEGER } }
    ];
    for (const workflow of inputs) expect(buildLivingThesisReviewAfter(workflow, completedAt).ok).toBe(false);
    expect(buildLivingThesisReviewAfter(valid, '2026-09-11').ok).toBe(false);
    expect(buildLivingThesisReviewAfter(valid, createdAt).ok).toBe(false);
  });

  it('parses a detached history record and retains child references from both snapshots', () => {
    const input = revision();
    const parsed = value(parseLivingThesisRevision(input));
    expect(parsed).toEqual(JSON.parse(JSON.stringify(input)));
    expect(parsed.before).not.toBe(input.before);
    expect(parsed.after.risks[0]).not.toBe(input.after.risks[0]);
    expect(validateLivingThesisRevision(input)).toEqual({ valid: true, errors: [] });
    expect(getLivingThesisRevisionChildReferences(parsed)).toEqual([
      { id: 'risk', thesisId: 'thesis', kind: 'risk' }, { id: 'catalyst', thesisId: 'thesis', kind: 'catalyst' },
      { id: 'risk', thesisId: 'thesis', kind: 'risk' }, { id: 'catalyst', thesisId: 'thesis', kind: 'catalyst' }
    ]);
  });

  it.each([
    ['null', null], ['array', []], ['missing before', { ...revision(), before: undefined }],
    ['missing after', { ...revision(), after: undefined }], ['null child', { ...revision(), after: { ...revision().after, risks: [null] } }],
    ['unknown revision fields', { ...revision(), extra: 'data must not be lost' }],
    ['unknown snapshot fields', { ...revision(), after: { ...revision().after, extra: true } }],
    ['unsupported schema', { ...revision(), schemaVersion: 2 }],
    ['blank IDs', { ...revision(), reviewSessionId: ' ' }],
    ['blank score reference', { ...revision(), scoreSnapshotId: '' }],
    ['invalid timestamp', { ...revision(), createdAt: '2026-09-11' }],
    ['invalid child type', { ...revision(), after: { ...revision().after, risks: [{ ...revision().after.risks[0], severity: 1 }] } }]
  ])('rejects malformed %s without throwing', (_label, input) => {
    expect(() => parseLivingThesisRevision(input)).not.toThrow();
    expect(parseLivingThesisRevision(input).ok).toBe(false);
  });

  it('rejects rewritten identities, skipped versions, removed children, and forged history times', () => {
    const input = revision();
    const cases = [
      { ...input, thesisId: 'other' },
      { ...input, after: { ...input.after, id: 'other' } },
      { ...input, after: { ...input.after, createdAt: priorUpdate } },
      { ...input, after: { ...input.after, version: 6 } },
      { ...input, after: { ...input.after, updatedAt: later } },
      { ...input, after: { ...input.after, summary: '' } },
      { ...input, after: { ...input.after, archivedAt: completedAt } },
      { ...input, after: { ...input.after, risks: [] } },
      { ...input, after: { ...input.after, risks: [{ ...input.after.risks[0], createdAt: priorUpdate }] } },
      { ...input, after: { ...input.after, risks: [{ ...input.after.risks[0], title: 'Changed' }] } },
      { ...input, after: { ...input.after, risks: [{ ...input.after.risks[0], updatedAt: completedAt }] } },
      { ...input, after: { ...input.after, risks: [...input.after.risks, { ...input.after.risks[0], id: 'new-risk' }] } },
      { ...input, after: { ...input.after, risks: [{ ...input.after.risks[0], thesisId: 'other' }] } },
      { ...input, after: { ...input.after, catalysts: [...input.after.catalysts, {
        id: 'risk', thesisId: 'thesis', title: 'Wrong kind', status: 'open', createdAt: completedAt, updatedAt: completedAt
      }] } }
    ];
    for (const candidate of cases) expect(parseLivingThesisRevision(candidate).ok).toBe(false);
  });
});
