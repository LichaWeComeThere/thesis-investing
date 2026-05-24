import type { Reminder } from '@thesis-investing/core';

export const remindersStorageChannels = {
  list: 'reminders:list',
  remove: 'reminders:remove',
  save: 'reminders:save'
} as const;

export type RemindersStorageResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type RemindersStorageApi = {
  list(): Promise<RemindersStorageResult<Reminder[]>>;
  remove(id: string): Promise<RemindersStorageResult<boolean>>;
  save(reminder: Reminder): Promise<RemindersStorageResult<Reminder>>;
};
