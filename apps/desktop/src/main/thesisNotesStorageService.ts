import type { ThesisNote } from '@thesis-investing/core';

import type { ThesisNotesStorageResult } from '../shared/thesisNotesStorage';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';

export type ThesisNotesStorageFactory = () => Promise<SqliteStorage>;

export type ThesisNotesStorageService = {
  close(): Promise<void>;
  list(): Promise<ThesisNotesStorageResult<ThesisNote[]>>;
  save(note: ThesisNote): Promise<ThesisNotesStorageResult<ThesisNote>>;
};

export function createThesisNotesStorageService(
  createStorage: ThesisNotesStorageFactory
): ThesisNotesStorageService {
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
        return success(storage.repositories.thesisNotes.list());
      });
    },
    async save(note) {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        const existingNote = storage.repositories.thesisNotes.getById(note.id);
        const result = existingNote
          ? storage.repositories.thesisNotes.update(note)
          : storage.repositories.thesisNotes.create(note);

        return result.ok ? success(result.value) : failure(result.errors);
      });
    }
  };
}

export function createSqliteThesisNotesStorageService(
  filename: string
): ThesisNotesStorageService {
  return createThesisNotesStorageService(() => createSqliteStorage({ filename }));
}

async function runStorageOperation<T>(
  operation: () => Promise<ThesisNotesStorageResult<T>>
): Promise<ThesisNotesStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return failure([
      error instanceof Error ? error.message : 'Unknown thesis notes storage error.'
    ]);
  }
}

function success<T>(value: T): ThesisNotesStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): ThesisNotesStorageResult<T> {
  return { ok: false, errors };
}
