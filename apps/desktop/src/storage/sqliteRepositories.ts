import type { DatabaseSync } from "node:sqlite";

import {
  normalizeTickerSymbol,
  validateHolding,
  validateMbsScoreSnapshot,
  validatePortfolioRankerItem,
  validateReminder,
  validateThesisNote,
  validateWatchlistItem,
  type Holding,
  type ManualBusinessScoreInput,
  type MbsScoreSnapshot,
  type PortfolioRankerItem,
  type Reminder,
  type ThesisNote,
  type WatchlistItem
} from "@thesis-investing/core";

import type {
  HoldingRepository,
  LocalStorageRepositories,
  MbsScoreSnapshotRepository,
  PortfolioRankerItemRepository,
  ReminderRepository,
  RepositoryResult,
  ThesisNoteRepository,
  WatchlistItemRepository
} from "./repositories";
import { createSqliteLivingThesisRepository } from "./sqliteLivingThesisRepository";
import { createSqliteReviewSessionRepository } from "./sqliteReviewSessionRepository";

type SqlParam = string | number | null;
type SqlRow = Record<string, unknown>;

export function createSqliteRepositories(
  database: DatabaseSync
): LocalStorageRepositories {
  const livingTheses = createSqliteLivingThesisRepository(database);
  return {
    holdings: createHoldingRepository(database),
    watchlistItems: createWatchlistItemRepository(database),
    thesisNotes: createThesisNoteRepository(database),
    reminders: createReminderRepository(database),
    portfolioRankerItems: createPortfolioRankerItemRepository(database),
    mbsScoreSnapshots: createMbsScoreSnapshotRepository(database),
    livingTheses,
    reviewSessions: createSqliteReviewSessionRepository(database, livingTheses)
  };
}

