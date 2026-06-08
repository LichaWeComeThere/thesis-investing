import type { MbsScoreSnapshot } from '@thesis-investing/core';

export const dashboardSummariesStorageChannels = {
  get: 'dashboard-summaries:get'
} as const;

export type DashboardSummaryLatestMbsScoreSnapshot = Pick<
  MbsScoreSnapshot,
  | 'companyName'
  | 'createdAt'
  | 'id'
  | 'maxScore'
  | 'percentage'
  | 'rating'
  | 'score'
  | 'ticker'
>;

export type DashboardSummary = {
  activeThesisNotes: number;
  completedReminders: number;
  draftThesisNotes: number;
  generatedAt: string;
  latestMbsScoreSnapshot?: DashboardSummaryLatestMbsScoreSnapshot;
  openReminders: number;
  overdueReminders: number;
  totalMbsScoreSnapshots: number;
  totalPortfolioRankerItems: number;
  totalReminders: number;
  totalThesisNotes: number;
  totalWatchlistItems: number;
  watchThesisNotes: number;
};

export type DashboardSummariesStorageResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type DashboardSummariesStorageApi = {
  get(): Promise<DashboardSummariesStorageResult<DashboardSummary>>;
};
