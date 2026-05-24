import { describe, expect, it } from 'vitest';

import { createSqliteStorage } from '../storage/sqlite';
import { createRemindersStorageService } from './remindersStorageService';

describe('createRemindersStorageService', () => {
  it('lists, saves, updates, and removes reminders through storage', async () => {
    const service = createRemindersStorageService(() => createSqliteStorage());

    expect(await service.list()).toEqual({ ok: true, value: [] });

    await expect(
      service.save({
        dueDate: '2026-08-15',
        id: 'reminder_msft',
        note: 'Review the user-authored thesis.',
        ticker: 'msft',
        title: 'Review operating margin thesis',
        type: 'thesis-review'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        dueDate: '2026-08-15',
        id: 'reminder_msft',
        note: 'Review the user-authored thesis.',
        ticker: 'MSFT',
        title: 'Review operating margin thesis',
        type: 'thesis-review'
      }
    });

    await expect(
      service.save({
        completedAt: '2026-08-16',
        dueDate: '2026-08-20',
        id: 'reminder_msft',
        note: 'Updated manual reminder.',
        ticker: 'msft',
        title: 'Updated thesis review',
        type: 'custom'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        completedAt: '2026-08-16',
        dueDate: '2026-08-20',
        id: 'reminder_msft',
        note: 'Updated manual reminder.',
        ticker: 'MSFT',
        title: 'Updated thesis review',
        type: 'custom'
      }
    });

    await expect(service.list()).resolves.toEqual({
      ok: true,
      value: [
        {
          completedAt: '2026-08-16',
          dueDate: '2026-08-20',
          id: 'reminder_msft',
          note: 'Updated manual reminder.',
          ticker: 'MSFT',
          title: 'Updated thesis review',
          type: 'custom'
        }
      ]
    });

    await expect(service.remove('reminder_msft')).resolves.toEqual({
      ok: true,
      value: true
    });
    await expect(service.list()).resolves.toEqual({ ok: true, value: [] });

    await service.close();
  });

  it('returns clear errors for storage failures', async () => {
    const service = createRemindersStorageService(async () => {
      throw new Error('reminders storage unavailable');
    });

    await expect(service.list()).resolves.toEqual({
      ok: false,
      errors: ['reminders storage unavailable']
    });
  });
});
