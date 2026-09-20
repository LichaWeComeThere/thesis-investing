import type { EntityId, IsoDateString, IsoTimestampString } from './domain';
import { validateLivingThesis } from './livingThesis';
import type { LivingThesisHistory, LivingThesisHistoryItem, LivingThesisHistoryScore } from './livingThesisHistory';
import { parseLivingThesisReviewSession } from './livingThesisReviewSession';
import { parseLivingThesisRevision } from './livingThesisRevision';
import { calculateMbsScore, MBS_CATEGORIES } from './scoring';
import { isValidIsoDate, isValidIsoTimestamp, validateMbsScoreSnapshot } from './validation';

export const LIVING_THESIS_HEALTH_ALGORITHM_VERSION = 1 as const;
export const LIVING_THESIS_RESEARCH_STATUSES = ['needs_attention', 'no_flagged_concerns', 'insufficient_information'] as const;
export const LIVING_THESIS_REVIEW_TIMING_STATUSES = [
  'overdue', 'due_today', 'due_soon', 'scheduled', 'not_scheduled', 'paused', 'archived'
] as const;

export type LivingThesisResearchStatus = typeof LIVING_THESIS_RESEARCH_STATUSES[number];
export type LivingThesisReviewTimingStatus = typeof LIVING_THESIS_REVIEW_TIMING_STATUSES[number];
export type LivingThesisHealthReasonCode = 'overall_risk_high' | 'open_high_risks' | 'score_declined' |
  'no_completed_review' | 'overall_risk_unrated' | 'open_unrated_risks' | 'no_flagged_concerns';
export type LivingThesisHealthLimitationCode = 'no_score_history' | 'one_score_only';
export type LivingThesisHealthReason = { readonly code: LivingThesisHealthReasonCode; readonly message: string };
export type LivingThesisHealthLimitation = { readonly code: LivingThesisHealthLimitationCode; readonly message: string };

export type LivingThesisHealth = {
  readonly algorithmVersion: typeof LIVING_THESIS_HEALTH_ALGORITHM_VERSION;
  readonly thesisId: EntityId;
  readonly assessedAt: IsoTimestampString;
  readonly referenceDate: IsoDateString;
  readonly research: {
    readonly status: LivingThesisResearchStatus;
    readonly reasons: readonly LivingThesisHealthReason[];
    readonly limitations: readonly LivingThesisHealthLimitation[];
  };
  readonly reviewTiming: {
    readonly status: LivingThesisReviewTimingStatus;
    readonly dueDate?: IsoDateString;
    readonly daysUntilDue?: number;
    readonly lastCompletedAt?: IsoTimestampString;
  };
};

export type LivingThesisHealthInput = {
  readonly history: LivingThesisHistory;
  readonly referenceTime: IsoTimestampString;
  /** Local calendar day supplied by the caller, independent of the UTC timestamp's day. */
  readonly today: IsoDateString;
};

export type LivingThesisHealthResult = { readonly ok: true; readonly value: LivingThesisHealth } |
  { readonly ok: false; readonly errors: readonly string[] };

/**
 * Describes saved research concerns separately from review scheduling. It does not infer
 * investment quality from conviction, prose, rising scores, recency, or absence of flags.
 * No clocks, generated IDs, database writes, or raw ticker-based score links are used.
 */
export function evaluateLivingThesisHealth(input: LivingThesisHealthInput): LivingThesisHealthResult {
  try {
    return evaluate(input);
  } catch {
    return { ok: false, errors: ['The saved thesis history is incomplete or malformed. Reload it before assessing thesis health.'] };
  }
}

type ReviewItem = Extract<LivingThesisHistoryItem, { kind: 'review' }>;

