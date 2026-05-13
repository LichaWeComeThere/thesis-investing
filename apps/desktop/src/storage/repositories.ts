import type {
  EntityId,
  Holding,
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

export interface LocalStorageRepositories {
  holdings: HoldingRepository;
  watchlistItems: WatchlistItemRepository;
  thesisNotes: ThesisNoteRepository;
  reminders: ReminderRepository;
}
