import type { WatchlistItem } from '@thesis-investing/core';

import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import type { WatchlistStorageResult } from '../shared/watchlistStorage';

export type WatchlistStorageFactory = () => Promise<SqliteStorage>;

export type WatchlistStorageService = {
  close(): Promise<void>;
  list(): Promise<WatchlistStorageResult<WatchlistItem[]>>;
  remove(id: string): Promise<WatchlistStorageResult<boolean>>;
  save(item: WatchlistItem): Promise<WatchlistStorageResult<WatchlistItem>>;
};

export function createWatchlistStorageService(
  createStorage: WatchlistStorageFactory
): WatchlistStorageService {
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
        return success(storage.repositories.watchlistItems.list());
      });
    },
    async remove(id) {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const wasDeleted = storage.repositories.watchlistItems.delete(id);

        if (!wasDeleted) {
          return failure(['Watchlist item not found.']);
        }

        return success(true);
      });
    },
    async save(item) {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const existingItem = storage.repositories.watchlistItems.getById(item.id);
        const result = existingItem
          ? storage.repositories.watchlistItems.update(item)
          : storage.repositories.watchlistItems.create(item);

        return result.ok ? success(result.value) : failure(result.errors);
      });
    }
  };
}

export function createSqliteWatchlistStorageService(
  filename: string
): WatchlistStorageService {
  return createWatchlistStorageService(() => createSqliteStorage({ filename }));
}

async function runStorageOperation<T>(
  operation: () => Promise<WatchlistStorageResult<T>>
): Promise<WatchlistStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return failure([
      error instanceof Error ? error.message : 'Unknown watchlist storage error.'
    ]);
  }
}

function success<T>(value: T): WatchlistStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): WatchlistStorageResult<T> {
  return { ok: false, errors };
}
