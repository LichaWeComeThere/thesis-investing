import { createRequire } from "node:module";
import type { DatabaseSync } from "node:sqlite";

import type { LocalStorageRepositories } from "./repositories";
import { runMigrations } from "./schema";
import { createSqliteRepositories } from "./sqliteRepositories";

export interface SqliteStorageOptions {
  filename?: string;
}

export interface SqliteStorage {
  repositories: LocalStorageRepositories;
  close(): void;
  runInTransaction<T>(operation: () => T): T;
}

export async function createSqliteStorage(
  options: SqliteStorageOptions = {}
): Promise<SqliteStorage> {
  const database = await createSqliteDatabase(options);
  runMigrations(database);

  return {
    repositories: createSqliteRepositories(database),
    close: () => database.close(),
    runInTransaction: <T>(operation: () => T): T => {
      database.exec("BEGIN IMMEDIATE;");

      try {
        const result = operation();
        database.exec("COMMIT;");
        return result;
      } catch (error) {
        database.exec("ROLLBACK;");
        throw error;
      }
    }
  };
}

export async function createSqliteDatabase(
  options: SqliteStorageOptions = {}
): Promise<DatabaseSync> {
  const { DatabaseSync } = loadNodeSqlite();
  return new DatabaseSync(options.filename ?? ":memory:");
}

const require = createRequire(import.meta.url);

// Adapter note: node:sqlite is only the first local SQLite adapter. It is
// experimental, so Electron runtime compatibility stays covered by
// `pnpm verify:storage`. Callers use repository interfaces so this adapter can
// be swapped later if needed.
function loadNodeSqlite(): typeof import("node:sqlite") {
  return require("node:sqlite") as typeof import("node:sqlite");
}
