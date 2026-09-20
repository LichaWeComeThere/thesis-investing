import type { EntityId, IsoTimestampString, MbsScoreSnapshot } from './domain';
import type { LivingThesis, LivingThesisCatalyst, LivingThesisRisk } from './livingThesis';
import { parseLivingThesisDecision, type LivingThesisDecision } from './livingThesisDecision';
import type { LivingThesisReviewSession } from './livingThesisReviewSession';
import type { LivingThesisRevision } from './livingThesisRevision';
import { isValidIsoTimestamp, validateMbsScoreSnapshot } from './validation';

export type LivingThesisHistoryCompletedReview = {
  readonly session: LivingThesisReviewSession;
  readonly revision: LivingThesisRevision;
  readonly scoreSnapshot?: MbsScoreSnapshot;
};

export type LivingThesisHistoryInput = {
  readonly thesis: LivingThesis;
  readonly completedReviews: readonly LivingThesisHistoryCompletedReview[];
  readonly decisions: readonly LivingThesisDecision[];
};

/** Null means the value was absent; prose and child changes contain readable text. */
export type LivingThesisHistoryChange = {
  readonly label: string;
  readonly before: string | null;
  readonly after: string | null;
};

export type LivingThesisHistoryScore = {
  readonly snapshot: MbsScoreSnapshot;
  readonly reviewSessionId: EntityId;
  readonly previousSnapshotId?: EntityId;
  /** Score points relative to the next older eligible score, absent for the first score. */
  readonly change?: number;
};

export type LivingThesisHistoryItem = {
  /** A deterministic display key derived from the source kind and stored identity. */
  readonly id: string;
  readonly occurredAt: IsoTimestampString;
} & (
  | { readonly kind: 'created' }
  | { readonly kind: 'review'; readonly session: LivingThesisReviewSession;
      readonly revision: LivingThesisRevision; readonly changes: readonly LivingThesisHistoryChange[] }
  | { readonly kind: 'score'; readonly score: LivingThesisHistoryScore }
  | { readonly kind: 'decision'; readonly decision: LivingThesisDecision; readonly reviewReason?: string }
  | { readonly kind: 'archived' }
);

export type LivingThesisHistory = {
  readonly thesisId: EntityId;
  /** Current saved aggregate, read alongside history in the same storage transaction. */
  readonly thesis: LivingThesis;
  readonly items: readonly LivingThesisHistoryItem[];
  readonly scores: readonly LivingThesisHistoryScore[];
};

/**
 * Projects existing records without reading a clock, creating stored IDs, or changing inputs.
 * Persisted review pairs must pass full completion integrity checks at the storage boundary.
 * These additional identity/time guards keep mixed-thesis or unlinked records out of history.
 * No historical content is inferred from the current thesis: creation is date-only, and
 * current archivedAt adds a marker only when a review has not already recorded that transition.
 * Direct Board edits and older archive/unarchive cycles may have no stored event.
 * Items sort by time descending, then decision/review/score/archived/created, then ID ascending.
 * Scores sort by their exact UTC time descending and snapshot ID ascending, including ties.
 */
export function buildLivingThesisHistory(input: LivingThesisHistoryInput): LivingThesisHistory {
  const { thesis } = input;
  const pairs = uniqueById(input.completedReviews.filter((pair) => isScopedReview(pair, thesis)),
    (pair) => pair.session.id);
  const bySessionId = new Map(pairs.map((pair) => [pair.session.id, pair]));
  const eligibleScores = uniqueById(pairs.flatMap((pair): LivingThesisHistoryScore[] => {
    const { session, revision, scoreSnapshot } = pair;
    if (session.workflow.scoreDraft.kind !== 'score' || !scoreSnapshot ||
        !scoreSnapshot.id.trim() || scoreSnapshot.id !== session.scoreSnapshotId ||
        scoreSnapshot.id !== revision.scoreSnapshotId || scoreSnapshot.thesisId !== thesis.id ||
        scoreSnapshot.createdAt !== session.completedAt || !validateMbsScoreSnapshot(scoreSnapshot).valid) return [];
    return [{ snapshot: copy(scoreSnapshot), reviewSessionId: session.id }];
  }), (score) => score.snapshot.id).sort((left, right) =>
    compareText(right.snapshot.createdAt!, left.snapshot.createdAt!) || compareText(left.snapshot.id, right.snapshot.id));
  const scores: LivingThesisHistoryScore[] = eligibleScores.map((score, index) => {
    const previous = eligibleScores[index + 1];
    return previous ? { ...score, previousSnapshotId: previous.snapshot.id,
      change: Math.round((score.snapshot.score - previous.snapshot.score) * 100) / 100 } : score;
  });

  const items: LivingThesisHistoryItem[] = [];
  if (isValidIsoTimestamp(thesis.createdAt)) {
    items.push({ id: `created:${thesis.id}`, kind: 'created', occurredAt: thesis.createdAt });
  }
  for (const pair of pairs) {
    items.push({ id: `review:${pair.session.id}`, kind: 'review', occurredAt: pair.revision.createdAt,
      session: copy(pair.session), revision: copy(pair.revision),
      changes: materialChanges(pair.revision.before, pair.revision.after) });
  }
  for (const score of scores) {
    items.push({ id: `score:${score.snapshot.id}`, kind: 'score', occurredAt: score.snapshot.createdAt!, score });
  }
  for (const decision of uniqueById(input.decisions, (record) => record.id)) {
    const parsed = parseLivingThesisDecision(decision);
    if (!parsed.ok || decision.thesisId !== thesis.id || decision.createdAt < thesis.createdAt) continue;
    const linked = decision.reviewSessionId ? bySessionId.get(decision.reviewSessionId) : undefined;
    if (decision.reviewSessionId && (!linked || decision.createdAt < linked.revision.createdAt)) continue;
    items.push({ id: `decision:${decision.id}`, kind: 'decision', occurredAt: decision.createdAt,
      decision: parsed.value, ...(linked ? { reviewReason: linked.session.workflow.reviewReason } : {}) });
  }
  if (thesis.lifecycle === 'archived' && thesis.archivedAt && isValidIsoTimestamp(thesis.archivedAt) &&
      thesis.archivedAt >= thesis.createdAt && !pairs.some(({ revision }) =>
        revision.before.lifecycle !== 'archived' && revision.after.lifecycle === 'archived' &&
        revision.after.archivedAt === thesis.archivedAt)) {
    items.push({ id: `archived:${thesis.id}:${thesis.archivedAt}`, kind: 'archived', occurredAt: thesis.archivedAt });
  }
  const kindOrder = { decision: 0, review: 1, score: 2, archived: 3, created: 4 };
  items.sort((left, right) => compareText(right.occurredAt, left.occurredAt) ||
    kindOrder[left.kind] - kindOrder[right.kind] || compareText(left.id, right.id));
  return { thesisId: thesis.id, thesis: copy(thesis), items, scores };
}

