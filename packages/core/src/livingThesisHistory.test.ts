import { describe, expect, it } from 'vitest';
import {
  buildLivingThesisHistory,
  buildLivingThesisReviewAfter,
  calculateMbsScore,
  completeLivingThesisReviewWorkflow,
  completeLivingThesisReviewWorkflowStep,
  LIVING_THESIS_REVIEW_WORKFLOW_STEPS,
  startLivingThesisReviewWorkflow,
  updateLivingThesisReviewReason,
  updateLivingThesisReviewScoreDraft,
  type LivingThesis,
  type LivingThesisDecision,
  type LivingThesisHistoryCompletedReview,
  type LivingThesisHistoryInput,
  type LivingThesisReviewDraft,
  type MbsScoreSnapshot
} from './index';

const createdAt = '2026-09-01T09:00:00.000Z';
const firstAt = '2026-09-02T10:00:00.000Z';
const secondAt = '2026-09-03T10:00:00.000Z';
const thirdAt = '2026-09-04T10:00:00.000Z';
const fourthAt = '2026-09-05T10:00:00.000Z';

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

function thesis(id = 'thesis'): LivingThesis {
  return { id, version: 1, entityName: 'Example Research', title: 'Recurring revenue',
    summary: 'Retention supports the thesis.', lifecycle: 'active', conviction: 'medium',
    riskLevel: 'medium', createdAt, updatedAt: createdAt,
    risks: [{ id: `risk-${id}`, thesisId: id, title: 'Concentration', detail: 'One large customer.',
      status: 'open', severity: 'high', createdAt, updatedAt: createdAt }],
    catalysts: [{ id: `catalyst-${id}`, thesisId: id, title: 'Renewal report', status: 'open', createdAt, updatedAt: createdAt }] };
}

function review(before: LivingThesis, id: string, completedAt: string,
  patch: Partial<LivingThesisReviewDraft> = {}, rating?: number): LivingThesisHistoryCompletedReview {
  let workflow = value(startLivingThesisReviewWorkflow(before));
  workflow = value(updateLivingThesisReviewReason(workflow, `Evidence check ${id}`));
  workflow = { ...workflow, draft: { ...workflow.draft, ...patch } };
  workflow = value(updateLivingThesisReviewScoreDraft(workflow, rating === undefined ? { kind: 'skip' } : {
    kind: 'score', input: { businessQuality: rating, moat: rating, management: rating,
      balanceSheet: rating, growth: rating, valuation: rating, risk: rating }
  }));
  for (const step of LIVING_THESIS_REVIEW_WORKFLOW_STEPS.slice(0, -1)) {
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, step.id));
  }
  workflow = value(completeLivingThesisReviewWorkflow(workflow, before));
  const after = value(buildLivingThesisReviewAfter(workflow, completedAt));
  const scoreId = rating === undefined ? undefined : `score-${id}`;
  let scoreSnapshot: MbsScoreSnapshot | undefined;
  if (workflow.scoreDraft.kind === 'score') {
    const calculated = calculateMbsScore(workflow.scoreDraft.input);
    if (calculated.rating === 'incomplete') throw new Error('Incomplete score fixture.');
    scoreSnapshot = { id: scoreId!, thesisId: before.id, companyName: after.entityName,
      createdAt: completedAt, input: workflow.scoreDraft.input, score: calculated.score,
      maxScore: calculated.maxScore, percentage: calculated.percentage, rating: calculated.rating,
      completedCriteria: calculated.completedCriteria };
  }
  return {
    session: { id, thesisId: before.id, schemaVersion: 2, version: 2, startedAt: completedAt,
      updatedAt: completedAt, completedAt, revisionId: `revision-${id}`, scoreSnapshotId: scoreId, workflow },
    revision: { id: `revision-${id}`, thesisId: before.id, reviewSessionId: id, schemaVersion: 1,
      createdAt: completedAt, before, after, scoreSnapshotId: scoreId },
    ...(scoreSnapshot ? { scoreSnapshot } : {})
  };
}

function decision(id: string, time: string, reviewSessionId?: string, thesisId = 'thesis'): LivingThesisDecision {
  return { id, thesisId, schemaVersion: 1, kind: reviewSessionId ? 'review_conclusion' : 'research_note',
    title: `Decision ${id}`, rationale: 'Keep tracking the evidence.', createdAt: time,
    ...(reviewSessionId ? { reviewSessionId } : {}) };
}

