import { describe, expect, it } from 'vitest';
import {
  buildLivingThesisHistory, buildLivingThesisReviewAfter, buildLivingThesisReviewQueue, calculateMbsScore,
  completeLivingThesisReviewWorkflow, completeLivingThesisReviewWorkflowStep, evaluateLivingThesisHealth,
  LIVING_THESIS_REVIEW_QUEUE_ALGORITHM_VERSION, LIVING_THESIS_REVIEW_WORKFLOW_STEPS,
  startLivingThesisReviewWorkflow, updateLivingThesisReviewReason, updateLivingThesisReviewScoreDraft,
  type LivingThesis, type LivingThesisHistory, type LivingThesisHistoryCompletedReview,
  type LivingThesisReviewQueueInput, type LivingThesisReviewSession, type LivingThesisRisk
} from './index';

const createdAt = '2026-09-01T09:00:00.000Z';
const firstAt = '2026-09-10T10:00:00.000Z';
const secondAt = '2026-09-15T10:00:00.000Z';
const referenceTime = '2026-09-20T12:00:00.000Z';
const today = '2026-09-20';

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

function thesis(id = 'thesis', patch: Partial<LivingThesis> = {}): LivingThesis {
  return { id, version: 1, entityName: id, title: 'Recurring revenue', summary: 'Retention supports the thesis.',
    lifecycle: 'active', conviction: 'medium', riskLevel: 'medium',
    createdAt, updatedAt: createdAt, risks: [], catalysts: [], ...patch };
}

function risk(id: string, thesisId: string, severity: LivingThesisRisk['severity']): LivingThesisRisk {
  return { id, thesisId, title: `Risk ${id}`, severity, status: 'open', createdAt, updatedAt: createdAt };
}

function history(current = thesis(), completedReviews: LivingThesisHistoryCompletedReview[] = []): LivingThesisHistory {
  return buildLivingThesisHistory({ thesis: current, completedReviews, decisions: [] });
}

function active(current: LivingThesis, id = `active-${current.id}`, updatedAt = firstAt): LivingThesisReviewSession {
  return { id, thesisId: current.id, schemaVersion: 2, version: 1, startedAt: firstAt, updatedAt,
    workflow: value(startLivingThesisReviewWorkflow(current)) };
}

function assess(entries: LivingThesisReviewQueueInput['entries'], clock: Partial<Pick<LivingThesisReviewQueueInput, 'referenceTime' | 'today'>> = {}) {
  return value(buildLivingThesisReviewQueue({ entries, referenceTime, today, ...clock }));
}