function createHoldingRepository(database: DatabaseSync): HoldingRepository {
  return {
    create(holding) {
      const normalized = normalizeHolding(holding);
      const validation = validateHolding(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      database
        .prepare(
          `
            INSERT INTO holdings (
              id,
              portfolio_id,
              stock_id,
              ticker,
              company_name,
              shares,
              average_cost,
              currency,
              thesis_note_id,
              opened_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `
        )
        .run(
          normalized.id,
          normalized.portfolioId ?? null,
          normalized.stockId ?? null,
          normalized.ticker,
          normalized.companyName ?? null,
          normalized.shares,
          normalized.averageCost ?? null,
          normalized.currency ?? null,
          normalized.thesisNoteId ?? null,
          normalized.openedAt ?? null
        );

      return success(normalized);
    },
    getById(id) {
      return mapHolding(
        getOne(database, "SELECT * FROM holdings WHERE id = ?;", [id])
      );
    },
    list() {
      return getAll(database, "SELECT * FROM holdings ORDER BY id ASC;").map(
        mapRequiredHolding
      );
    },
    update(holding) {
      const normalized = normalizeHolding(holding);
      const validation = validateHolding(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      const result = database
        .prepare(
          `
            UPDATE holdings
            SET
              portfolio_id = ?,
              stock_id = ?,
              ticker = ?,
              company_name = ?,
              shares = ?,
              average_cost = ?,
              currency = ?,
              thesis_note_id = ?,
              opened_at = ?
            WHERE id = ?;
          `
        )
        .run(
          normalized.portfolioId ?? null,
          normalized.stockId ?? null,
          normalized.ticker,
          normalized.companyName ?? null,
          normalized.shares,
          normalized.averageCost ?? null,
          normalized.currency ?? null,
          normalized.thesisNoteId ?? null,
          normalized.openedAt ?? null,
          normalized.id
        );

      return result.changes > 0
        ? success(normalized)
        : failure(["Holding not found."]);
    },
    delete(id) {
      const result = database
        .prepare("DELETE FROM holdings WHERE id = ?;")
        .run(id);
      return result.changes > 0;
    }
  };
}

function createWatchlistItemRepository(
  database: DatabaseSync
): WatchlistItemRepository {
  return {
    create(item) {
      const normalized = normalizeWatchlistItem(item);
      const validation = validateWatchlistItem(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      database
        .prepare(
          `
            INSERT INTO watchlist_items (
              id,
              ticker,
              company_name,
              thesis_note_id,
              tags_json,
              note
            )
            VALUES (?, ?, ?, ?, ?, ?);
          `
        )
        .run(
          normalized.id,
          normalized.ticker,
          normalized.companyName ?? null,
          normalized.thesisNoteId ?? null,
          JSON.stringify(normalized.tags ?? []),
          normalized.note ?? null
        );

      return success(normalized);
    },
    getById(id) {
      return mapWatchlistItem(
        getOne(database, "SELECT * FROM watchlist_items WHERE id = ?;", [id])
      );
    },
    list() {
      return getAll(
        database,
        "SELECT * FROM watchlist_items ORDER BY id ASC;"
      ).map(mapRequiredWatchlistItem);
    },
    update(item) {
      const normalized = normalizeWatchlistItem(item);
      const validation = validateWatchlistItem(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      const result = database
        .prepare(
          `
            UPDATE watchlist_items
            SET
              ticker = ?,
              company_name = ?,
              thesis_note_id = ?,
              tags_json = ?,
              note = ?
            WHERE id = ?;
          `
        )
        .run(
          normalized.ticker,
          normalized.companyName ?? null,
          normalized.thesisNoteId ?? null,
          JSON.stringify(normalized.tags ?? []),
          normalized.note ?? null,
          normalized.id
        );

      return result.changes > 0
        ? success(normalized)
        : failure(["Watchlist item not found."]);
    },
    delete(id) {
      const result = database
        .prepare("DELETE FROM watchlist_items WHERE id = ?;")
        .run(id);
      return result.changes > 0;
    }
  };
}

function createThesisNoteRepository(database: DatabaseSync): ThesisNoteRepository {
  return {
    create(note) {
      const normalized = normalizeThesisNote(note);
      const validation = validateThesisNote(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      database
        .prepare(
          `
            INSERT INTO thesis_notes (
              id,
              title,
              body,
              status,
              ticker,
              conviction,
              created_at,
              updated_at,
              review_due_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
          `
        )
        .run(
          normalized.id,
          normalized.title,
          normalized.body,
          normalized.status,
          normalized.ticker ?? null,
          normalized.conviction ?? null,
          normalized.createdAt ?? null,
          normalized.updatedAt ?? null,
          normalized.reviewDueAt ?? null
        );

      return success(normalized);
    },
    getById(id) {
      return mapThesisNote(
        getOne(database, "SELECT * FROM thesis_notes WHERE id = ?;", [id])
      );
    },
    list() {
      return getAll(database, "SELECT * FROM thesis_notes ORDER BY id ASC;").map(
        mapRequiredThesisNote
      );
    },
    update(note) {
      const normalized = normalizeThesisNote(note);
      const validation = validateThesisNote(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      const result = database
        .prepare(
          `
            UPDATE thesis_notes
            SET
              title = ?,
              body = ?,
              status = ?,
              ticker = ?,
              conviction = ?,
              created_at = ?,
              updated_at = ?,
              review_due_at = ?
            WHERE id = ?;
          `
        )
        .run(
          normalized.title,
          normalized.body,
          normalized.status,
          normalized.ticker ?? null,
          normalized.conviction ?? null,
          normalized.createdAt ?? null,
          normalized.updatedAt ?? null,
          normalized.reviewDueAt ?? null,
          normalized.id
        );

      return result.changes > 0
        ? success(normalized)
        : failure(["Thesis note not found."]);
    },
    delete(id) {
      const result = database
        .prepare("DELETE FROM thesis_notes WHERE id = ?;")
        .run(id);
      return result.changes > 0;
    }
  };
}

function createReminderRepository(database: DatabaseSync): ReminderRepository {
  return {
    create(reminder) {
      const normalized = normalizeReminder(reminder);
      const validation = validateReminder(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      database
        .prepare(
          `
            INSERT INTO reminders (
              id,
              title,
              due_date,
              type,
              ticker,
              note,
              completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?);
          `
        )
        .run(
          normalized.id,
          normalized.title,
          normalized.dueDate,
          normalized.type,
          normalized.ticker ?? null,
          normalized.note ?? null,
          normalized.completedAt ?? null
        );

      return success(normalized);
    },
    getById(id) {
      return mapReminder(
        getOne(database, "SELECT * FROM reminders WHERE id = ?;", [id])
      );
    },
    list() {
      return getAll(database, "SELECT * FROM reminders ORDER BY id ASC;").map(
        mapRequiredReminder
      );
    },
    update(reminder) {
      const normalized = normalizeReminder(reminder);
      const validation = validateReminder(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      const result = database
        .prepare(
          `
            UPDATE reminders
            SET
              title = ?,
              due_date = ?,
              type = ?,
              ticker = ?,
              note = ?,
              completed_at = ?
            WHERE id = ?;
          `
        )
        .run(
          normalized.title,
          normalized.dueDate,
          normalized.type,
          normalized.ticker ?? null,
          normalized.note ?? null,
          normalized.completedAt ?? null,
          normalized.id
        );

      return result.changes > 0
        ? success(normalized)
        : failure(["Reminder not found."]);
    },
    delete(id) {
      const result = database
        .prepare("DELETE FROM reminders WHERE id = ?;")
        .run(id);
      return result.changes > 0;
    }
  };
}

function createPortfolioRankerItemRepository(
  database: DatabaseSync
): PortfolioRankerItemRepository {
  return {
    create(item) {
      const normalized = normalizePortfolioRankerItem(item);
      const validation = validatePortfolioRankerItem(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      database
        .prepare(
          `
            INSERT INTO portfolio_ranker_items (
              id,
              ticker,
              company_name,
              manual_score,
              notes,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?);
          `
        )
        .run(
          normalized.id,
          normalized.ticker,
          normalized.companyName ?? null,
          normalized.manualScore ?? null,
          normalized.notes ?? null,
          normalized.createdAt ?? null,
          normalized.updatedAt ?? null
        );

      return success(normalized);
    },
    getById(id) {
      return mapPortfolioRankerItem(
        getOne(
          database,
          "SELECT * FROM portfolio_ranker_items WHERE id = ?;",
          [id]
        )
      );
    },
    list() {
      return getAll(
        database,
        "SELECT * FROM portfolio_ranker_items ORDER BY id ASC;"
      ).map(mapRequiredPortfolioRankerItem);
    },
    update(item) {
      const normalized = normalizePortfolioRankerItem(item);
      const validation = validatePortfolioRankerItem(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      const result = database
        .prepare(
          `
            UPDATE portfolio_ranker_items
            SET
              ticker = ?,
              company_name = ?,
              manual_score = ?,
              notes = ?,
              created_at = ?,
              updated_at = ?
            WHERE id = ?;
          `
        )
        .run(
          normalized.ticker,
          normalized.companyName ?? null,
          normalized.manualScore ?? null,
          normalized.notes ?? null,
          normalized.createdAt ?? null,
          normalized.updatedAt ?? null,
          normalized.id
        );

      return result.changes > 0
        ? success(normalized)
        : failure(["Portfolio ranker item not found."]);
    },
    delete(id) {
      const result = database
        .prepare("DELETE FROM portfolio_ranker_items WHERE id = ?;")
        .run(id);
      return result.changes > 0;
    }
  };
}

function createMbsScoreSnapshotRepository(
  database: DatabaseSync
): MbsScoreSnapshotRepository {
  return {
    create(snapshot) {
      const normalized = normalizeMbsScoreSnapshot(snapshot);
      const validation = validateMbsScoreSnapshot(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      database
        .prepare(
          `
            INSERT INTO mbs_score_snapshots (
              id,
              thesis_id,
              ticker,
              company_name,
              score,
              max_score,
              percentage,
              rating,
              completed_criteria,
              input_json,
              notes,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `
        )
        .run(
          normalized.id,
          normalized.thesisId ?? null,
          normalized.ticker ?? null,
          normalized.companyName ?? null,
          normalized.score,
          normalized.maxScore,
          normalized.percentage,
          normalized.rating,
          normalized.completedCriteria,
          JSON.stringify(normalized.input),
          normalized.notes ?? null,
          normalized.createdAt ?? null
        );

      return success(normalized);
    },
    getById(id) {
      return mapMbsScoreSnapshot(
        getOne(database, "SELECT * FROM mbs_score_snapshots WHERE id = ?;", [
          id
        ])
      );
    },
    list() {
      return getAll(
        database,
        "SELECT * FROM mbs_score_snapshots ORDER BY created_at DESC, id ASC;"
      ).map(mapRequiredMbsScoreSnapshot);
    }
  };
}

function normalizeHolding(holding: Holding): Holding {
  return {
    ...holding,
    ticker: normalizeTickerSymbol(holding.ticker)
  };
}

function normalizePortfolioRankerItem(
  item: PortfolioRankerItem
): PortfolioRankerItem {
  return {
    ...item,
    ticker: normalizeTickerSymbol(item.ticker)
  };
}

function normalizeWatchlistItem(item: WatchlistItem): WatchlistItem {
  return {
    ...item,
    ticker: normalizeTickerSymbol(item.ticker),
    tags: item.tags ?? []
  };
}

function normalizeThesisNote(note: ThesisNote): ThesisNote {
  return {
    ...note,
    ticker: note.ticker ? normalizeTickerSymbol(note.ticker) : undefined
  };
}

function normalizeReminder(reminder: Reminder): Reminder {
  return {
    ...reminder,
    ticker: reminder.ticker
      ? normalizeTickerSymbol(reminder.ticker)
      : undefined
  };
}

function normalizeMbsScoreSnapshot(
  snapshot: MbsScoreSnapshot
): MbsScoreSnapshot {
  return {
    ...snapshot,
    ticker: snapshot.ticker
      ? normalizeTickerSymbol(snapshot.ticker)
      : undefined
  };
}

function success<T>(value: T): RepositoryResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): RepositoryResult<T> {
  return { ok: false, errors };
}

function getOne(
  database: DatabaseSync,
  sql: string,
  params: SqlParam[] = []
): SqlRow | undefined {
  return database.prepare(sql).get(...params) as SqlRow | undefined;
}

function getAll(
  database: DatabaseSync,
  sql: string,
  params: SqlParam[] = []
): SqlRow[] {
  return database.prepare(sql).all(...params) as SqlRow[];
}

function mapHolding(row: SqlRow | undefined): Holding | undefined {
  return row ? mapRequiredHolding(row) : undefined;
}

function mapRequiredHolding(row: SqlRow): Holding {
  return withoutUndefined({
    id: requiredText(row, "id"),
    portfolioId: optionalText(row, "portfolio_id"),
    stockId: optionalText(row, "stock_id"),
    ticker: requiredText(row, "ticker"),
    companyName: optionalText(row, "company_name"),
    shares: requiredNumber(row, "shares"),
    averageCost: optionalNumber(row, "average_cost"),
    currency: optionalText(row, "currency"),
    thesisNoteId: optionalText(row, "thesis_note_id"),
    openedAt: optionalText(row, "opened_at")
  });
}

function mapWatchlistItem(row: SqlRow | undefined): WatchlistItem | undefined {
  return row ? mapRequiredWatchlistItem(row) : undefined;
}

function mapRequiredWatchlistItem(row: SqlRow): WatchlistItem {
  return withoutUndefined({
    id: requiredText(row, "id"),
    ticker: requiredText(row, "ticker"),
    companyName: optionalText(row, "company_name"),
    thesisNoteId: optionalText(row, "thesis_note_id"),
    tags: parseStringArray(optionalText(row, "tags_json")),
    note: optionalText(row, "note")
  });
}

function mapThesisNote(row: SqlRow | undefined): ThesisNote | undefined {
  return row ? mapRequiredThesisNote(row) : undefined;
}

function mapRequiredThesisNote(row: SqlRow): ThesisNote {
  return withoutUndefined({
    id: requiredText(row, "id"),
    title: requiredText(row, "title"),
    body: requiredText(row, "body"),
    status: requiredText(row, "status") as ThesisNote["status"],
    ticker: optionalText(row, "ticker"),
    conviction: optionalText(row, "conviction") as ThesisNote["conviction"],
    createdAt: optionalText(row, "created_at"),
    updatedAt: optionalText(row, "updated_at"),
    reviewDueAt: optionalText(row, "review_due_at")
  });
}

function mapReminder(row: SqlRow | undefined): Reminder | undefined {
  return row ? mapRequiredReminder(row) : undefined;
}

function mapRequiredReminder(row: SqlRow): Reminder {
  return withoutUndefined({
    id: requiredText(row, "id"),
    title: requiredText(row, "title"),
    dueDate: requiredText(row, "due_date"),
    type: requiredText(row, "type") as Reminder["type"],
    ticker: optionalText(row, "ticker"),
    note: optionalText(row, "note"),
    completedAt: optionalText(row, "completed_at")
  });
}

function mapPortfolioRankerItem(
  row: SqlRow | undefined
): PortfolioRankerItem | undefined {
  return row ? mapRequiredPortfolioRankerItem(row) : undefined;
}

function mapRequiredPortfolioRankerItem(row: SqlRow): PortfolioRankerItem {
  return withoutUndefined({
    id: requiredText(row, "id"),
    ticker: requiredText(row, "ticker"),
    companyName: optionalText(row, "company_name"),
    manualScore: optionalNumber(row, "manual_score"),
    notes: optionalText(row, "notes"),
    createdAt: optionalText(row, "created_at"),
    updatedAt: optionalText(row, "updated_at")
  });
}

function mapMbsScoreSnapshot(
  row: SqlRow | undefined
): MbsScoreSnapshot | undefined {
  return row ? mapRequiredMbsScoreSnapshot(row) : undefined;
}

function mapRequiredMbsScoreSnapshot(row: SqlRow): MbsScoreSnapshot {
  return withoutUndefined({
    id: requiredText(row, "id"),
    thesisId: optionalText(row, "thesis_id"),
    ticker: optionalText(row, "ticker"),
    companyName: optionalText(row, "company_name"),
    score: requiredNumber(row, "score"),
    maxScore: requiredNumber(row, "max_score"),
    percentage: requiredNumber(row, "percentage"),
    rating: requiredText(row, "rating") as MbsScoreSnapshot["rating"],
    completedCriteria: requiredNumber(row, "completed_criteria"),
    input: parseMbsScoreInput(requiredText(row, "input_json")),
    notes: optionalText(row, "notes"),
    createdAt: optionalText(row, "created_at")
  });
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, propertyValue]) => propertyValue !== undefined
    )
  ) as T;
}

function requiredText(row: SqlRow, key: string): string {
  const value = optionalText(row, key);

  if (!value) {
    throw new Error(`Expected ${key} to be a non-empty text value.`);
  }

  return value;
}

function optionalText(row: SqlRow, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requiredNumber(row: SqlRow, key: string): number {
  const value = optionalNumber(row, key);

  if (value === undefined) {
    throw new Error(`Expected ${key} to be a number.`);
  }

  return value;
}

function optionalNumber(row: SqlRow, key: string): number | undefined {
  const value = row[key];
  return typeof value === "number" ? value : undefined;
}

function parseStringArray(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

function parseMbsScoreInput(value: string): ManualBusinessScoreInput {
  const parsed: unknown = JSON.parse(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed as ManualBusinessScoreInput;
}
