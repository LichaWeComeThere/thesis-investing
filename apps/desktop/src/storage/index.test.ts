import type { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { runMigrations } from "./schema";
import { createSqliteDatabase, createSqliteStorage } from "./sqlite";

describe("SQLite local storage", () => {
  it("creates the repository boundary through createSqliteStorage", async () => {
    const storage = await createSqliteStorage();

    expect(Object.keys(storage.repositories).sort()).toEqual([
      "holdings",
      "mbsScoreSnapshots",
      "portfolioRankerItems",
      "reminders",
      "thesisNotes",
      "watchlistItems"
    ]);

    storage.close();
  });

  it("runs migrations and creates local tables", async () => {
    const database = await createSqliteDatabase();

    runMigrations(database);

    expect(readTableNames(database)).toEqual([
      "holdings",
      "mbs_score_snapshots",
      "portfolio_ranker_items",
      "reminders",
      "schema_migrations",
      "thesis_notes",
      "watchlist_items"
    ]);
    expect(readAppliedMigrationVersions(database)).toEqual([1, 2, 3]);

    database.close();
  });

  it("creates, reads, updates, lists, and deletes holdings", async () => {
    const storage = await createSqliteStorage();
    const holding = {
      id: "holding_aapl",
      ticker: "aapl",
      shares: 10,
      averageCost: 175.25,
      currency: "USD",
      openedAt: "2026-01-15"
    };

    expect(storage.repositories.holdings.create(holding)).toEqual({
      ok: true,
      value: {
        ...holding,
        ticker: "AAPL"
      }
    });
    expect(storage.repositories.holdings.getById("holding_aapl")).toEqual({
      ...holding,
      ticker: "AAPL"
    });

    expect(
      storage.repositories.holdings.update({
        ...holding,
        ticker: "aapl",
        shares: 12
      })
    ).toEqual({
      ok: true,
      value: {
        ...holding,
        ticker: "AAPL",
        shares: 12
      }
    });
    expect(storage.repositories.holdings.list()).toHaveLength(1);
    expect(storage.repositories.holdings.delete("holding_aapl")).toBe(true);
    expect(storage.repositories.holdings.getById("holding_aapl")).toBeUndefined();

    storage.close();
  });

  it("rejects invalid holdings before writing to SQLite", async () => {
    const storage = await createSqliteStorage();

    const result = storage.repositories.holdings.create({
      id: "holding_invalid",
      ticker: "AAPL",
      shares: 0
    });

    expect(result.ok).toBe(false);
    expect(storage.repositories.holdings.list()).toEqual([]);

    storage.close();
  });

  it("stores watchlist items, thesis notes, and reminders through repositories", async () => {
    const storage = await createSqliteStorage();

    expect(
      storage.repositories.watchlistItems.create({
        id: "watchlist_msft",
        ticker: "msft",
        tags: ["quality", "software"],
        note: "Track offline only."
      })
    ).toEqual({
      ok: true,
      value: {
        id: "watchlist_msft",
        ticker: "MSFT",
        tags: ["quality", "software"],
        note: "Track offline only."
      }
    });

    expect(
      storage.repositories.thesisNotes.create({
        id: "thesis_msft",
        title: "Durable business thesis",
        body: "Placeholder thesis text for offline persistence.",
        status: "active",
        ticker: "msft",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02"
      })
    ).toEqual({
      ok: true,
      value: {
        id: "thesis_msft",
        title: "Durable business thesis",
        body: "Placeholder thesis text for offline persistence.",
        status: "active",
        ticker: "MSFT",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02"
      }
    });

    expect(
      storage.repositories.reminders.create({
        id: "reminder_msft",
        title: "Review thesis",
        dueDate: "2026-04-25",
        type: "thesis-review",
        ticker: "msft"
      })
    ).toEqual({
      ok: true,
      value: {
        id: "reminder_msft",
        title: "Review thesis",
        dueDate: "2026-04-25",
        type: "thesis-review",
        ticker: "MSFT"
      }
    });

    expect(
      storage.repositories.watchlistItems.getById("watchlist_msft")?.tags
    ).toEqual(["quality", "software"]);
    expect(
      storage.repositories.thesisNotes.getById("thesis_msft")?.ticker
    ).toBe("MSFT");
    expect(storage.repositories.reminders.getById("reminder_msft")?.ticker).toBe(
      "MSFT"
    );

    storage.close();
  });

  it("creates, reads, updates, lists, and deletes portfolio ranker items", async () => {
    const storage = await createSqliteStorage();

    const create = storage.repositories.portfolioRankerItems.create({
      id: "portfolio-ranker_msft",
      ticker: "msft",
      companyName: "Microsoft",
      manualScore: 82,
      notes: "Durable software franchise."
    });

    expect(create).toEqual({
      ok: true,
      value: {
        id: "portfolio-ranker_msft",
        ticker: "MSFT",
        companyName: "Microsoft",
        manualScore: 82,
        notes: "Durable software franchise."
      }
    });

    expect(
      storage.repositories.portfolioRankerItems.getById("portfolio-ranker_msft")
    ).toEqual({
      id: "portfolio-ranker_msft",
      ticker: "MSFT",
      companyName: "Microsoft",
      manualScore: 82,
      notes: "Durable software franchise."
    });

    expect(
      storage.repositories.portfolioRankerItems.update({
        id: "portfolio-ranker_msft",
        ticker: "msft",
        companyName: "Microsoft",
        manualScore: 91,
        notes: "Raised conviction after research review."
      })
    ).toEqual({
      ok: true,
      value: {
        id: "portfolio-ranker_msft",
        ticker: "MSFT",
        companyName: "Microsoft",
        manualScore: 91,
        notes: "Raised conviction after research review."
      }
    });

    expect(storage.repositories.portfolioRankerItems.list()).toHaveLength(1);

    expect(
      storage.repositories.portfolioRankerItems.delete("portfolio-ranker_msft")
    ).toBe(true);
    expect(
      storage.repositories.portfolioRankerItems.getById("portfolio-ranker_msft")
    ).toBeUndefined();
    expect(storage.repositories.portfolioRankerItems.list()).toEqual([]);

    storage.close();
  });

  it("rejects invalid portfolio ranker items before writing to SQLite", async () => {
    const storage = await createSqliteStorage();

    const result = storage.repositories.portfolioRankerItems.create({
      id: "portfolio-ranker_invalid",
      ticker: "bad ticker",
      manualScore: 150
    });

    expect(result.ok).toBe(false);
    expect(storage.repositories.portfolioRankerItems.list()).toEqual([]);

    storage.close();
  });

  it("persists portfolio ranker items without an optional score", async () => {
    const storage = await createSqliteStorage();

    expect(
      storage.repositories.portfolioRankerItems.create({
        id: "portfolio-ranker_aapl",
        ticker: "AAPL"
      })
    ).toEqual({
      ok: true,
      value: {
        id: "portfolio-ranker_aapl",
        ticker: "AAPL"
      }
    });

    expect(
      storage.repositories.portfolioRankerItems.getById("portfolio-ranker_aapl")
    ).toEqual({
      id: "portfolio-ranker_aapl",
      ticker: "AAPL"
    });

    storage.close();
  });

  it("creates, reads, and lists MBS score snapshots", async () => {
    const storage = await createSqliteStorage();
    const snapshot = {
      id: "score_msft",
      ticker: "msft",
      companyName: "Microsoft",
      score: 80,
      maxScore: 100,
      percentage: 80,
      rating: "strong" as const,
      completedCriteria: 7,
      input: {
        businessQuality: 8,
        moat: 8,
        management: 8,
        balanceSheet: 8,
        growth: 8,
        valuation: 8,
        risk: 8,
        notes: "Durable software franchise."
      },
      notes: "Durable software franchise.",
      createdAt: "2026-05-24"
    };

    expect(storage.repositories.mbsScoreSnapshots.create(snapshot)).toEqual({
      ok: true,
      value: {
        ...snapshot,
        ticker: "MSFT"
      }
    });

    expect(storage.repositories.mbsScoreSnapshots.getById("score_msft")).toEqual({
      ...snapshot,
      ticker: "MSFT"
    });
    expect(storage.repositories.mbsScoreSnapshots.list()).toEqual([
      {
        ...snapshot,
        ticker: "MSFT"
      }
    ]);

    storage.close();
  });

  it("rejects incomplete MBS score snapshots before writing to SQLite", async () => {
    const storage = await createSqliteStorage();

    const result = storage.repositories.mbsScoreSnapshots.create({
      id: "score_invalid",
      ticker: "MSFT",
      score: 80,
      maxScore: 100,
      percentage: 80,
      rating: "incomplete" as never,
      completedCriteria: 6,
      input: {
        businessQuality: 8
      }
    });

    expect(result.ok).toBe(false);
    expect(storage.repositories.mbsScoreSnapshots.list()).toEqual([]);

    storage.close();
  });
});

function readTableNames(database: DatabaseSync): string[] {
  return database
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name ASC;
      `
    )
    .all()
    .map((row) => String((row as { name: string }).name));
}

function readAppliedMigrationVersions(database: DatabaseSync): number[] {
  return database
    .prepare("SELECT version FROM schema_migrations ORDER BY version ASC;")
    .all()
    .map((row) => Number((row as { version: number }).version));
}
