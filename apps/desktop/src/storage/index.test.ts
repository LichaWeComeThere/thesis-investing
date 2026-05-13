import type { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { runMigrations } from "./schema";
import { createSqliteDatabase, createSqliteStorage } from "./sqlite";

describe("SQLite local storage", () => {
  it("runs the initial migration and creates local tables", async () => {
    const database = await createSqliteDatabase();

    runMigrations(database);

    expect(readTableNames(database)).toEqual([
      "holdings",
      "reminders",
      "schema_migrations",
      "thesis_notes",
      "watchlist_items"
    ]);
    expect(readAppliedMigrationVersions(database)).toEqual([1]);

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