function evaluate({ history, referenceTime, today }: LivingThesisHealthInput): LivingThesisHealthResult {
  const errors: string[] = [];
  if (typeof referenceTime !== 'string' || !isValidIsoTimestamp(referenceTime)) {
    errors.push('Assessment time must be a canonical UTC timestamp.');
  }
  if (typeof today !== 'string' || !isValidIsoDate(today)) errors.push('Today must be a valid local calendar date in YYYY-MM-DD format.');
  if (errors.length) return { ok: false, errors };
  const thesis = history.thesis;
  errors.push(...validateLivingThesis(thesis).errors);
  if (history.thesisId !== thesis.id) errors.push('The history and saved thesis must have the same ID.');
  if (thesis.createdAt > thesis.updatedAt || thesis.updatedAt > referenceTime || thesis.createdAt > referenceTime) {
    errors.push('The saved thesis must exist at the assessment time; its update cannot be in the future.');
  }
  if (thesis.archivedAt && (thesis.archivedAt > referenceTime || thesis.archivedAt < thesis.createdAt)) {
    errors.push('The saved archive time must be between thesis creation and the assessment time.');
  }
  for (const child of [...thesis.risks, ...thesis.catalysts]) {
    if (child.createdAt > child.updatedAt || child.updatedAt > referenceTime) {
      errors.push('Saved risks and catalysts cannot contain future or reversed timestamps.');
    }
  }
  if (!Array.isArray(history.items) || !Array.isArray(history.scores)) {
    errors.push('The saved history must contain timeline and score arrays.');
  }
  if (errors.length) return { ok: false, errors };

  const reviews: ReviewItem[] = [];
  const reviewIds = new Set<string>();
  for (const item of history.items) {
    if (!isValidIsoTimestamp(item.occurredAt)) { errors.push('A history event has an invalid timestamp.'); continue; }
    if (item.kind !== 'review' || item.occurredAt > referenceTime) continue;
    const { session, revision } = item;
    const sessionResult = parseLivingThesisReviewSession(session);
    const revisionResult = parseLivingThesisRevision(revision);
    if (!sessionResult.ok || !revisionResult.ok || session.workflow.status !== 'completed' ||
        session.thesisId !== thesis.id || revision.thesisId !== thesis.id ||
        session.revisionId !== revision.id || revision.reviewSessionId !== session.id ||
        session.completedAt !== item.occurredAt || revision.createdAt !== item.occurredAt ||
        session.scoreSnapshotId !== revision.scoreSnapshotId || revision.after.version > thesis.version ||
        revision.before.createdAt !== thesis.createdAt || revision.after.createdAt !== thesis.createdAt ||
        reviewIds.has(session.id)) {
      errors.push('Completed review history has inconsistent identities, dates, or links.');
      continue;
    }
    reviewIds.add(session.id);
    reviews.push(item);
  }
  const scores = eligibleScores(history.scores, reviews, thesis.id, errors);
  if (errors.length) return { ok: false, errors };
  reviews.sort((left, right) => compareText(right.occurredAt, left.occurredAt) || compareText(left.session.id, right.session.id));

  const reasons: LivingThesisHealthReason[] = [];
  const limitations: LivingThesisHealthLimitation[] = [];
  if (thesis.riskLevel === 'high') reasons.push({ code: 'overall_risk_high', message: 'The saved overall risk level is high.' });
  const openRisks = thesis.risks.filter((risk) => risk.status === 'open').slice().sort((left, right) => compareText(left.id, right.id));
  const highRisks = openRisks.filter((risk) => risk.severity === 'high');
  if (highRisks.length) reasons.push({ code: 'open_high_risks', message: `Open risks rated high: ${highRisks.map((risk) => risk.title).join('; ')}.` });
  if (scores.length >= 2) {
    const change = Math.round((scores[0].snapshot.score - scores[1].snapshot.score) * 100) / 100;
    if (change < 0) reasons.push({ code: 'score_declined',
      message: `The latest completed-review score fell by ${Math.abs(change)} ${Math.abs(change) === 1 ? 'point' : 'points'} (${scores[1].snapshot.score} → ${scores[0].snapshot.score}).` });
  } else {
    limitations.push(scores.length ? { code: 'one_score_only', message: 'Only one completed-review score is available, so a score change cannot be assessed yet.' }
      : { code: 'no_score_history', message: 'No completed-review scores are available. Reviews may explicitly skip scoring; score changes cannot be assessed yet.' });
  }
  const hasConcern = reasons.length > 0;
  if (!reviews.length) reasons.push({ code: 'no_completed_review', message: 'No completed review is recorded by the assessment time.' });
  if (thesis.riskLevel === 'unrated') reasons.push({ code: 'overall_risk_unrated', message: 'The saved overall risk level has not been rated.' });
  const unratedRisks = openRisks.filter((risk) => risk.severity === 'unrated');
  if (unratedRisks.length) reasons.push({ code: 'open_unrated_risks', message: `Open risks need a severity rating: ${unratedRisks.map((risk) => risk.title).join('; ')}.` });
  const status: LivingThesisResearchStatus = hasConcern ? 'needs_attention' : reasons.length ? 'insufficient_information' : 'no_flagged_concerns';
  if (!reasons.length) reasons.push({ code: 'no_flagged_concerns', message: 'No concerns were flagged by the saved risk ratings and available score comparison. This does not establish investment quality.' });

  const dueDate = thesis.nextReviewAt;
  const daysUntilDue = dueDate === undefined ? undefined : calendarDay(dueDate) - calendarDay(today);
  const timingStatus: LivingThesisReviewTimingStatus = thesis.lifecycle === 'archived' || thesis.lifecycle === 'paused'
    ? thesis.lifecycle : daysUntilDue === undefined ? 'not_scheduled' : daysUntilDue < 0 ? 'overdue'
      : daysUntilDue === 0 ? 'due_today' : daysUntilDue <= 7 ? 'due_soon' : 'scheduled';
  return { ok: true, value: {
    algorithmVersion: LIVING_THESIS_HEALTH_ALGORITHM_VERSION,
    thesisId: thesis.id, assessedAt: referenceTime, referenceDate: today,
    research: { status, reasons, limitations },
    reviewTiming: { status: timingStatus, ...(dueDate ? { dueDate, daysUntilDue } : {}),
      ...(reviews[0] ? { lastCompletedAt: reviews[0].occurredAt } : {}) }
  } };
}