function isScopedReview({ session, revision }: LivingThesisHistoryCompletedReview, thesis: LivingThesis): boolean {
  return session.schemaVersion === 2 && session.workflow.status === 'completed' &&
    !!session.id.trim() && !!revision.id.trim() && session.thesisId === thesis.id && revision.thesisId === thesis.id &&
    session.revisionId === revision.id && revision.reviewSessionId === session.id &&
    session.workflow.baseline.id === thesis.id && revision.before.id === thesis.id && revision.after.id === thesis.id &&
    revision.before.createdAt === thesis.createdAt && revision.after.createdAt === thesis.createdAt &&
    session.scoreSnapshotId === revision.scoreSnapshotId &&
    isValidIsoTimestamp(revision.createdAt) && session.completedAt === revision.createdAt &&
    session.updatedAt === revision.createdAt && session.startedAt <= revision.createdAt &&
    revision.createdAt >= thesis.createdAt && revision.after.updatedAt === revision.createdAt &&
    revision.after.version === revision.before.version + 1 && revision.after.version <= thesis.version;
}

const fields = [
  ['entityName', 'Company or entity'], ['ticker', 'Ticker'], ['title', 'Thesis title'],
  ['theme', 'Theme'], ['summary', 'Summary'], ['bullCase', 'Bull case'], ['bearCase', 'Bear case'],
  ['lifecycle', 'Status'], ['conviction', 'Conviction'], ['riskLevel', 'Risk level'],
  ['reviewCadenceDays', 'Review cadence (days)'], ['nextReviewAt', 'Next review date']
] as const;

function materialChanges(before: LivingThesis, after: LivingThesis): LivingThesisHistoryChange[] {
  const changes: LivingThesisHistoryChange[] = [];
  for (const [field, label] of fields) addChange(changes, label, before[field], after[field]);
  childChanges(changes, 'Risk', before.risks, after.risks);
  childChanges(changes, 'Catalyst', before.catalysts, after.catalysts);
  return changes;
}

type Child = LivingThesisRisk | LivingThesisCatalyst;

function childChanges(changes: LivingThesisHistoryChange[], kind: string, before: readonly Child[], after: readonly Child[]): void {
  const previous = new Map(before.map((child) => [child.id, child]));
  const next = new Map(after.map((child) => [child.id, child]));
  const ids = [...new Set([...previous.keys(), ...next.keys()])].sort(compareText);
  for (const id of ids) {
    const old = previous.get(id);
    const current = next.get(id);
    const label = `${kind} “${(current ?? old)!.title.trim()}”`;
    if (!old || !current) {
      changes.push({ label, before: old ? childText(old) : null, after: current ? childText(current) : null });
      continue;
    }
    addChange(changes, `${label} · Title`, old.title, current.title);
    addChange(changes, `${label} · Details`, old.detail, current.detail);
    addChange(changes, `${label} · Status`, old.status, current.status);
    addChange(changes, `${label} · Severity`, 'severity' in old ? old.severity : undefined,
      'severity' in current ? current.severity : undefined);
  }
}

function childText(child: Child): string {
  return [child.title.trim(), child.detail?.trim(), `Status: ${child.status}`,
    ...('severity' in child ? [`Severity: ${child.severity}`] : [])].filter(Boolean).join('\n');
}

function addChange(changes: LivingThesisHistoryChange[], label: string, before: string | number | undefined,
  after: string | number | undefined): void {
  const previous = textValue(before);
  const next = textValue(after);
  if (previous !== next) changes.push({ label, before: previous, after: next });
}

function textValue(value: string | number | undefined): string | null {
  return value === undefined ? null : String(value).trim() || null;
}

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

function uniqueById<T>(items: readonly T[], id: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = id(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