describe('Living Thesis History projection', () => {
  it('shows only a creation date when there is no saved history, without inventing original content from current edits', () => {
    const current = { ...thesis(), version: 8, title: 'A later direct edit', updatedAt: fourthAt };
    expect(buildLivingThesisHistory({ thesis: current, completedReviews: [], decisions: [] })).toEqual({
      thesisId: current.id, thesis: current, scores: [], items: [{ id: `created:${current.id}`, kind: 'created', occurredAt: createdAt }]
    });
  });

  it('keeps skipped reviews in history without resetting score comparisons and retains zero and negative deltas', () => {
    const first = review(thesis(), 'first', firstAt, {}, 6);
    const skipped = review(first.revision.after, 'skip', secondAt);
    const lower = review(skipped.revision.after, 'lower', thirdAt, {}, 4);
    const same = review(lower.revision.after, 'same', fourthAt, {}, 4);
    const note = decision('note', secondAt);
    const linked = decision('linked', fourthAt, same.session.id);
    const history = buildLivingThesisHistory({ thesis: same.revision.after,
      completedReviews: [skipped, same, first, lower], decisions: [note, linked] });
    expect(history.scores.map(({ snapshot, previousSnapshotId, change }) => [snapshot.id, snapshot.score, previousSnapshotId, change]))
      .toEqual([['score-same', 40, 'score-lower', 0], ['score-lower', 40, 'score-first', -20], ['score-first', 60, undefined, undefined]]);
    expect(history.items.map(({ kind, occurredAt }) => [kind, occurredAt])).toEqual([
      ['decision', fourthAt], ['review', fourthAt], ['score', fourthAt],
      ['review', thirdAt], ['score', thirdAt], ['decision', secondAt], ['review', secondAt],
      ['review', firstAt], ['score', firstAt], ['created', createdAt]
    ]);
    const linkedItem = history.items.find((item) => item.kind === 'decision' && item.decision.id === linked.id);
    expect(linkedItem).toMatchObject({ kind: 'decision', decision: linked, reviewReason: 'Evidence check same' });
    expect(history.items.filter((item) => item.kind === 'review').every((item) => item.changes.length === 0)).toBe(true);
  });

  it('orders exact-time score ties by snapshot ID, independently of input order, and counts duplicated source records once', () => {
    const first = review(thesis(), 'z', firstAt, {}, 4);
    const second = review(first.revision.after, 'a', firstAt, {}, 6);
    const input: LivingThesisHistoryInput = { thesis: second.revision.after,
      completedReviews: [first, second, first], decisions: [decision('z', firstAt), decision('a', firstAt)] };
    const history = buildLivingThesisHistory(input);
    expect(history.scores.map(({ snapshot, change }) => [snapshot.id, change])).toEqual([['score-a', 20], ['score-z', undefined]]);
    expect(history.items.map(({ id }) => id)).toEqual([
      'decision:a', 'decision:z', 'review:a', 'review:z', 'score:score-a', 'score:score-z', 'created:thesis'
    ]);
    expect(buildLivingThesisHistory({ ...input, completedReviews: [...input.completedReviews].reverse(),
      decisions: [...input.decisions].reverse() })).toEqual(history);
  });

  it('compares material scalar and child changes by stable identity while omitting timestamps and versions', () => {
    const before = thesis();
    const pair = review(before, 'changed', firstAt, {
      entityName: 'Renamed Research', ticker: 'EXM', title: 'Updated thesis', theme: 'Subscriptions',
      summary: 'New evidence.', bullCase: 'Retention improves.', bearCase: 'Pricing weakens.',
      lifecycle: 'monitoring', conviction: 'high', riskLevel: 'low', reviewCadenceDays: 30, nextReviewAt: '2026-10-01',
      risks: [{ ...before.risks[0], title: 'Customer concentration', detail: 'Customer base diversified.', severity: 'medium', status: 'resolved' },
        { id: 'new-risk', thesisId: before.id, title: 'Competition', status: 'open', severity: 'high', createdAt, updatedAt: createdAt }],
      catalysts: [{ ...before.catalysts[0], status: 'observed' }]
    });
    const item = buildLivingThesisHistory({ thesis: pair.revision.after, completedReviews: [pair], decisions: [] })
      .items.find((entry) => entry.kind === 'review');
    expect(item?.kind).toBe('review');
    if (item?.kind !== 'review') throw new Error('Missing review.');
    expect(item.changes.slice(0, 12)).toEqual([
      { label: 'Company or entity', before: before.entityName, after: 'Renamed Research' },
      { label: 'Ticker', before: null, after: 'EXM' },
      { label: 'Thesis title', before: before.title, after: 'Updated thesis' },
      { label: 'Theme', before: null, after: 'Subscriptions' },
      { label: 'Summary', before: before.summary, after: 'New evidence.' },
      { label: 'Bull case', before: null, after: 'Retention improves.' },
      { label: 'Bear case', before: null, after: 'Pricing weakens.' },
      { label: 'Status', before: 'active', after: 'monitoring' },
      { label: 'Conviction', before: 'medium', after: 'high' },
      { label: 'Risk level', before: 'medium', after: 'low' },
      { label: 'Review cadence (days)', before: null, after: '30' },
      { label: 'Next review date', before: null, after: '2026-10-01' }
    ]);
    expect(item.changes.slice(12)).toEqual([
      { label: 'Risk “Competition”', before: null, after: 'Competition\nStatus: open\nSeverity: high' },
      { label: 'Risk “Customer concentration” · Title', before: 'Concentration', after: 'Customer concentration' },
      { label: 'Risk “Customer concentration” · Details', before: 'One large customer.', after: 'Customer base diversified.' },
      { label: 'Risk “Customer concentration” · Status', before: 'open', after: 'resolved' },
      { label: 'Risk “Customer concentration” · Severity', before: 'high', after: 'medium' },
      { label: 'Catalyst “Renewal report” · Status', before: 'open', after: 'observed' }
    ]);
  });

  it('treats prose trimming and reordered children as a no-op review while detecting removed optional content', () => {
    const before: LivingThesis = { ...thesis(), theme: 'Subscriptions', risks: [...thesis().risks,
      { ...thesis().risks[0], id: 'second-risk', title: 'Competition' }] };
    const unchanged = review(before, 'no-op', firstAt, {
      summary: `  ${before.summary}  `, risks: [...before.risks].reverse()
    });
    const removed = review(unchanged.revision.after, 'removed', secondAt, { theme: undefined });
    const history = buildLivingThesisHistory({ thesis: removed.revision.after, completedReviews: [removed, unchanged], decisions: [] });
    const entries = history.items.filter((item) => item.kind === 'review');
    expect(entries[0].changes).toEqual([{ label: 'Theme', before: 'Subscriptions', after: null }]);
    expect(entries[1].changes).toEqual([]);
  });

  it('excludes unfinished, foreign, mismatched, and noncanonical review pairs instead of inventing history', () => {
    const valid = review(thesis(), 'valid', firstAt, {}, 6);
    const foreign = review(thesis('other'), 'other', firstAt, {}, 9);
    const invalid: LivingThesisHistoryCompletedReview[] = [
      foreign,
      { ...valid, session: { ...valid.session, workflow: { ...valid.session.workflow, status: 'in_progress' } } },
      { ...valid, session: { ...valid.session, workflow: { ...valid.session.workflow, status: 'abandoned' } } },
      { ...valid, session: { ...valid.session, revisionId: 'different-revision' } },
      { ...valid, revision: { ...valid.revision, reviewSessionId: 'different-session' } },
      { ...valid, revision: { ...valid.revision, before: { ...valid.revision.before, id: 'other' } } },
      { ...valid, revision: { ...valid.revision, after: { ...valid.revision.after, id: 'other' } } },
      { ...valid, session: { ...valid.session, completedAt: secondAt } },
      { ...valid, session: { ...valid.session, scoreSnapshotId: 'another-score' } },
      { ...valid, revision: { ...valid.revision, createdAt: '2026-09-02' } }
    ];
    const history = buildLivingThesisHistory({ thesis: valid.revision.after, completedReviews: invalid, decisions: [] });
    expect(history.items.map(({ kind }) => kind)).toEqual(['created']);
    expect(history.scores).toEqual([]);
  });

  it('admits scores only through all formal review links, never through ticker, company, or thesis ID alone', () => {
    const valid = review(thesis(), 'valid', firstAt, {}, 6);
    const snapshot = valid.scoreSnapshot!;
    const candidates: (MbsScoreSnapshot | undefined)[] = [undefined,
      { ...snapshot, id: 'legacy-score' }, { ...snapshot, thesisId: 'other' },
      { ...snapshot, thesisId: undefined }, { ...snapshot, createdAt: '2026-09-02' },
      { ...snapshot, createdAt: secondAt }, { ...snapshot, completedCriteria: 1 }
    ];
    for (const scoreSnapshot of candidates) {
      const history = buildLivingThesisHistory({ thesis: valid.revision.after,
        completedReviews: [{ ...valid, scoreSnapshot }], decisions: [] });
      expect(history.scores).toEqual([]);
      expect(history.items.some((item) => item.kind === 'score')).toBe(false);
    }
    const skipped = review(thesis(), 'skipped', firstAt);
    expect(buildLivingThesisHistory({ thesis: skipped.revision.after,
      completedReviews: [{ ...skipped, scoreSnapshot: snapshot }], decisions: [] }).scores).toEqual([]);
  });

  it('includes only decisions belonging to this thesis and valid same-thesis completed review links', () => {
    const pair = review(thesis(), 'review', secondAt);
    const plain = decision('plain', firstAt);
    const linked = decision('linked', secondAt, pair.session.id);
    const history = buildLivingThesisHistory({ thesis: pair.revision.after, completedReviews: [pair], decisions: [
      plain, linked, decision('foreign', thirdAt, undefined, 'other'), decision('missing-link', thirdAt, 'missing'),
      decision('premature-link', firstAt, pair.session.id), decision('premature-note', '2026-08-01T00:00:00.000Z'),
      { ...decision('malformed', fourthAt), createdAt: '2026-09-05' }
    ] });
    expect(history.items.filter((item) => item.kind === 'decision').map((item) => item.decision)).toEqual([linked, plain]);
  });

  it('shows current archival only when that exact transition is not already represented by a review', () => {
    const original = thesis();
    const archived = review(original, 'archive', firstAt, { lifecycle: 'archived' });
    const fromReview = buildLivingThesisHistory({ thesis: archived.revision.after, completedReviews: [archived], decisions: [] });
    expect(fromReview.items.filter((item) => item.kind === 'archived')).toEqual([]);
    expect(fromReview.items.find((item) => item.kind === 'review')).toMatchObject({
      changes: [{ label: 'Status', before: 'active', after: 'archived' }]
    });
    const directArchive = { ...original, lifecycle: 'archived' as const, archivedAt: secondAt, updatedAt: secondAt, version: 2 };
    expect(buildLivingThesisHistory({ thesis: directArchive, completedReviews: [], decisions: [] }).items).toEqual([
      { id: `archived:thesis:${secondAt}`, kind: 'archived', occurredAt: secondAt },
      { id: 'created:thesis', kind: 'created', occurredAt: createdAt }
    ]);
    // A later direct re-archive is distinct, while unarchiving cannot reconstruct missing cycles.
    const laterArchive = { ...archived.revision.after, version: 4, archivedAt: thirdAt, updatedAt: thirdAt };
    expect(buildLivingThesisHistory({ thesis: laterArchive, completedReviews: [archived], decisions: [] }).items[0].kind).toBe('archived');
    const unarchived = { ...laterArchive, lifecycle: 'active' as const, archivedAt: undefined };
    const afterUnarchive = buildLivingThesisHistory({ thesis: unarchived, completedReviews: [archived], decisions: [] });
    expect(afterUnarchive.items.filter((item) => item.kind === 'archived')).toEqual([]);
    expect(afterUnarchive.items.filter((item) => item.kind === 'review')).toHaveLength(1);
  });

  it('does not mutate inputs and detaches nested source records returned to consumers', () => {
    const pair = review(thesis(), 'review', firstAt, { summary: 'New evidence.' }, 7);
    const input: LivingThesisHistoryInput = { thesis: pair.revision.after, completedReviews: [pair],
      decisions: [decision('decision', secondAt, pair.session.id)] };
    const before = JSON.stringify(input);
    deepFreeze(input);
    const history = buildLivingThesisHistory(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(history.thesis).toEqual(input.thesis);
    expect(history.thesis).not.toBe(input.thesis);
    expect(history.thesis.risks[0]).not.toBe(input.thesis.risks[0]);
    expect(history.thesis.id).toBe(history.thesisId);
    const reviewItem = history.items.find((item) => item.kind === 'review');
    expect(reviewItem?.kind).toBe('review');
    if (reviewItem?.kind !== 'review') throw new Error('Missing review.');
    expect(reviewItem.session).not.toBe(pair.session);
    expect(reviewItem.session.workflow.baseline.risks[0]).not.toBe(pair.session.workflow.baseline.risks[0]);
    expect(reviewItem.revision.after).not.toBe(pair.revision.after);
    expect(history.scores[0].snapshot.input).not.toBe(pair.scoreSnapshot!.input);
    expect(history.items.find((item) => item.kind === 'decision')).toMatchObject({ decision: input.decisions[0] });
  });
});

function deepFreeze(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
}
