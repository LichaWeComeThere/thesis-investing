import type { MbsScoreSnapshot, Reminder, ThesisNote } from '@thesis-investing/core';

import type {
  DashboardSummariesStorageResult,
  DashboardSummary,
  DashboardSummaryLatestMbsScoreSnapshot
} from '../shared/dashboardSummariesStorage';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';

export type DashboardSummariesStorageFactory = () => Promise<SqliteStorage>;

export type DashboardSummariesStorageServiceOptions = {
  now?: () => Date;
};

export type DashboardSummariesStorageService = {
  close(): Promise<void>;
  get(): Promise<DashboardSummariesStorageResult<DashboardSummary>>;
};

export function createDashboardSummariesStorageService(
  createStorage: DashboardSummariesStorageFactory,
  options: DashboardSummariesStorageServiceOptions = {}
): DashboardSummariesStorageService {
  let storagePromise: Promise<SqliteStorage> | null = null;
  const now = options.now ?? (() => new Date());

  async function getStorage(): Promise<SqliteStorage> {
    storagePromise ??= createStorage().catch((error: unknown) => {
      storagePromise = null;
      throw error;
    });
    return storagePromise;
  }

  return {
    async close() {
      if (!storagePromise) {
        return;
      }

      try {
        const storage = await storagePromise;
        storage.close();
      } finally {
        storagePromise = null;
      }
    },
    async get() {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const generatedAt = now();
        const watchlistItems = storage.repositories.watchlistItems.list();
        const thesisNotes = storage.repositories.thesisNotes.list();
        const reminders = storage.repositories.reminders.list();
        const portfolioRankerItems =
          storage.repositories.portfolioRankerItems.list();
        const mbsScoreSnapshots =
          storage.repositories.mbsScoreSnapshots.list();

        return success(
          buildDashboardSummary({
            generatedAt,
            mbsScoreSnapshots,
            portfolioRankerItemsCount: portfolioRankerItems.length,
            reminders,
            thesisNotes,
            watchlistItemsCount: watchlistItems.length
          })
        );
      });
    }
  };
}

export function createSqliteDashboardSummariesStorageService(
  filename: string
): DashboardSummariesStorageService {
  return createDashboardSummariesStorageService(() =>
    createSqliteStorage({ filename })
  );
}

type DashboardSummaryInput = {
  generatedAt: Date;
  mbsScoreSnapshots: MbsScoreSnapshot[];
  portfolioRankerItemsCount: number;
  reminders: Reminder[];
  thesisNotes: ThesisNote[];
  watchlistItemsCount: number;
};

function buildDashboardSummary({
  generatedAt,
  mbsScoreSnapshots,
  portfolioRankerItemsCount,
  reminders,
  thesisNotes,
  watchlistItemsCount
}: DashboardSummaryInput): DashboardSummary {
  const today = toIsoDate(generatedAt);
  const completedReminders = reminders.filter(
    (reminder) => reminder.completedAt !== undefined
  ).length;

  return {
    activeThesisNotes: countThesisNotesByStatus(thesisNotes, 'active'),
    completedReminders,
    draftThesisNotes: countThesisNotesByStatus(thesisNotes, 'draft'),
    generatedAt: generatedAt.toISOString(),
    latestMbsScoreSnapshot: getLatestMbsScoreSnapshot(mbsScoreSnapshots),
    openReminders: reminders.length - completedReminders,
    overdueReminders: reminders.filter((reminder) =>
      isOpenReminderOverdue(reminder, today)
    ).length,
    totalMbsScoreSnapshots: mbsScoreSnapshots.length,
    totalPortfolioRankerItems: portfolioRankerItemsCount,
    totalReminders: reminders.length,
    totalThesisNotes: thesisNotes.length,
    totalWatchlistItems: watchlistItemsCount,
    watchThesisNotes: countThesisNotesByStatus(thesisNotes, 'watch')
  };
}

function countThesisNotesByStatus(
  thesisNotes: readonly ThesisNote[],
  status: ThesisNote['status']
): number {
  return thesisNotes.filter((thesisNote) => thesisNote.status === status).length;
}

function isOpenReminderOverdue(reminder: Reminder, today: string): boolean {
  return reminder.completedAt === undefined && reminder.dueDate < today;
}

function getLatestMbsScoreSnapshot(
  snapshots: readonly MbsScoreSnapshot[]
): DashboardSummaryLatestMbsScoreSnapshot | undefined {
  const [latestSnapshot] = [...snapshots].sort(compareMbsScoreSnapshots);

  if (!latestSnapshot) {
    return undefined;
  }

  return {
    companyName: latestSnapshot.companyName,
    createdAt: latestSnapshot.createdAt,
    id: latestSnapshot.id,
    maxScore: latestSnapshot.maxScore,
    percentage: latestSnapshot.percentage,
    rating: latestSnapshot.rating,
    score: latestSnapshot.score,
    ticker: latestSnapshot.ticker
  };
}

function compareMbsScoreSnapshots(
  left: MbsScoreSnapshot,
  right: MbsScoreSnapshot
): number {
  const leftDate = left.createdAt ?? '';
  const rightDate = right.createdAt ?? '';

  if (leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate);
  }

  return left.id.localeCompare(right.id);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function runStorageOperation<T>(
  operation: () => Promise<DashboardSummariesStorageResult<T>>
): Promise<DashboardSummariesStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return failure([
      error instanceof Error
        ? error.message
        : 'Unknown dashboard summaries storage error.'
    ]);
  }
}

function success<T>(value: T): DashboardSummariesStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): DashboardSummariesStorageResult<T> {
  return { ok: false, errors };
}
