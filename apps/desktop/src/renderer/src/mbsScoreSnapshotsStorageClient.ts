import {
  createId,
  type ManualBusinessScoreOutput,
  type MbsScoreSnapshot
} from '@thesis-investing/core';
import type { MbsScoreSnapshotsStorageApi } from '../../shared/mbsScoreSnapshotsStorage';
import type { ThesisInvestingApi } from '../../shared/watchlistStorage';

declare global {
  interface Window {
    thesisInvesting?: ThesisInvestingApi;
  }
}

export type MbsScoreSnapshotsStorageClient = MbsScoreSnapshotsStorageApi;

export type MbsScoreSnapshotSource = {
  companyName?: string;
  thesisId?: string;
  ticker?: string;
};

export function getDefaultMbsScoreSnapshotsStorageClient(): MbsScoreSnapshotsStorageClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.thesisInvesting?.mbsScoreSnapshots ?? null;
}

export function buildMbsScoreSnapshot(
  output: ManualBusinessScoreOutput,
  createdAt: string,
  source: MbsScoreSnapshotSource = {}
): MbsScoreSnapshot | null {
  if (
    output.rating === 'incomplete' ||
    output.missingCriteria.length > 0 ||
    output.errors.length > 0
  ) {
    return null;
  }

  const ticker = source.ticker?.trim();
  const companyName = source.companyName?.trim();
  const notes = output.input.notes?.trim();

  return {
    id: createId('score', [
      source.thesisId ?? ticker ?? 'manual',
      createdAt,
      output.score
    ]),
    thesisId: source.thesisId,
    ticker: ticker || undefined,
    companyName: companyName || undefined,
    score: output.score,
    maxScore: output.maxScore,
    percentage: output.percentage,
    rating: output.rating,
    completedCriteria: output.completedCriteria,
    input: output.input,
    notes: notes || undefined,
    createdAt: createdAt.slice(0, 10)
  };
}
