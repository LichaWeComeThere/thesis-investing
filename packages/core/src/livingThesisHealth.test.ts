import { describe, expect, it } from 'vitest';
import {
  buildLivingThesisHistory, buildLivingThesisReviewAfter, calculateMbsScore,
  completeLivingThesisReviewWorkflow, completeLivingThesisReviewWorkflowStep,
  evaluateLivingThesisHealth, LIVING_THESIS_HEALTH_ALGORITHM_VERSION, LIVING_THESIS_REVIEW_WORKFLOW_STEPS,
  startLivingThesisReviewWorkflow, updateLivingThesisReviewReason, updateLivingThesisReviewScoreDraft,
  type LivingThesis, type LivingThesisHealthInput, type LivingThesisHistory,
  type LivingThesisHistoryCompletedReview, type LivingThesisRisk
} from './index';

const createdAt = '2026-09-01T09:00:00.000Z';
const firstAt = '2026-09-10T10:00:00.000Z';
const secondAt = '2026-09-15T10:00:00.000Z';
const thirdAt = '2026-09-18T10:00:00.000Z';
const referenceTime = '2026-09-20T12:00:00.000Z';
const today = '2026-09-20';

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

function thesis(): LivingThesis {
  return { id: 'thesis', version: 1, entityName: 'Example Research', title: 'Recurring revenue',
    summary: 'Retention supports the thesis.', lifecycle: 'active', conviction: 'medium', riskLevel: 'medium',
    createdAt, updatedAt: createdAt, risks: [], catalysts: [] };
}

function risk(id: string, severity: LivingThesisRisk['severity'], status: LivingThesisRisk['status'] = 'open'): LivingThesisRisk {
  return { id, thesisId: 'thesis', title: `Risk ${id}`, severity, status, createdAt, updatedAt: createdAt };
}

function review(before: LivingThesis, id: string, time: string, rating?: number): LivingThesisHistoryCompletedReview {
  let workflow = value(startLivingThesisReviewWorkflow(before));
  workflow = value(updateLivingThesisReviewReason(workflow, `Review ${id}`));
  workflow = value(updateLivingThesisReviewScoreDraft(workflow, rating === undefined ? { kind: 'skip' } : {
    kind: 'score', input: { businessQuality: rating, moat: rating, management: rating,
      balanceSheet: rating, growth: rating, valuation: rating, risk: rating }
  }));
  for (const step of LIVING_THESIS_REVIEW_WORKFLOW_STEPS.slice(0, -1)) {
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, step.id));
  }
  workflow = value(completeLivingThesisReviewWorkflow(workflow, before));
  const after = value(buildLivingThesisReviewAfter(workflow, time));
  const scoreSnapshotId = rating === undefined ? undefined : `score-${id}`;
  const pair: LivingThesisHistoryCompletedReview = {
    session: { id, thesisId: before.id, schemaVersion: 2, version: 2, startedAt: time, updatedAt: time,
      completedAt: time, revisionId: `revision-${id}`, scoreSnapshotId, workflow },
    revision: { id: `revision-${id}`, thesisId: before.id, reviewSessionId: id, schemaVersion: 1,
      createdAt: time, before, after, scoreSnapshotId }
  };
  if (workflow.scoreDraft.kind !== 'score') return pair;
  const score = calculateMbsScore(workflow.scoreDraft.input);
  if (score.rating === 'incomplete') throw new Error('Incomplete score fixture.');
  return { ...pair, scoreSnapshot: { id: scoreSnapshotId!, thesisId: before.id, companyName: after.entityName,
    createdAt: time, score: score.score, maxScore: score.maxScore, percentage: score.percentage,
    rating: score.rating, completedCriteria: score.completedCriteria, input: workflow.scoreDraft.input } };
}

function history(pairs: LivingThesisHistoryCompletedReview[] = [], patch: Partial<LivingThesis> = {}): LivingThesisHistory {
  const current = pairs.at(-1)?.revision.after ?? thesis();
  return buildLivingThesisHistory({ thesis: { ...current, ...patch }, completedReviews: pairs, decisions: [] });
}

function assess(saved: LivingThesisHistory, clock: Partial<Pick<LivingThesisHealthInput, 'referenceTime' | 'today'>> = {}) {
  return value(evaluateLivingThesisHealth({ history: saved, referenceTime, today, ...clock }));
}

