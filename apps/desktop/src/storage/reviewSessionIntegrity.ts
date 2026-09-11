import { isDeepStrictEqual } from 'node:util';
import type { DatabaseSync } from 'node:sqlite';
import {
  getLivingThesisChildReferences,
  getLivingThesisReviewSessionChildReferences,
  normalizeLivingThesis,
  parseLivingThesisReviewSession,
  type LivingThesis,
  type LivingThesisChildReference,
  type LivingThesisReviewSession
} from '@thesis-investing/core';

export function sameReviewBaseline(left: LivingThesis, right: LivingThesis): boolean {
  const canonical = (thesis: LivingThesis) => JSON.parse(JSON.stringify(normalizeLivingThesis({
    ...thesis,
    risks: [...thesis.risks].sort((a, b) => a.id.localeCompare(b.id)),
    catalysts: [...thesis.catalysts].sort((a, b) => a.id.localeCompare(b.id))
  })));
  return isDeepStrictEqual(canonical(left), canonical(right));
}

export function reviewSessionParentErrors(session: LivingThesisReviewSession, parent: LivingThesis): string[] {
  const baseline = session.workflow.baseline;
  const errors: string[] = [];
  if (session.thesisId !== parent.id || baseline.version > parent.version ||
      (baseline.version === parent.version && !sameReviewBaseline(baseline, parent))) {
    errors.push('Review baseline must match its saved parent version or an earlier version.');
  }
  const current = new Map(getLivingThesisChildReferences(parent).map((child) => [child.id, child.kind]));
  if (getLivingThesisChildReferences(baseline).some((child) => current.get(child.id) !== child.kind)) {
    errors.push('Every baseline child must still belong to its saved parent with the same kind.');
  }
  return errors;
}

export function reviewChildOwnershipErrors(children: readonly LivingThesisChildReference[]): string[] {
  const owners = new Map<string, LivingThesisChildReference>();
  for (const child of children) {
    const previous = owners.get(child.id);
    if (previous && (previous.thesisId !== child.thesisId || previous.kind !== child.kind)) {
      return ['A risk/catalyst ID must have one parent and kind across saved theses and review drafts.'];
    }
    owners.set(child.id, child);
  }
  return [];
}

export function readReviewSessionRow(row: Record<string, unknown>): LivingThesisReviewSession {
  const parsed = parseLivingThesisReviewSession({
    id: row.id, thesisId: row.thesis_id, schemaVersion: row.schema_version,
    version: row.version, startedAt: row.started_at, updatedAt: row.updated_at,
    abandonedAt: row.abandoned_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    revisionId: row.revision_id ?? undefined,
    scoreSnapshotId: row.score_snapshot_id ?? undefined,
    workflow: JSON.parse(String(row.workflow_json)) as unknown
  });
  if (!parsed.ok || parsed.value.workflow.status !== row.status) {
    throw new Error('Stored review session is invalid.');
  }
  return parsed.value;
}

export function readStoredReviewChildReferences(database: DatabaseSync): LivingThesisChildReference[] {
  return database.prepare('SELECT * FROM living_thesis_review_sessions').all()
    .flatMap((row) => getLivingThesisReviewSessionChildReferences(readReviewSessionRow(row)));
}
