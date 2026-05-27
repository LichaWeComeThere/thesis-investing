import type { PortfolioRankerItem } from '@thesis-investing/core';

import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import type { PortfolioRankerStorageResult } from '../shared/portfolioRankerStorage';

export type PortfolioRankerStorageFactory = () => Promise<SqliteStorage>;

export type PortfolioRankerStorageService = {
  close(): Promise<void>;
  list(): Promise<PortfolioRankerStorageResult<PortfolioRankerItem[]>>;
  remove(id: string): Promise<PortfolioRankerStorageResult<boolean>>;
  save(
    item: PortfolioRankerItem
  ): Promise<PortfolioRankerStorageResult<PortfolioRankerItem>>;
};

export function createPortfolioRankerStorageService(
  createStorage: PortfolioRankerStorageFactory
): PortfolioRankerStorageService {
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
        return success(storage.repositories.portfolioRankerItems.list());
      });
    },
    async remove(id) {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const wasDeleted =
          storage.repositories.portfolioRankerItems.delete(id);

        if (!wasDeleted) {
          return failure(['Portfolio ranker item not found.']);
        }

        return success(true);
      });
    },
    async save(item) {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const existingItem =
          storage.repositories.portfolioRankerItems.getById(item.id);
        const result = existingItem
          ? storage.repositories.portfolioRankerItems.update(item)
          : storage.repositories.portfolioRankerItems.create(item);

        return result.ok ? success(result.value) : failure(result.errors);
      });
    }
  };
}

export function createSqlitePortfolioRankerStorageService(
  filename: string
): PortfolioRankerStorageService {
  return createPortfolioRankerStorageService(() =>
    createSqliteStorage({ filename })
  );
}

async function runStorageOperation<T>(
  operation: () => Promise<PortfolioRankerStorageResult<T>>
): Promise<PortfolioRankerStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return failure([
      error instanceof Error
        ? error.message
        : 'Unknown portfolio ranker storage error.'
    ]);
  }
}

function success<T>(value: T): PortfolioRankerStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): PortfolioRankerStorageResult<T> {
  return { ok: false, errors };
}
