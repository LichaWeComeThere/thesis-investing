import type { EntityId, IsoDateString, IsoTimestampString, TickerSymbol } from './domain';
import { normalizeLivingThesis, type LivingThesis, type LivingThesisLifecycle } from './livingThesis';
import { evaluateLivingThesisHealth, type LivingThesisHealth, type LivingThesisHealthReason } from './livingThesisHealth';
import type { LivingThesisHistory } from './livingThesisHistory';
import { parseLivingThesisReviewSession, type LivingThesisReviewSession } from './livingThesisReviewSession';
import { isValidIsoDate, isValidIsoTimestamp } from './validation';

export const LIVING_THESIS_REVIEW_QUEUE_ALGORITHM_VERSION = 1 as const;
export const LIVING_THESIS_REVIEW_QUEUE_GROUPS = ['in_progress', 'overdue', 'due_soon', 'research_concerns'] as const;
export type LivingThesisReviewQueueGroup = typeof LIVING_THESIS_REVIEW_QUEUE_GROUPS[number];

export type LivingThesisReviewQueueItem = {
  readonly thesisId: EntityId;
  readonly entityName: string;
  readonly ticker?: TickerSymbol;
  readonly title: string;
  readonly lifecycle: LivingThesisLifecycle;
  readonly group: LivingThesisReviewQueueGroup;
  readonly reviewTiming: LivingThesisHealth['reviewTiming'];
  readonly researchReasons: readonly LivingThesisHealthReason[];
  readonly review?: {
    readonly sessionId: EntityId;
    readonly updatedAt: IsoTimestampString;
    readonly baselineStatus: 'current' | 'changed';
  };
};

export type LivingThesisReviewQueue = {
  readonly algorithmVersion: typeof LIVING_THESIS_REVIEW_QUEUE_ALGORITHM_VERSION;
  readonly assessedAt: IsoTimestampString;
  readonly referenceDate: IsoDateString;
  readonly items: readonly LivingThesisReviewQueueItem[];
  /** All non-paused, non-archived theses, including those with no queue reason. */
  readonly eligibleThesisCount: number;
  readonly excludedThesisCount: number;
};

export type LivingThesisReviewQueueInput = {
  readonly entries: readonly {
    readonly history: LivingThesisHistory;
    readonly activeSession?: LivingThesisReviewSession;
  }[];
  readonly referenceTime: IsoTimestampString;
  /** Local calendar day supplied by the caller, independent of the UTC timestamp's day. */
  readonly today: IsoDateString;
};

export type LivingThesisReviewQueueResult = { readonly ok: true; readonly value: LivingThesisReviewQueue } |
  { readonly ok: false; readonly errors: readonly string[] };

/**
 * Projects saved research and unfinished reviews into one row per eligible thesis.
 * Health owns timing and research rules, including formal score relationships and its
 * assessment-time policy. This projection does not read a clock or change saved state.
 */
export function buildLivingThesisReviewQueue(input: LivingThesisReviewQueueInput): LivingThesisReviewQueueResult {
  try {
    return build(input);
  } catch {
    return { ok: false, errors: ['The saved review queue data is incomplete or malformed. Reload it before opening the queue.'] };
  }
}

function build({ entries, referenceTime, today }: LivingThesisReviewQueueInput): LivingThesisReviewQueueResult {
  const errors: string[] = [];
  if (typeof referenceTime !== 'string' || !isValidIsoTimestamp(referenceTime)) {
    errors.push('Assessment time must be a canonical UTC timestamp.');
  }
  if (typeof today !== 'string' || !isValidIsoDate(today)) errors.push('Today must be a valid local calendar date in YYYY-MM-DD format.');
  if (!Array.isArray(entries)) errors.push('Review queue entries must be an array.');
  if (errors.length) return { ok: false, errors };

  const thesisIds = new Set<string>();
  const sessionIds = new Set<string>();
  const items: LivingThesisReviewQueueItem[] = [];
  let eligibleThesisCount = 0;
  let excludedThesisCount = 0;
  for (const { history, activeSession } of entries) {
    const health = evaluateLivingThesisHealth({ history, referenceTime, today });
    if (!health.ok) { errors.push(...health.errors); continue; }
    const thesis = history.thesis;
    if (thesisIds.has(thesis.id)) errors.push('A thesis can appear only once in the review queue input.');
    thesisIds.add(thesis.id);
    for (const item of history.items) {
      if (item.kind === 'review' && item.occurredAt <= referenceTime) registerSession(item.session.id, sessionIds, errors);
    }

    let review: LivingThesisReviewQueueItem['review'];
    if (activeSession !== undefined) {
      const parsed = parseLivingThesisReviewSession(activeSession);
      if (!parsed.ok) errors.push(...parsed.errors);
      else {
        const session = parsed.value;
        registerSession(session.id, sessionIds, errors);
        errors.push(...activeSessionErrors(session, thesis, referenceTime));
        review = { sessionId: session.id, updatedAt: session.updatedAt,
          baselineStatus: sameBaseline(session.workflow.baseline, thesis) ? 'current' : 'changed' };
      }
    }

    // Validate supplied data even for excluded lifecycle states so corruption is visible.
    if (thesis.lifecycle === 'paused' || thesis.lifecycle === 'archived') { excludedThesisCount += 1; continue; }
    eligibleThesisCount += 1;
    const researchReasons = health.value.research.reasons.filter(({ code }) =>
      code === 'overall_risk_high' || code === 'open_high_risks' || code === 'score_declined');
    const timing = health.value.reviewTiming.status;
    const group = review ? 'in_progress' : timing === 'overdue' ? 'overdue'
      : timing === 'due_today' || timing === 'due_soon' ? 'due_soon'
        : researchReasons.length ? 'research_concerns' : undefined;
    if (group) items.push({ thesisId: thesis.id, entityName: thesis.entityName,
      ...(thesis.ticker !== undefined ? { ticker: thesis.ticker } : {}), title: thesis.title,
      lifecycle: thesis.lifecycle, group, reviewTiming: health.value.reviewTiming, researchReasons,
      ...(review ? { review } : {}) });
  }
  if (errors.length) return { ok: false, errors };
  items.sort(compareItems);
  return { ok: true, value: { algorithmVersion: LIVING_THESIS_REVIEW_QUEUE_ALGORITHM_VERSION,
    assessedAt: referenceTime, referenceDate: today, items, eligibleThesisCount, excludedThesisCount } };
}

