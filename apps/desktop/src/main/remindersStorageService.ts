import type { Reminder } from '@thesis-investing/core';

import type { RemindersStorageResult } from '../shared/remindersStorage';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';

export type RemindersStorageFactory = () => Promise<SqliteStorage>;

export type RemindersStorageService = {
  close(): Promise<void>;
  list(): Promise<RemindersStorageResult<Reminder[]>>;
  remove(id: string): Promise<RemindersStorageResult<boolean>>;
  save(reminder: Reminder): Promise<RemindersStorageResult<Reminder>>;
};

export function createRemindersStorageService(
  createStorage: RemindersStorageFactory
): RemindersStorageService {
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
        return success(storage.repositories.reminders.list());
      });
    },
    async remove(id) {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const wasDeleted = storage.repositories.reminders.delete(id);

        if (!wasDeleted) {
          return failure(['Reminder not found.']);
        }

        return success(true);
      });
    },
    async save(reminder) {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const existingReminder = storage.repositories.reminders.getById(reminder.id);
        const result = existingReminder
          ? storage.repositories.reminders.update(reminder)
          : storage.repositories.reminders.create(reminder);

        return result.ok ? success(result.value) : failure(result.errors);
      });
    }
  };
}

export function createSqliteRemindersStorageService(
  filename: string
): RemindersStorageService {
  return createRemindersStorageService(() => createSqliteStorage({ filename }));
}

async function runStorageOperation<T>(
  operation: () => Promise<RemindersStorageResult<T>>
): Promise<RemindersStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return failure([
      error instanceof Error ? error.message : 'Unknown reminders storage error.'
    ]);
  }
}

function success<T>(value: T): RemindersStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): RemindersStorageResult<T> {
  return { ok: false, errors };
}
