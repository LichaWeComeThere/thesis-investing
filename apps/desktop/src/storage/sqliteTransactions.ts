import type { DatabaseSync } from 'node:sqlite';

const depths = new WeakMap<DatabaseSync, number>();
let nextSavepoint = 0;

export function isInSqliteTransaction(database: DatabaseSync): boolean {
  return (depths.get(database) ?? 0) > 0;
}

/** Repository writes compose without committing an enclosing completion/import. */
export function runSqliteTransaction<T>(
  database: DatabaseSync,
  operation: () => T,
  forceSavepoint = false
): T {
  const depth = depths.get(database) ?? 0;
  const nested = forceSavepoint || depth > 0;
  const savepoint = `thesis_write_${++nextSavepoint}`;
  database.exec(nested ? `SAVEPOINT ${savepoint}` : 'BEGIN IMMEDIATE');
  depths.set(database, depth + 1);
  try {
    const result = operation();
    database.exec(nested ? `RELEASE ${savepoint}` : 'COMMIT');
    return result;
  } catch (error) {
    database.exec(nested ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : 'ROLLBACK');
    throw error;
  } finally {
    if (depth === 0) depths.delete(database);
    else depths.set(database, depth);
  }
}
