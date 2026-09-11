import type {
  EntityId,
  Holding,
  LivingThesis,
  LivingThesisReviewSession,
  LivingThesisRevision,
  MbsScoreSnapshot,
  PortfolioRankerItem,
  Reminder,
  ThesisNote,
  WatchlistItem
} from "@thesis-investing/core";

export type RepositoryResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export interface HoldingRepository {
  create(holding: Holding): RepositoryResult<Holding>;
  getById(id: EntityId): Holding | undefined;
  list(): Holding[];
  update(holding: Holding): RepositoryResult<Holding>;
  delete(id: EntityId): boolean;
}

export interface WatchlistItemRepository {
  create(item: WatchlistItem): RepositoryResult<WatchlistItem>;
  getById(id: EntityId): WatchlistItem | undefined;
  list(): WatchlistItem[];
  update(item: WatchlistItem): RepositoryResult<WatchlistItem>;
  delete(id: EntityId): boolean;
}

export interface ThesisNoteRepository {
  create(note: ThesisNote): RepositoryResult<ThesisNote>;
  getById(id: EntityId): ThesisNote | undefined;
  list(): ThesisNote[];
  update(note: ThesisNote): RepositoryResult<ThesisNote>;
  delete(id: EntityId): boolean;
}

export interface ReminderRepository {
  create(reminder: Reminder): RepositoryResult<Reminder>;
  getById(id: EntityId): Reminder | undefined;
  list(): Reminder[];
  update(reminder: Reminder): RepositoryResult<Reminder>;
  delete(id: EntityId): boolean;
}

export interface PortfolioRankerItemRepository {
  create(item: PortfolioRankerItem): RepositoryResult<PortfolioRankerItem>;
  getById(id: EntityId): PortfolioRankerItem | undefined;
  list(): PortfolioRankerItem[];
  update(item: PortfolioRankerItem): RepositoryResult<PortfolioRankerItem>;
  delete(id: EntityId): boolean;
}

export interface MbsScoreSnapshotRepository {
  create(snapshot: MbsScoreSnapshot): RepositoryResult<MbsScoreSnapshot>;
  getById(id: EntityId): MbsScoreSnapshot | undefined;
  list(): MbsScoreSnapshot[];
}

export interface LivingThesisRepository {
  create(thesis: LivingThesis): RepositoryResult<LivingThesis>;
  /** Append a backup aggregate with its saved version; never overwrite existing IDs. */
  restore(thesis: LivingThesis): RepositoryResult<LivingThesis>;
  getById(id: EntityId): LivingThesis | undefined;
  list(): LivingThesis[];
  update(
    thesis: LivingThesis,
    expectedVersion: number
  ): RepositoryResult<LivingThesis>;
}

export interface LivingThesisReviewSessionRepository {
  create(session: LivingThesisReviewSession): RepositoryResult<LivingThesisReviewSession>;
  restore(session: LivingThesisReviewSession): RepositoryResult<LivingThesisReviewSession>;
  getById(id: EntityId): LivingThesisReviewSession | undefined;
  getInProgressByThesisId(thesisId: EntityId): LivingThesisReviewSession | undefined;
  list(thesisId?: EntityId): LivingThesisReviewSession[];
  update(session: LivingThesisReviewSession, expectedVersion: number): RepositoryResult<LivingThesisReviewSession>;
  /** Only called inside the enclosing completion transaction. */
  complete(session: LivingThesisReviewSession, expectedVersion: number): RepositoryResult<LivingThesisReviewSession>;
}

export interface LivingThesisRevisionRepository {
  create(revision: LivingThesisRevision): RepositoryResult<LivingThesisRevision>;
  restore(revision: LivingThesisRevision): RepositoryResult<LivingThesisRevision>;
  getById(id: EntityId): LivingThesisRevision | undefined;
  list(thesisId?: EntityId): LivingThesisRevision[];
}

export interface LocalStorageRepositories {
  holdings: HoldingRepository;
  watchlistItems: WatchlistItemRepository;
  thesisNotes: ThesisNoteRepository;
  reminders: ReminderRepository;
  portfolioRankerItems: PortfolioRankerItemRepository;
  mbsScoreSnapshots: MbsScoreSnapshotRepository;
  livingTheses: LivingThesisRepository;
  reviewSessions: LivingThesisReviewSessionRepository;
  thesisRevisions: LivingThesisRevisionRepository;
}
