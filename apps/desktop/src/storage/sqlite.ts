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
}

export async function createSqliteStorage(
  options: SqliteStorageOptions = {}
): Promise<SqliteStorage> {
  const database = await createSqliteDatabase(options);
  runMigrations(database);

  return {
    repositories: createSqliteRepositories(database),
    close: () => database.close()
  };
}

export async function createSqliteDatabase(
  options: SqliteStorageOptions = {}
): Promise<DatabaseSync> {
  const { DatabaseSync } = loadNodeSqlite();
  return new DatabaseSync(options.filename ?? ":memory:");
}

const require = createRequire(import.meta.url);

function loadNodeSqlite(): typeof import("node:sqlite") {
  return require("node:sqlite") as typeof import("node:sqlite");
}