/** Only completed review/revision links establish a formal score; legacy IDs/tickers do not. */
function eligibleScores(input: readonly LivingThesisHistoryScore[], reviews: readonly ReviewItem[], thesisId: string,
  errors: string[]): LivingThesisHistoryScore[] {
  const scores: LivingThesisHistoryScore[] = [];
  const usedScores = new Set<string>();
  for (const { session, revision } of reviews) {
    const scoreDraft = session.workflow.scoreDraft;
    if (scoreDraft.kind !== 'score') continue;
    const matches = input.filter((score) => score.reviewSessionId === session.id && score.snapshot.id === session.scoreSnapshotId);
    const entry = matches[0];
    if (matches.length !== 1 || !entry || usedScores.has(entry.snapshot.id)) {
      errors.push('A completed review is missing its unique formal score snapshot.');
      continue;
    }
    const snapshot = entry.snapshot;
    const calculated = calculateMbsScore(scoreDraft.input);
    if (snapshot.thesisId !== thesisId || snapshot.id !== revision.scoreSnapshotId ||
        snapshot.createdAt !== session.completedAt || !snapshot.createdAt || !isValidIsoTimestamp(snapshot.createdAt) ||
        !validateMbsScoreSnapshot(snapshot).valid || calculated.rating === 'incomplete' ||
        snapshot.score !== calculated.score || snapshot.maxScore !== calculated.maxScore ||
        snapshot.percentage !== calculated.percentage || snapshot.rating !== calculated.rating ||
        MBS_CATEGORIES.some((category) => snapshot.input[category] !== scoreDraft.input[category])) {
      errors.push('A formal score snapshot has inconsistent data, dates, or review links.');
      continue;
    }
    usedScores.add(snapshot.id);
    scores.push(entry);
  }
  return scores.sort((left, right) => compareText(right.snapshot.createdAt!, left.snapshot.createdAt!) ||
    compareText(left.snapshot.id, right.snapshot.id));
}

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function calendarDay(date: string): number { return Date.parse(`${date}T00:00:00.000Z`) / 86_400_000; }
