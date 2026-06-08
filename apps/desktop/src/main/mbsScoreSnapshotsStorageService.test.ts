import { describe, expect, it } from 'vitest';

import { createSqliteStorage } from '../storage/sqlite';
import { createMbsScoreSnapshotsStorageService } from './mbsScoreSnapshotsStorageService';

describe('createMbsScoreSnapshotsStorageService', () => {
  it('lists and saves MBS score snapshots through storage', async () => {
    const service = createMbsScoreSnapshotsStorageService(() =>
      createSqliteStorage()
    );

    expect(await service.list()).toEqual({ ok: true, value: [] });

    await expect(
      service.save({
        id: 'score_msft',
        ticker: 'msft',
        companyName: 'Microsoft',
        score: 80,
        maxScore: 100,
        percentage: 80,
        rating: 'strong',
        completedCriteria: 7,
        input: {
          businessQuality: 8,
          moat: 8,
          management: 8,
          balanceSheet: 8,
          growth: 8,
          valuation: 8,
          risk: 8
        },
        createdAt: '2026-05-24'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        id: 'score_msft',
        ticker: 'MSFT',
        companyName: 'Microsoft',
        score: 80,
        maxScore: 100,
        percentage: 80,
        rating: 'strong',
        completedCriteria: 7,
        input: {
          businessQuality: 8,
          moat: 8,
          management: 8,
          balanceSheet: 8,
          growth: 8,
          valuation: 8,
          risk: 8
        },
        createdAt: '2026-05-24'
      }
    });

    await expect(service.list()).resolves.toEqual({
      ok: true,
      value: [
        {
          id: 'score_msft',
          ticker: 'MSFT',
          companyName: 'Microsoft',
          score: 80,
          maxScore: 100,
          percentage: 80,
          rating: 'strong',
          completedCriteria: 7,
          input: {
            businessQuality: 8,
            moat: 8,
            management: 8,
            balanceSheet: 8,
            growth: 8,
            valuation: 8,
            risk: 8
          },
          createdAt: '2026-05-24'
        }
      ]
    });

    await service.close();
  });

  it('returns validation errors instead of writing incomplete snapshots', async () => {
    const service = createMbsScoreSnapshotsStorageService(() =>
      createSqliteStorage()
    );

    const result = await service.save({
      id: 'score_invalid',
      ticker: 'MSFT',
      score: 80,
      maxScore: 100,
      percentage: 80,
      rating: 'incomplete' as never,
      completedCriteria: 1,
      input: {
        businessQuality: 8
      }
    });

    expect(result.ok).toBe(false);
    await expect(service.list()).resolves.toEqual({ ok: true, value: [] });

    await service.close();
  });

  it('returns clear errors for storage failures', async () => {
    const service = createMbsScoreSnapshotsStorageService(async () => {
      throw new Error('storage unavailable');
    });

    await expect(service.list()).resolves.toEqual({
      ok: false,
      errors: ['storage unavailable']
    });
  });
});
