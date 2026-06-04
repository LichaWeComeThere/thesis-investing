import { calculateMbsScore } from '@thesis-investing/core';
import { describe, expect, it } from 'vitest';

import { buildMbsScoreSnapshot } from './mbsScoreSnapshotsStorageClient';

describe('mbsScoreSnapshotsStorageClient', () => {
  it('builds a persisted snapshot from a completed MBS score output', () => {
    const output = calculateMbsScore({
      businessQuality: 8,
      moat: 8,
      management: 8,
      balanceSheet: 8,
      growth: 8,
      valuation: 8,
      risk: 8,
      notes: 'Durable business.'
    });

    expect(
      buildMbsScoreSnapshot(output, '2026-05-24T12:00:00.000Z', {
        companyName: 'Microsoft',
        thesisId: 'thesis-msft',
        ticker: 'msft'
      })
    ).toMatchObject({
      thesisId: 'thesis-msft',
      ticker: 'msft',
      companyName: 'Microsoft',
      score: 80,
      maxScore: 100,
      percentage: 80,
      rating: 'strong',
      completedCriteria: 7,
      notes: 'Durable business.',
      createdAt: '2026-05-24'
    });
  });

  it('does not build snapshots for incomplete score output', () => {
    const output = calculateMbsScore({
      businessQuality: 8
    });

    expect(
      buildMbsScoreSnapshot(output, '2026-05-24T12:00:00.000Z')
    ).toBeNull();
  });
});