function activeSessionErrors(session: LivingThesisReviewSession, thesis: LivingThesis, referenceTime: string): string[] {
  const errors: string[] = [];
  const baseline = session.workflow.baseline;
  if (session.workflow.status !== 'in_progress') errors.push('An active review session must still be in progress.');
  if (session.thesisId !== thesis.id || baseline.id !== thesis.id || baseline.createdAt !== thesis.createdAt) {
    errors.push('An active review must belong to the saved thesis and preserve its creation identity.');
  }
  if (baseline.version > thesis.version) errors.push('An active review baseline cannot be newer than the saved thesis.');
  if (baseline.version === thesis.version && !sameBaseline(baseline, thesis)) {
    errors.push('An active review baseline must match the saved thesis when their versions are equal.');
  }
  if (baseline.createdAt > baseline.updatedAt || baseline.updatedAt > session.startedAt ||
      baseline.updatedAt > thesis.updatedAt || session.startedAt < thesis.createdAt || session.updatedAt > referenceTime) {
    errors.push('Active review times must follow thesis creation and their baseline, and cannot be in the future.');
  }
  for (const [children, latestTime] of [
    [[...baseline.risks, ...baseline.catalysts], session.startedAt],
    [[...session.workflow.draft.risks, ...session.workflow.draft.catalysts], session.updatedAt]
  ] as const) {
    if (children.some((child) => child.createdAt > child.updatedAt || child.createdAt < thesis.createdAt || child.updatedAt > latestTime)) {
      errors.push('Active review children must have ordered timestamps within their saved review history.');
    }
  }
  return errors;
}

function registerSession(id: string, ids: Set<string>, errors: string[]): void {
  if (ids.has(id)) errors.push('Review session IDs must be unique across the review queue input.');
  ids.add(id);
}

function compareItems(left: LivingThesisReviewQueueItem, right: LivingThesisReviewQueueItem): number {
  const groupOrder = LIVING_THESIS_REVIEW_QUEUE_GROUPS.indexOf(left.group) - LIVING_THESIS_REVIEW_QUEUE_GROUPS.indexOf(right.group);
  if (groupOrder) return groupOrder;
  const timeOrder = left.group === 'in_progress'
    ? compareText(left.review!.updatedAt, right.review!.updatedAt)
    : left.group === 'overdue' || left.group === 'due_soon'
      ? compareText(left.reviewTiming.dueDate!, right.reviewTiming.dueDate!) : 0;
  return timeOrder || compareText(left.entityName, right.entityName) || compareText(left.thesisId, right.thesisId);
}

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

function sameBaseline(left: LivingThesis, right: LivingThesis): boolean {
  const canonical = (thesis: LivingThesis): LivingThesis => normalizeLivingThesis({ ...thesis,
    risks: [...thesis.risks].sort((first, second) => compareText(first.id, second.id)),
    catalysts: [...thesis.catalysts].sort((first, second) => compareText(first.id, second.id)) });
  return sameValue(canonical(left), canonical(right));
}

/** Object property order and absent optional properties do not make a baseline stale. */
function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]));
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const first = left as Record<string, unknown>;
  const second = right as Record<string, unknown>;
  return [...new Set([...Object.keys(first), ...Object.keys(second)])]
    .every((key) => sameValue(first[key], second[key]));
}
