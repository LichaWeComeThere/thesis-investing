import type { Reminder } from '@thesis-investing/core';
import type { RemindersStorageApi } from '../../shared/remindersStorage';
import type { ThesisInvestingApi } from '../../shared/watchlistStorage';
import type { LocalReminder } from './reminderInput';

declare global {
  interface Window {
    thesisInvesting?: ThesisInvestingApi;
  }
}

export type RemindersStorageClient = RemindersStorageApi;

export type ReminderCompletionDateProvider = () => string;

export function getDefaultRemindersStorageClient(): RemindersStorageClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.thesisInvesting?.reminders ?? null;
}

export function toLocalReminder(reminder: Reminder): LocalReminder {
  return {
    ...reminder,
    completed: Boolean(reminder.completedAt)
  };
}

export function toPersistedReminder(
  reminder: LocalReminder,
  completionDateProvider: ReminderCompletionDateProvider = getTodayIsoDate
): Reminder {
  return {
    completedAt: reminder.completed
      ? reminder.completedAt ?? completionDateProvider()
      : undefined,
    createdAt: reminder.createdAt,
    dueDate: reminder.dueDate,
    id: reminder.id,
    note: reminder.note,
    ticker: reminder.ticker,
    title: reminder.title,
    type: reminder.type
  };
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
