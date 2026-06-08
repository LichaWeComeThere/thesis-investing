import { describe, expect, it } from 'vitest';

import { createSqliteStorage } from '../storage/sqlite';
import { createDashboardSummariesStorageService } from './dashboardSummariesStorageService';

describe('createDashboardSummariesStorageService', () => {
  it('returns zero summary values for an empty local database', async () => {
    const service = createDashboardSummariesStorageService(
      () => createSqliteStorage(),
      { now: () => new Date('2026-06-08T12:00:00.000Z') }
    );

    await expect(service.get()).resolves.toEqual({
      ok: true,
      value: {
        activeThesisNotes: 0,
        completedReminders: 0,
        draftThesisNotes: 0,
        generatedAt: '2026-06-08T12:00:00.000Z',
        latestMbsScoreSnapshot: undefined,
        openReminders: 0,
        overdueReminders: 0,
        totalMbsScoreSnapshots: 0,
        totalPortfolioRankerItems: 0,
        totalReminders: 0,
        totalThesisNotes: 0,
        totalWatchlistItems: 0,
        watchThesisNotes: 0
      }
    });

    await service.close();
  });

  it('summarizes persisted workflow repositories without mutating them', async () => {
    const storage = await createSqliteStorage();
    const service = createDashboardSummariesStorageService(
      () => Promise.resolve(storage),
      { now: () => new Date('2026-06-08T12:00:00.000Z') }
    );

    storage.repositories.watchlistItems.create({
      id: 'watchlist_msft',
      ticker: 'MSFT'
    });
    storage.repositories.thesisNotes.create({
      body: 'Active local thesis.',
      id: 'thesis_active',
      status: 'active',
      title: 'Active thesis'
    });
    storage.repositories.thesisNotes.create({
      body: 'Draft local thesis.',
      id: 'thesis_draft',
      status: 'draft',
      title: 'Draft thesis'
    });
    storage.repositories.thesisNotes.create({
      body: 'Watch local thesis.',
      id: 'thesis_watch',
      status: 'watch',
      title: 'Watch thesis'
    });
    storage.repositories.reminders.create({
      dueDate: '2026-06-01',
      id: 'reminder_overdue',
      title: 'Overdue reminder',
      type: 'thesis-review'
    });
    storage.repositories.reminders.create({
      completedAt: '2026-06-07',
      dueDate: '2026-06-07',
      id: 'reminder_completed',
      title: 'Completed reminder',
      type: 'custom'
    });
    storage.repositories.portfolioRankerItems.create({
      id: 'ranker_msft',
      manualScore: 82,
      ticker: 'MSFT'
    });
    storage.repositories.mbsScoreSnapshots.create({
      completedCriteria: 7,
      createdAt: '2026-06-01',
      id: 'score_old',
      input: {
        balanceSheet: 8,
        businessQuality: 8,
        growth: 8,
        management: 8,
        moat: 8,
        risk: 8,
        valuation: 8
      },
      maxScore: 100,
      percentage: 80,
      rating: 'strong',
      score: 80
    });
    storage.repositories.mbsScoreSnapshots.create({
      companyName: 'NVIDIA',
      completedCriteria: 7,
      createdAt: '2026-06-08',
      id: 'score_latest',
      input: {
        balanceSheet: 7,
        businessQuality: 9,
        growth: 8,
        management: 8,
        moat: 8,
        risk: 7,
        valuation: 6
      },
      maxScore: 100,
      percentage: 76.9,
      rating: 'strong',
      score: 76.9,
      ticker: 'NVDA'
    });

    await expect(service.get()).resolves.toEqual({
      ok: true,
      value: {
        activeThesisNotes: 1,
        completedReminders: 1,
        draftThesisNotes: 1,
        generatedAt: '2026-06-08T12:00:00.000Z',
        latestMbsScoreSnapshot: {
          companyName: 'NVIDIA',
          createdAt: '2026-06-08',
          id: 'score_latest',
          maxScore: 100,
          percentage: 76.9,
          rating: 'strong',
          score: 76.9,
          ticker: 'NVDA'
        },
        openReminders: 1,
        overdueReminders: 1,
        totalMbsScoreSnapshots: 2,
        totalPortfolioRankerItems: 1,
        totalReminders: 2,
        totalThesisNotes: 3,
        totalWatchlistItems: 1,
        watchThesisNotes: 1
      }
    });
    expect(storage.repositories.mbsScoreSnapshots.list()).toHaveLength(2);
    expect(storage.repositories.watchlistItems.list()).toHaveLength(1);

    await service.close();
  });

  it('returns clear errors for storage failures', async () => {
    const service = createDashboardSummariesStorageService(async () => {
      throw new Error('dashboard summary storage unavailable');
    });

    await expect(service.get()).resolves.toEqual({
      ok: false,
      errors: ['dashboard summary storage unavailable']
    });
  });
});
