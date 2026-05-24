import type { ThesisNote } from '@thesis-investing/core';

export const thesisNotesStorageChannels = {
  list: 'thesis-notes:list',
  save: 'thesis-notes:save'
} as const;

export type ThesisNotesStorageResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type ThesisNotesStorageApi = {
  list(): Promise<ThesisNotesStorageResult<ThesisNote[]>>;
  save(note: ThesisNote): Promise<ThesisNotesStorageResult<ThesisNote>>;
};
