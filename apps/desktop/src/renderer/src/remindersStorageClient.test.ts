import { describe, expect, it } from 'vitest';

import type { LocalReminder } from './reminderInput';
import { toLocalReminder, toPersistedReminder } from './remindersStorageClient';

describe('remindersStorageClient', () => {
  it('maps persisted completion dates to local completed state', () => {
    expect(
      toLocalReminder({
        completedAt: '2026-08-16',
        dueDate: '2026-08-15',
        id: 'reminder_msft',
        title: 'Review thesis',
        type: 'thesis-review'
      })
    ).toEqual({
      completed: true,
      completedAt: '2026-08-16',
      dueDate: '2026-08-15',
      id: 'reminder_msft',
      title: 'Review thesis',
      type: 'thesis-review'
    });
  });

  it('maps completed local reminders to a persisted completed date', () => {
    const reminder: LocalReminder = {
      completed: true,
      dueDate: '2026-08-15',
      id: 'reminder_msft',
      title: 'Review thesis',
      type: 'thesis-review'
    };

    expect(toPersistedReminder(reminder, () => '2026-08-16')).toEqual({
      completedAt: '2026-08-16',
      createdAt: undefined,
      dueDate: '2026-08-15',
      id: 'reminder_msft',
      note: undefined,
      ticker: undefined,
      title: 'Review thesis',
      type: 'thesis-review'
    });
  });

  it('clears persisted completion date for reopened reminders', () => {
    const reminder: LocalReminder = {
      completed: false,
      completedAt: '2026-08-16',
      dueDate: '2026-08-15',
      id: 'reminder_msft',
      title: 'Review thesis',
      type: 'thesis-review'
    };

    expect(toPersistedReminder(reminder, () => '2026-08-17')).toEqual({
      completedAt: undefined,
      createdAt: undefined,
      dueDate: '2026-08-15',
      id: 'reminder_msft',
      note: undefined,
      ticker: undefined,
      title: 'Review thesis',
      type: 'thesis-review'
    });
  });
});
