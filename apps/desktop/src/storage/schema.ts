import type { DatabaseSync } from "node:sqlite";

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: "initial_local_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS holdings (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT,
        stock_id TEXT,
        ticker TEXT NOT NULL,
        company_name TEXT,
        shares REAL NOT NULL,
        average_cost REAL,
        currency TEXT,
        thesis_note_id TEXT,
        opened_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS watchlist_items (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        company_name TEXT,
        thesis_note_id TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        note TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS thesis_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL,
        ticker TEXT,
        conviction TEXT,
        created_at TEXT,
        updated_at TEXT,
        review_due_at TEXT
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        type TEXT NOT NULL,
        ticker TEXT,
        note TEXT,
        completed_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `
  }
];

export function runMigrations(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  const appliedVersions = new Set(readAppliedVersions(database));

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    database.exec("BEGIN TRANSACTION;");
    try {
      database.exec(migration.sql);
      database
        .prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?);")
        .run(migration.version, migration.name);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }
}

function readAppliedVersions(database: DatabaseSync): number[] {
  return database
    .prepare("SELECT version FROM schema_migrations ORDER BY version ASC;")
    .all()
    .map((row) => Number((row as { version: number }).version));
}