function completed(before: LivingThesis, id: string, time: string, rating?: number): LivingThesisHistoryCompletedReview {
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

describe('Living Thesis review queue', () => {
  it('returns a versioned empty queue and counts eligible theses even when no action is due', () => {
    expect(assess([])).toEqual({ algorithmVersion: LIVING_THESIS_REVIEW_QUEUE_ALGORITHM_VERSION,
      assessedAt: referenceTime, referenceDate: today, items: [], eligibleThesisCount: 0, excludedThesisCount: 0 });
    const result = assess([
      { history: history(thesis('quiet', { nextReviewAt: '2026-09-28' })) },
      { history: history(thesis('unrated', { riskLevel: 'unrated', risks: [risk('unrated-risk', 'unrated', 'unrated')] })) },
      { history: history(thesis('cadence', { reviewCadenceDays: 1 })) }
    ]);
    expect(result.items).toEqual([]);
    expect(result.eligibleThesisCount).toBe(3);
  });

  it('uses one row per thesis with group precedence while keeping research reasons separate from timing', () => {
    const first = thesis('progress', { riskLevel: 'high', nextReviewAt: '2026-09-19', ticker: 'AAA' });
    const overdue = thesis('overdue', { riskLevel: 'high', nextReviewAt: '2026-09-19',
      risks: [risk('high-risk', 'overdue', 'high'), risk('unrated-risk', 'overdue', 'unrated')] });
    const result = assess([
      { history: history(thesis('concern', { riskLevel: 'high' })) },
      { history: history(thesis('soon', { riskLevel: 'high', nextReviewAt: '2026-09-27' })) },
      { history: history(overdue) }, { history: history(first), activeSession: active(first) }
    ]);
    expect(result.items.map(({ thesisId, group }) => [thesisId, group])).toEqual([
      ['progress', 'in_progress'], ['overdue', 'overdue'], ['soon', 'due_soon'], ['concern', 'research_concerns']
    ]);
    expect(result.items[0]).toMatchObject({ ticker: 'AAA', review: { baselineStatus: 'current' },
      reviewTiming: { status: 'overdue' }, researchReasons: [{ code: 'overall_risk_high' }] });
    expect(result.items[1].researchReasons.map(({ code }) => code)).toEqual(['overall_risk_high', 'open_high_risks']);
    expect(result.items[2].reviewTiming.status).toBe('due_soon');
    expect(result.items[3].reviewTiming.status).toBe('not_scheduled');
  });

  it('excludes paused and archived theses from every group but includes draft and monitoring lifecycles', () => {
    const paused = thesis('paused', { lifecycle: 'paused', riskLevel: 'high', nextReviewAt: '2026-09-19' });
    const archiveBaseline = thesis('archived');
    const result = assess([
      { history: history(paused), activeSession: active(paused) },
      { history: history({ ...archiveBaseline, lifecycle: 'archived', archivedAt: secondAt, updatedAt: secondAt,
        version: 2, riskLevel: 'high', nextReviewAt: today }), activeSession: active(archiveBaseline) },
      { history: history(thesis('draft', { lifecycle: 'draft', nextReviewAt: today })) },
      { history: history(thesis('monitoring', { lifecycle: 'monitoring', riskLevel: 'high' })) }
    ]);
    expect(result.items.map(({ thesisId }) => thesisId)).toEqual(['draft', 'monitoring']);
    expect(result).toMatchObject({ eligibleThesisCount: 2, excludedThesisCount: 2 });
  });

  it.each([
    ['2026-09-19', 'overdue', 'overdue', -1], ['2026-09-20', 'due_soon', 'due_today', 0],
    ['2026-09-27', 'due_soon', 'due_soon', 7], ['2026-09-28', undefined, undefined, undefined]
  ] as const)('uses the health seven-day boundary for %s', (nextReviewAt, group, status, daysUntilDue) => {
    const result = assess([{ history: history(thesis('boundary', { nextReviewAt })) }]);
    if (!group) expect(result.items).toEqual([]);
    else expect(result.items[0]).toMatchObject({ group, reviewTiming: { status, daysUntilDue, dueDate: nextReviewAt } });
  });

  it('uses the supplied local day across UTC midnight and calendar transitions', () => {
    const saved = history(thesis('local', { nextReviewAt: '2026-09-20' }));
    expect(assess([{ history: saved }], { referenceTime: '2026-09-20T01:00:00.000Z', today: '2026-09-19' })
      .items[0].reviewTiming.daysUntilDue).toBe(1);
    expect(assess([{ history: saved }], { referenceTime: '2026-09-20T23:00:00.000Z', today: '2026-09-21' })
      .items[0].group).toBe('overdue');
    const leap = history(thesis('leap', { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', nextReviewAt: '2024-03-01' }));
    expect(assess([{ history: leap }], { referenceTime: '2024-02-28T12:00:00.000Z', today: '2024-02-28' })
      .items[0].reviewTiming.daysUntilDue).toBe(2);
  });

  it('sorts deterministically by group, oldest review update or due date, then ordinal name and ID', () => {
    const progress = ['z', 'a', 'b'].map((id) => {
      const current = thesis(`progress-${id}`, { entityName: 'Same' });
      return { history: history(current), activeSession: active(current, `session-${id}`, id === 'b' ? secondAt : firstAt) };
    });
    const due = [
      thesis('due-z', { entityName: 'A', nextReviewAt: '2026-09-18' }),
      thesis('due-a', { entityName: 'A', nextReviewAt: '2026-09-18' }),
      thesis('due-b', { entityName: 'B', nextReviewAt: '2026-09-18' }),
      thesis('due-oldest', { entityName: 'Z', nextReviewAt: '2026-09-17' }),
      thesis('today', { nextReviewAt: today }), thesis('tomorrow', { nextReviewAt: '2026-09-21' }),
      thesis('concern-lower', { entityName: 'a', riskLevel: 'high' }),
      thesis('concern-upper', { entityName: 'Z', riskLevel: 'high' })
    ].map((current) => ({ history: history(current) }));
    const entries = [...due, ...progress];
    const result = assess(entries);
    expect(result.items.map(({ thesisId }) => thesisId)).toEqual([
      'progress-a', 'progress-z', 'progress-b', 'due-oldest', 'due-a', 'due-z', 'due-b',
      'today', 'tomorrow', 'concern-upper', 'concern-lower'
    ]);
    expect(assess([...entries].reverse())).toEqual(result);
  });

  it('marks changed baselines without discarding drafts and compares object values independently of key order', () => {
    const original = thesis('changed', { risks: [risk('z', 'changed', 'high'), risk('a', 'changed', 'medium')] });
    const session = active(original);
    const updated = { ...original, version: 2, title: 'Saved Board edit', updatedAt: secondAt };
    expect(assess([{ history: history(updated), activeSession: session }]).items[0].review?.baselineStatus).toBe('changed');
    expect(buildLivingThesisReviewQueue({ entries: [{ history: history({ ...original, title: 'Same-version content edit' }), activeSession: session }],
      referenceTime, today }).ok).toBe(false);
    const reordered = Object.fromEntries(Object.entries({ ...original, title: ` ${original.title} `,
      ticker: undefined, risks: [...original.risks].reverse() }).reverse()) as LivingThesis;
    const unfinished = { ...session, workflow: { ...session.workflow,
      draft: { ...session.workflow.draft, title: '', nextReviewAt: 'unfinished' } } };
    expect(assess([{ history: history(reordered), activeSession: unfinished }]).items[0].review?.baselineStatus).toBe('current');
  });

  it('delegates exact formal score comparisons and skip behavior to health, ignoring unlinked legacy scores', () => {
    const first = completed(thesis(), 'first', firstAt, 6);
    const latest = completed(first.revision.after, 'latest', secondAt, 5.999);
    const skipped = completed(latest.revision.after, 'skipped', '2026-09-18T10:00:00.000Z');
    const saved = history(skipped.revision.after, [first, latest, skipped]);
    const withLegacy = { ...saved, scores: [...saved.scores.map((score) => ({ ...score, change: 99 })),
      { snapshot: { ...latest.scoreSnapshot!, id: 'legacy', score: 100 }, reviewSessionId: 'legacy-review' }] };
    const result = assess([{ history: withLegacy }]).items[0];
    const health = value(evaluateLivingThesisHealth({ history: withLegacy, referenceTime, today }));
    expect(result).toMatchObject({ group: 'research_concerns', researchReasons: [{ code: 'score_declined' }] });
    expect(result.researchReasons).toEqual(health.research.reasons);
    expect(result.researchReasons[0].message).toContain('0.01 points (60 → 59.99)');
    expect(result.reviewTiming).toEqual(health.reviewTiming);
    const rising = completed(first.revision.after, 'rising', secondAt, 8);
    expect(assess([{ history: history(rising.revision.after, [first, rising]) }]).items).toEqual([]);
  });

  it('preserves the health assessment-time policy for future historical reviews and scores', () => {
    const first = completed(thesis(), 'first', firstAt, 8);
    const second = completed(first.revision.after, 'second', secondAt, 6);
    const future = completed(second.revision.after, 'future', '2026-09-21T12:00:00.000Z', 9);
    const saved = history({ ...future.revision.after, version: 5, updatedAt: secondAt }, [first, second, future]);
    const item = assess([{ history: saved }]).items[0];
    expect(item.researchReasons[0].message).toContain('20 points (80 → 60)');
    expect(item.reviewTiming.lastCompletedAt).toBe(secondAt);
  });

  it('rejects malformed histories, invalid clocks, future current state, and broken formal links without throwing', () => {
    const pair = completed(thesis(), 'review', firstAt, 6);
    const saved = history(pair.revision.after, [pair]);
    const valid: LivingThesisReviewQueueInput = { entries: [{ history: saved }], referenceTime, today };
    const invalid: unknown[] = [null, {}, { ...valid, entries: null },
      { ...valid, referenceTime: today }, { ...valid, today: '2026-02-30' },
      { entries: [], referenceTime: 'invalid', today }, { entries: [], referenceTime, today: 'invalid' },
      { ...valid, entries: [{ history: null }] },
      { ...valid, entries: [{ history: { ...saved, thesisId: 'other' } }] },
      { ...valid, entries: [{ history: { ...saved, items: [null] } }] },
      { ...valid, entries: [{ history: { ...saved, scores: [] } }] },
      { ...valid, entries: [{ history: { ...saved, thesis: { ...saved.thesis, updatedAt: '2026-09-21T00:00:00.000Z' } } }] },
      { ...valid, entries: [{ history: { ...saved, scores: [{ ...saved.scores[0], snapshot: { ...pair.scoreSnapshot!, thesisId: 'other' } }] } }] }
    ];
    for (const candidate of invalid) {
      expect(() => buildLivingThesisReviewQueue(candidate as LivingThesisReviewQueueInput)).not.toThrow();
      expect(buildLivingThesisReviewQueue(candidate as LivingThesisReviewQueueInput)).toMatchObject({ ok: false, errors: expect.any(Array) });
    }
  });

  it('rejects bad active links, completed sessions, newer baselines, future data and reversed review times', () => {
    const current = thesis();
    const session = active(current);
    const completedPair = completed(current, 'done', firstAt);
    const invalid: unknown[] = [null, {}, { ...session, thesisId: 'other' }, completedPair.session,
      { ...session, workflow: { ...session.workflow, baseline: { ...current, createdAt: '2026-09-02T09:00:00.000Z' } } },
      { ...session, workflow: { ...session.workflow, baseline: { ...current, version: 2 } } },
      { ...session, updatedAt: '2026-09-21T00:00:00.000Z' },
      { ...session, startedAt: secondAt },
      { ...session, workflow: { ...session.workflow, baseline: { ...current, updatedAt: secondAt } } },
      { ...session, workflow: { ...session.workflow, draft: { ...session.workflow.draft,
        risks: [{ ...risk('future-risk', current.id, 'high'), updatedAt: '2026-09-21T00:00:00.000Z' }] } } }
    ];
    for (const activeSession of invalid) {
      expect(buildLivingThesisReviewQueue({ entries: [{ history: history(current), activeSession: activeSession as LivingThesisReviewSession }], referenceTime, today }))
        .toMatchObject({ ok: false, errors: expect.any(Array) });
    }
    const paused = { ...current, lifecycle: 'paused' as const };
    expect(buildLivingThesisReviewQueue({ entries: [{ history: history(paused), activeSession: {} as LivingThesisReviewSession }], referenceTime, today }).ok).toBe(false);
  });

  it('rejects duplicate thesis and session identities across inputs, including active/history collisions', () => {
    const first = thesis('first');
    const second = thesis('second');
    const pair = completed(first, 'collision', firstAt);
    const otherPair = completed(second, 'collision', firstAt);
    const invalid: LivingThesisReviewQueueInput['entries'][] = [
      [{ history: history(first) }, { history: history(first) }],
      [{ history: history(first), activeSession: active(first, 'same') }, { history: history(second), activeSession: active(second, 'same') }],
      [{ history: history(pair.revision.after, [pair]) }, { history: history(second), activeSession: active(second, 'collision') }],
      [{ history: history(pair.revision.after, [pair]) }, { history: history(otherPair.revision.after, [otherPair]) }]
    ];
    for (const entries of invalid) expect(buildLivingThesisReviewQueue({ entries, referenceTime, today }).ok).toBe(false);
  });

  it('does not mutate or reorder frozen histories and sessions and returns the same result on repeated evaluation', () => {
    const current = thesis('frozen', { riskLevel: 'high', risks: [risk('z', 'frozen', 'high'), risk('a', 'frozen', 'high')] });
    const entries = [{ history: history(current), activeSession: active(current) }];
    const before = JSON.stringify(entries);
    deepFreeze(entries);
    const result = assess(entries);
    expect(JSON.stringify(entries)).toBe(before);
    expect(assess(entries)).toEqual(result);
  });
});

function deepFreeze(input: unknown): void {
  if (!input || typeof input !== 'object' || Object.isFrozen(input)) return;
  Object.freeze(input);
  for (const nested of Object.values(input)) deepFreeze(nested);
}