describe('Living Thesis health', () => {
  it('keeps missing research information explicit and never treats no review as a reassuring result', () => {
    const saved = history([], { riskLevel: 'unrated', risks: [risk('unrated', 'unrated')] });
    const result = assess(saved);
    expect(result).toMatchObject({ algorithmVersion: LIVING_THESIS_HEALTH_ALGORITHM_VERSION,
      thesisId: 'thesis', assessedAt: referenceTime, referenceDate: today,
      research: { status: 'insufficient_information', reasons: [
        { code: 'no_completed_review' }, { code: 'overall_risk_unrated' }, { code: 'open_unrated_risks' }
      ], limitations: [{ code: 'no_score_history' }] }, reviewTiming: { status: 'not_scheduled' } });
    expect(result.research.reasons[2].message).toContain('Risk unrated');
    expect(result.reviewTiming.lastCompletedAt).toBeUndefined();
  });

  it('prioritizes concrete concerns while preserving missing-data reasons, and ignores resolved or retired high risks', () => {
    const result = assess(history([], { riskLevel: 'high', risks: [
      risk('open-b', 'high'), risk('retired', 'high', 'retired'), risk('open-a', 'high'),
      risk('resolved', 'high', 'resolved'), risk('unrated', 'unrated')
    ] }));
    expect(result.research.status).toBe('needs_attention');
    expect(result.research.reasons.map(({ code }) => code)).toEqual([
      'overall_risk_high', 'open_high_risks', 'no_completed_review', 'open_unrated_risks'
    ]);
    const open = result.research.reasons.find(({ code }) => code === 'open_high_risks')!;
    expect(open.message).toContain('Risk open-a; Risk open-b');
    expect(open.message).not.toContain('retired');
    expect(open.message).not.toContain('resolved');
    const reviewed = review(thesis(), 'completed', firstAt);
    expect(assess(history([reviewed], { risks: [risk('resolved', 'high', 'resolved'), risk('retired', 'unrated', 'retired')] }))
      .research.status).toBe('no_flagged_concerns');
  });

  it('allows explicit skipped scores and one score without claiming a comparison is available', () => {
    const skipped = review(thesis(), 'skipped', firstAt);
    expect(assess(history([skipped])).research).toMatchObject({ status: 'no_flagged_concerns',
      reasons: [{ code: 'no_flagged_concerns' }], limitations: [{ code: 'no_score_history' }] });
    const scored = review(skipped.revision.after, 'scored', secondAt, 6);
    expect(assess(history([skipped, scored])).research).toMatchObject({ status: 'no_flagged_concerns', limitations: [{ code: 'one_score_only' }] });
  });

  it('flags any actual decline in the latest formal score, including 0.01 points, without resetting after a skipped review', () => {
    const first = review(thesis(), 'first', firstAt, 6);
    const latest = review(first.revision.after, 'latest', secondAt, 5.999);
    const skipped = review(latest.revision.after, 'skipped', thirdAt);
    const saved = history([first, latest, skipped]);
    // Display deltas are derived convenience values; assessment recalculates from the snapshots.
    const tamperedDisplay = { ...saved, scores: saved.scores.map((entry) => ({ ...entry, change: 99 })) };
    const result = assess(tamperedDisplay);
    expect(result.research.status).toBe('needs_attention');
    expect(result.research.reasons).toHaveLength(1);
    expect(result.research.reasons[0]).toMatchObject({ code: 'score_declined' });
    expect(result.research.reasons[0].message).toContain('0.01 points (60 → 59.99)');
    expect(result.research.limitations).toEqual([]);
    expect(result.reviewTiming.lastCompletedAt).toBe(thirdAt);
  });

  it('preserves exact-time snapshot ID tie ordering rather than array order or current display deltas', () => {
    const first = review(thesis(), 'z', firstAt, 8);
    const lower = review(first.revision.after, 'a', firstAt, 6);
    const saved = history([first, lower]);
    expect(assess({ ...saved, scores: [...saved.scores].reverse(), items: [...saved.items].reverse() }).research)
      .toEqual(assess(saved).research);
    expect(assess(saved).research.reasons[0].message).toContain('20 points (80 → 60)');
  });

  it('excludes unlinked legacy scores and prevents conviction, prose, rising scores, or review age from overriding saved risks', () => {
    const first = review(thesis(), 'first', firstAt, 4);
    const higher = review(first.revision.after, 'higher', secondAt, 8);
    const saved = history([first, higher], { riskLevel: 'high', conviction: 'high', summary: 'Everything seems excellent.' });
    const withLegacy = { ...saved, scores: [{ snapshot: { ...higher.scoreSnapshot!, id: 'legacy', score: 0 },
      reviewSessionId: 'unlinked', change: -100 }, ...saved.scores] };
    expect(assess(withLegacy).research.reasons.map(({ code }) => code)).toEqual(['overall_risk_high']);
    const lowConviction = history([first, higher], { conviction: 'low', summary: 'Worrying and uncertain prose.' });
    expect(assess(lowConviction).research.status).toBe('no_flagged_concerns');
    expect(assess(lowConviction, { referenceTime: '2027-09-20T12:00:00.000Z', today: '2027-09-20' }).research)
      .toEqual(assess(lowConviction).research);
  });

  it.each([
    ['2026-09-19', 'overdue', -1], ['2026-09-20', 'due_today', 0],
    ['2026-09-21', 'due_soon', 1], ['2026-09-27', 'due_soon', 7], ['2026-09-28', 'scheduled', 8]
  ] as const)('uses saved nextReviewAt %s for %s independently from the research result', (dueDate, status, daysUntilDue) => {
    const reviewed = review(thesis(), 'reviewed', firstAt);
    const result = assess(history([reviewed], { nextReviewAt: dueDate, reviewCadenceDays: 1, updatedAt: thirdAt, version: 3 }));
    expect(result.reviewTiming).toEqual({ status, dueDate, daysUntilDue, lastCompletedAt: firstAt });
    expect(result.research.status).toBe('no_flagged_concerns');
  });

  it('does not derive a due date from cadence or updatedAt, and uses the explicit local day across UTC offsets and DST', () => {
    const reviewed = review(thesis(), 'reviewed', firstAt);
    expect(assess(history([reviewed], { reviewCadenceDays: 1, updatedAt: thirdAt, version: 3 })).reviewTiming)
      .toEqual({ status: 'not_scheduled', lastCompletedAt: firstAt });
    const saved = history([reviewed], { nextReviewAt: '2026-09-20' });
    expect(assess(saved, { referenceTime: '2026-09-20T01:00:00.000Z', today: '2026-09-19' }).reviewTiming.daysUntilDue).toBe(1);
    expect(assess(saved, { referenceTime: '2026-09-20T23:00:00.000Z', today: '2026-09-21' }).reviewTiming.daysUntilDue).toBe(-1);
    const dst = history([], { nextReviewAt: '2026-11-02' });
    expect(assess(dst, { referenceTime: '2026-11-01T12:00:00.000Z', today: '2026-11-01' }).reviewTiming.daysUntilDue).toBe(1);
    const leap = { ...history(), thesis: { ...thesis(), createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', nextReviewAt: '2024-03-01' }, items: [] };
    expect(assess(leap, { referenceTime: '2024-02-28T12:00:00.000Z', today: '2024-02-28' }).reviewTiming.daysUntilDue).toBe(2);
  });

  it.each(['paused', 'archived'] as const)('suppresses reminders for %s while retaining the saved date and last completed review', (lifecycle) => {
    const reviewed = review(thesis(), 'reviewed', firstAt);
    const result = assess(history([reviewed], { lifecycle, nextReviewAt: '2026-09-19',
      ...(lifecycle === 'archived' ? { archivedAt: thirdAt } : {}), updatedAt: thirdAt, version: 3 }));
    expect(result.reviewTiming).toEqual({ status: lifecycle, dueDate: '2026-09-19', daysUntilDue: -1, lastCompletedAt: firstAt });
    expect(result.research.status).toBe('no_flagged_concerns');
  });

  it('keeps draft scheduling separate from the lack of a completed review', () => {
    const result = assess(history([], { lifecycle: 'draft', nextReviewAt: '2026-09-20' }));
    expect(result.research.status).toBe('insufficient_information');
    expect(result.reviewTiming.status).toBe('due_today');
  });

  it('filters future completed reviews and scores as of the reference time and recomputes the eligible comparison', () => {
    const first = review(thesis(), 'first', firstAt, 8);
    const second = review(first.revision.after, 'second', secondAt, 6);
    const future = review(second.revision.after, 'future', '2026-09-21T12:00:00.000Z', 9);
    // A current saved version can follow a future-dated record if an earlier device clock was incorrect.
    const saved = history([first, second, future], { version: 5, updatedAt: thirdAt });
    const result = assess(saved);
    expect(result.reviewTiming.lastCompletedAt).toBe(secondAt);
    expect(result.research.reasons[0].message).toContain('20 points (80 → 60)');
    const onlyFuture = review(thesis(), 'future-only', '2026-09-21T12:00:00.000Z', 8);
    const futureOnly = assess(history([onlyFuture], { version: 3, updatedAt: thirdAt }));
    expect(futureOnly.research.status).toBe('insufficient_information');
    expect(futureOnly.research.limitations[0].code).toBe('no_score_history');
    expect(futureOnly.reviewTiming.lastCompletedAt).toBeUndefined();
  });

  it('fails safely on invalid dates, future current state, malformed inputs, and mixed or broken formal links', () => {
    const pair = review(thesis(), 'review', firstAt, 6);
    const saved = history([pair]);
    const valid: LivingThesisHealthInput = { history: saved, referenceTime, today };
    const reviewItem = saved.items.find((item) => item.kind === 'review')!;
    const invalid: unknown[] = [null, {},
      { ...valid, referenceTime: '2026-09-20' }, { ...valid, today: '2026-02-30' },
      { ...valid, history: { ...saved, thesisId: 'other' } },
      { ...valid, history: { ...saved, thesis: { ...saved.thesis, updatedAt: '2026-09-21T12:00:00.000Z' } } },
      { ...valid, history: { ...saved, thesis: { ...saved.thesis, nextReviewAt: '2026-02-30' } } },
      { ...valid, history: { ...saved, thesis: { ...saved.thesis, risks: [null] } } },
      { ...valid, history: { ...saved, items: [null] } },
      { ...valid, history: { ...saved, scores: [] } },
      { ...valid, history: { ...saved, scores: [{ ...saved.scores[0], snapshot: { ...pair.scoreSnapshot!, thesisId: 'other' } }] } },
      { ...valid, history: { ...saved, scores: [{ ...saved.scores[0], snapshot: { ...pair.scoreSnapshot!, score: 99 } }] } },
      { ...valid, history: { ...saved, scores: [{ ...saved.scores[0], snapshot: { ...pair.scoreSnapshot!, createdAt: '2026-09-10' } }] } },
      { ...valid, history: { ...saved, items: [{ ...reviewItem, session: { ...pair.session, thesisId: 'other' } }] } },
      { ...valid, history: { ...saved, items: [{ ...reviewItem, revision: { ...pair.revision, reviewSessionId: 'other' } }] } },
      { ...valid, history: { ...saved, items: [{ ...reviewItem, occurredAt: secondAt }] } }
    ];
    for (const candidate of invalid) {
      expect(() => evaluateLivingThesisHealth(candidate as LivingThesisHealthInput)).not.toThrow();
      expect(evaluateLivingThesisHealth(candidate as LivingThesisHealthInput)).toMatchObject({ ok: false, errors: expect.any(Array) });
    }
  });

  it('does not mutate or reorder the saved thesis, history, or input score deltas', () => {
    const first = review(thesis(), 'first', firstAt, 8);
    const second = review(first.revision.after, 'second', secondAt, 6);
    const saved = history([first, second], { risks: [risk('z', 'medium'), risk('a', 'low')] });
    const before = JSON.stringify(saved);
    deepFreeze(saved);
    const result = assess(saved);
    expect(result.research.status).toBe('needs_attention');
    expect(JSON.stringify(saved)).toBe(before);
    expect(assess(saved)).toEqual(result);
  });
});

function deepFreeze(input: unknown): void {
  if (!input || typeof input !== 'object' || Object.isFrozen(input)) return;
  Object.freeze(input);
  for (const nested of Object.values(input)) deepFreeze(nested);
}
