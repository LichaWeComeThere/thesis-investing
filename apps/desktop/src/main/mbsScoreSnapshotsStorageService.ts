import type { MbsScoreSnapshot } from '@thesis-investing/core';

import type { MbsScoreSnapshotsStorageResult } from '../shared/mbsScoreSnapshotsStorage';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';

export type MbsScoreSnapshotsStorageFactory = () => Promise<SqliteStorage>;

export type MbsScoreSnapshotsStorageService = {
  close(): Promise<void>;
  list(): Promise<MbsScoreSnapshotsStorageResult<MbsScoreSnapshot[]>>;
  save(
    snapshot: MbsScoreSnapshot
  ): Promise<MbsScoreSnapshotsStorageResult<MbsScoreSnapshot>>;
};

export function createMbsScoreSnapshotsStorageService(
  createStorage: MbsScoreSnapshotsStorageFactory
): MbsScoreSnapshotsStorageService {
  let storagePromise: Promise<SqliteStorage> | null = null;

  async function getStorage(): Promise<SqliteStorage> {
    storagePromise ??= createStorage().catch((error: unknown) => {
      storagePromise = null;
      throw error;
    });
    return storagePromise;
  }

  return {
    async close() {
      if (!storagePromise) {
        return;
      }

      try {
        const storage = await storagePromise;
        storage.close();
      } finally {
        storagePromise = null;
      }
    },
    async list() {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        return success(storage.repositories.mbsScoreSnapshots.list());
      });
    },
    async save(snapshot) {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const result = storage.repositories.mbsScoreSnapshots.create(snapshot);

        return result.ok ? success(result.value) : failure(result.errors);
      });
    }
  };
}

export function createSqliteMbsScoreSnapshotsStorageService(
  filename: string
): MbsScoreSnapshotsStorageService {
  return createMbsScoreSnapshotsStorageService(() =>
    createSqliteStorage({ filename })
  );
}

async function runStorageOperation<T>(
  operation: () => Promise<MbsScoreSnapshotsStorageResult<T>>
): Promise<MbsScoreSnapshotsStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return failure([
      error instanceof Error
        ? error.message
        : 'Unknown MBS score snapshots storage error.'
    ]);
  }
}

function success<T>(value: T): MbsScoreSnapshotsStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): MbsScoreSnapshotsStorageResult<T> {
  return { ok: false, errors };
}
