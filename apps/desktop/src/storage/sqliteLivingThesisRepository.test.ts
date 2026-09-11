import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";

import type { LivingThesis } from "@thesis-investing/core";
import { describe, expect, it } from "vitest";

import { migrations, runMigrations } from "./schema";
import { createSqliteDatabase, createSqliteStorage } from "./sqlite";

const CREATED_AT = "2026-08-24T12:00:00.000Z";
const UPDATED_AT = "2026-08-24T13:00:00.000Z";

describe("Living Thesis SQLite repository", () => {
  it("migrates an existing Phase 2 database without changing its records", async () => {
    const database = await createSqliteDatabase();

    prepareDatabaseAtMigrationThree(database);
    database
      .prepare(
        "INSERT INTO watchlist_items (id, ticker, tags_json) VALUES (?, ?, ?);"
      )
      .run("legacy-watchlist", "MSFT", "[]");
    database
      .prepare(
        `
          INSERT INTO mbs_score_snapshots (
            id, thesis_id, score, max_score, percentage, rating,
            completed_criteria, input_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `
      )
      .run(
        "legacy-snapshot",
        "legacy-thesis-reference",
        70,
        100,
        70,
        "strong",
        7,
        "{}"
      );

    runMigrations(database);

    expect(readMigrationVersions(database)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(
      database
        .prepare("SELECT ticker FROM watchlist_items WHERE id = ?;")
        .get("legacy-watchlist")
    ).toEqual({ ticker: "MSFT" });
    expect(
      database
        .prepare("SELECT thesis_id FROM mbs_score_snapshots WHERE id = ?;")
        .get("legacy-snapshot")
    ).toEqual({ thesis_id: "legacy-thesis-reference" });

    database.close();
  });

  it("creates and reconstructs a normalized aggregate with deterministic children", async () => {
    const storage = await createSqliteStorage();
    const thesis = makeThesis({
      ticker: "msft",
      entityName: "  Microsoft  ",
      risks: [
        makeRisk("risk-b", "thesis-alpha", "2026-08-24T12:02:00.000Z"),
        makeRisk("risk-a", "thesis-alpha", "2026-08-24T12:01:00.000Z")
      ],
      catalysts: [
        makeCatalyst(
          "catalyst-b",
          "thesis-alpha",
          "2026-08-24T12:02:00.000Z"
        ),
        makeCatalyst(
          "catalyst-a",
          "thesis-alpha",
          "2026-08-24T12:01:00.000Z"
        )
      ]
    });

    const result = storage.repositories.livingTheses.create(thesis);

    expect(result.ok).toBe(true);
    expect(storage.repositories.livingTheses.getById(thesis.id)).toMatchObject({
      ticker: "MSFT",
      entityName: "Microsoft",
      risks: [{ id: "risk-a" }, { id: "risk-b" }],
      catalysts: [{ id: "catalyst-a" }, { id: "catalyst-b" }]
    });

    storage.close();
  });

  it("persists tickerless theses and permits multiple theses per ticker", async () => {
    const storage = await createSqliteStorage();

    expect(
      storage.repositories.livingTheses.create(
        makeThesis({ id: "thesis-no-ticker", ticker: undefined })
      ).ok
    ).toBe(true);
    expect(
      storage.repositories.livingTheses.create(
        makeThesis({ id: "thesis-msft-a", ticker: "MSFT" })
      ).ok
    ).toBe(true);
    expect(
      storage.repositories.livingTheses.create(
        makeThesis({ id: "thesis-msft-b", ticker: "MSFT" })
      ).ok
    ).toBe(true);

    expect(
      storage.repositories.livingTheses.getById("thesis-no-ticker")?.ticker
    ).toBeUndefined();
    expect(
      storage.repositories.livingTheses
        .list()
        .filter((thesis) => thesis.ticker === "MSFT")
    ).toHaveLength(2);

    storage.close();
  });

  it("rejects invalid aggregates, duplicate thesis IDs, and parent mismatches", async () => {
    const storage = await createSqliteStorage();
    const valid = makeThesis();

    expect(storage.repositories.livingTheses.create(valid).ok).toBe(true);
    expect(storage.repositories.livingTheses.create(valid)).toMatchObject({
      ok: false,
      errors: [expect.stringContaining("already exists")]
    });
    expect(
      storage.repositories.livingTheses.create(
        makeThesis({
          id: "invalid-parent",
          risks: [makeRisk("wrong-parent-risk", "another-thesis")]
        })
      ).ok
    ).toBe(false);
    expect(
      storage.repositories.livingTheses.create(
        makeThesis({ id: "invalid-version", version: 2 })
      ).ok
    ).toBe(false);
    expect(storage.repositories.livingTheses.list()).toHaveLength(1);

    storage.close();
  });

  it("rolls back aggregate creation when a child identity is already stored", async () => {
    const storage = await createSqliteStorage();
    const first = makeThesis({
      id: "thesis-first",
      risks: [makeRisk("shared-child", "thesis-first")]
    });
    const second = makeThesis({
      id: "thesis-second",
      catalysts: [makeCatalyst("shared-child", "thesis-second")]
    });

    expect(storage.repositories.livingTheses.create(first).ok).toBe(true);
    expect(storage.repositories.livingTheses.create(second).ok).toBe(false);
    expect(
      storage.repositories.livingTheses.getById("thesis-second")
    ).toBeUndefined();

    storage.close();
  });

  it("lists theses by updated timestamp descending with ID as a tie-breaker", async () => {
    const storage = await createSqliteStorage();

    storage.repositories.livingTheses.create(
      makeThesis({ id: "thesis-b", updatedAt: CREATED_AT })
    );
    storage.repositories.livingTheses.create(
      makeThesis({ id: "thesis-a", updatedAt: CREATED_AT })
    );
    storage.repositories.livingTheses.create(
      makeThesis({ id: "thesis-newest", updatedAt: UPDATED_AT })
    );

    expect(
      storage.repositories.livingTheses.list().map((thesis) => thesis.id)
    ).toEqual(["thesis-newest", "thesis-a", "thesis-b"]);

    storage.close();
  });

  it("updates parent and child state atomically and increments version once", async () => {
    const storage = await createSqliteStorage();
    const thesis = makeThesis();
    storage.repositories.livingTheses.create(thesis);

    const result = storage.repositories.livingTheses.update(
      {
        ...thesis,
        lifecycle: "archived",
        archivedAt: UPDATED_AT,
        title: "Updated thesis",
        updatedAt: UPDATED_AT,
        risks: [
          { ...thesis.risks[0], status: "retired", updatedAt: UPDATED_AT },
          makeRisk("risk-new", thesis.id, UPDATED_AT)
        ],
        catalysts: [
          {
            ...thesis.catalysts[0],
            status: "observed",
            updatedAt: UPDATED_AT
          },
          makeCatalyst("catalyst-new", thesis.id, UPDATED_AT)
        ]
      },
      1
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("; "));
    }

    expect(result.value).toMatchObject({
      version: 2,
      lifecycle: "archived",
      archivedAt: UPDATED_AT,
      risks: [
        { id: thesis.risks[0].id, status: "retired" },
        { id: "risk-new", status: "open" }
      ],
      catalysts: [
        { id: thesis.catalysts[0].id, status: "observed" },
        { id: "catalyst-new", status: "open" }
      ]
    });

    storage.close();
  });

  it("rejects stale writes without changing parent or children", async () => {
    const storage = await createSqliteStorage();
    const thesis = makeThesis();
    storage.repositories.livingTheses.create(thesis);
    const firstUpdate = storage.repositories.livingTheses.update(
      { ...thesis, title: "Committed title", updatedAt: UPDATED_AT },
      1
    );
    expect(firstUpdate.ok).toBe(true);

    const staleUpdate = storage.repositories.livingTheses.update(
      {
        ...thesis,
        title: "Stale title",
        risks: [
          ...thesis.risks,
          makeRisk("stale-risk", thesis.id, UPDATED_AT)
        ],
        updatedAt: "2026-08-24T14:00:00.000Z"
      },
      1
    );

    expect(staleUpdate).toMatchObject({
      ok: false,
      errors: [expect.stringContaining("version conflict")]
    });
    expect(storage.repositories.livingTheses.getById(thesis.id)).toMatchObject({
      version: 2,
      title: "Committed title",
      risks: [{ id: thesis.risks[0].id }]
    });

    storage.close();
  });

  it("rejects accidental child omission without deleting stored children", async () => {
    const storage = await createSqliteStorage();
    const thesis = makeThesis();
    storage.repositories.livingTheses.create(thesis);

    const result = storage.repositories.livingTheses.update(
      { ...thesis, risks: [], catalysts: [], updatedAt: UPDATED_AT },
      1
    );

    expect(result).toMatchObject({
      ok: false,
      errors: [expect.stringContaining("retained or marked retired")]
    });
    expect(storage.repositories.livingTheses.getById(thesis.id)?.risks).toEqual(
      thesis.risks
    );
    expect(
      storage.repositories.livingTheses.getById(thesis.id)?.catalysts
    ).toEqual(thesis.catalysts);

    storage.close();
  });

  it("rolls back a parent update when a new child identity conflicts", async () => {
    const storage = await createSqliteStorage();
    const first = makeThesis({ id: "thesis-update-first" });
    const second = makeThesis({ id: "thesis-update-second" });
    storage.repositories.livingTheses.create(first);
    storage.repositories.livingTheses.create(second);

    const result = storage.repositories.livingTheses.update(
      {
        ...second,
        title: "This parent update must roll back",
        risks: [
          ...second.risks,
          makeRisk(first.catalysts[0].id, second.id, UPDATED_AT)
        ],
        updatedAt: UPDATED_AT
      },
      1
    );

    expect(result).toMatchObject({
      ok: false,
      errors: [expect.stringContaining("already used by a catalyst")]
    });
    expect(storage.repositories.livingTheses.getById(second.id)).toEqual(second);

    storage.close();
  });

  it("preserves nullable fields and canonical timestamps exactly", async () => {
    const storage = await createSqliteStorage();
    const thesis = makeThesis({
      ticker: undefined,
      theme: undefined,
      bullCase: undefined,
      bearCase: undefined,
      reviewCadenceDays: undefined,
      nextReviewAt: undefined,
      archivedAt: undefined
    });

    storage.repositories.livingTheses.create(thesis);

    expect(storage.repositories.livingTheses.getById(thesis.id)).toEqual(thesis);

    storage.close();
  });

  it("keeps MBS history separate and exposes no hard-delete operation", async () => {
    const storage = await createSqliteStorage();
    const database = await createSqliteDatabase();
    runMigrations(database);

    const columnNames = database
      .prepare("PRAGMA table_info(living_theses);")
      .all()
      .map((row) => String((row as { name: string }).name));

    expect(columnNames).not.toEqual(
      expect.arrayContaining([
        "mbs_score",
        "previous_mbs_score",
        "score_change",
        "current_mbs_snapshot_id"
      ])
    );
    expect(storage.repositories.livingTheses).not.toHaveProperty("delete");

    database.close();
    storage.close();
  });

  it("enforces restrictive child foreign keys", async () => {
    const database = await createSqliteDatabase();
    runMigrations(database);

    expect(() =>
      database
        .prepare(
          `
            INSERT INTO living_thesis_risks (
              id, thesis_id, title, status, severity, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
          `
        )
        .run(
          "orphan-risk",
          "missing-thesis",
          "Orphan risk",
          "open",
          "medium",
          CREATED_AT,
          CREATED_AT
        )
    ).toThrow();

    database
      .prepare(
        `
          INSERT INTO living_theses (
            id, version, entity_name, title, summary, lifecycle, conviction,
            risk_level, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `
      )
      .run(
        "restricted-parent",
        1,
        "Restricted parent",
        "Restricted parent",
        "Foreign-key verification.",
        "active",
        "medium",
        "medium",
        CREATED_AT,
        CREATED_AT
      );
    database
      .prepare(
        `
          INSERT INTO living_thesis_risks (
            id, thesis_id, title, status, severity, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `
      )
      .run(
        "restricted-risk",
        "restricted-parent",
        "Restricted risk",
        "open",
        "medium",
        CREATED_AT,
        CREATED_AT
      );

    expect(() =>
      database
        .prepare("DELETE FROM living_theses WHERE id = ?;")
        .run("restricted-parent")
    ).toThrow();

    database.close();
  });

  it("retains a Living Thesis after storage is closed and reopened", async () => {
    const directory = await mkdtemp(join(tmpdir(), "thesis-investing-stage-3-"));
    const filename = join(directory, "living-thesis.sqlite");

    try {
      const firstStorage = await createSqliteStorage({ filename });
      const thesis = makeThesis({ id: "reopen-thesis", ticker: undefined });
      expect(firstStorage.repositories.livingTheses.create(thesis).ok).toBe(true);
      firstStorage.close();

      const reopenedStorage = await createSqliteStorage({ filename });
      expect(
        reopenedStorage.repositories.livingTheses.getById(thesis.id)
      ).toEqual(thesis);
      reopenedStorage.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function makeThesis(overrides: Partial<LivingThesis> = {}): LivingThesis {
  const id = overrides.id ?? "thesis-alpha";
  const base: LivingThesis = {
    id,
    version: 1,
    ticker: "MSFT",
    entityName: "Microsoft",
    title: "Durable platform thesis",
    theme: "Enterprise software",
    summary: "A current-state thesis for persistence tests.",
    bullCase: "Execution expands durable cash generation.",
    bearCase: "Competition compresses durable economics.",
    lifecycle: "active",
    conviction: "medium",
    riskLevel: "medium",
    risks: [makeRisk(`risk-${id}`, id)],
    catalysts: [makeCatalyst(`catalyst-${id}`, id)],
    reviewCadenceDays: 90,
    nextReviewAt: "2026-11-22",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  };

  return { ...base, ...overrides };
}

function makeRisk(
  id: string,
  thesisId: string,
  createdAt = CREATED_AT
): LivingThesis["risks"][number] {
  return {
    id,
    thesisId,
    title: `Risk ${id}`,
    detail: "Structured risk detail.",
    status: "open",
    severity: "medium",
    createdAt,
    updatedAt: createdAt
  };
}

function makeCatalyst(
  id: string,
  thesisId: string,
  createdAt = CREATED_AT
): LivingThesis["catalysts"][number] {
  return {
    id,
    thesisId,
    title: `Catalyst ${id}`,
    detail: "Structured catalyst detail.",
    status: "open",
    createdAt,
    updatedAt: createdAt
  };
}

function prepareDatabaseAtMigrationThree(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  for (const migration of migrations.filter((entry) => entry.version <= 3)) {
    database.exec(migration.sql);
    database
      .prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?);")
      .run(migration.version, migration.name);
  }
}

function readMigrationVersions(database: DatabaseSync): number[] {
  return database
    .prepare("SELECT version FROM schema_migrations ORDER BY version ASC;")
    .all()
    .map((row) => Number((row as { version: number }).version));
}
