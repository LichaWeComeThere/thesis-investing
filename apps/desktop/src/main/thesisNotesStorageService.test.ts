import { describe, expect, it } from 'vitest';

import { createSqliteStorage } from '../storage/sqlite';
import { createThesisNotesStorageService } from './thesisNotesStorageService';

describe('createThesisNotesStorageService', () => {
  it('lists, saves, and updates thesis notes through storage', async () => {
    const service = createThesisNotesStorageService(() => createSqliteStorage());

    expect(await service.list()).toEqual({ ok: true, value: [] });

    await expect(
      service.save({
        body: 'The thesis is user-authored and manually reviewed.',
        conviction: 'medium',
        id: 'thesis_msft',
        reviewDueAt: '2026-08-15',
        status: 'active',
        ticker: 'msft',
        title: 'Durable software thesis'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        body: 'The thesis is user-authored and manually reviewed.',
        conviction: 'medium',
        id: 'thesis_msft',
        reviewDueAt: '2026-08-15',
        status: 'active',
        ticker: 'MSFT',
        title: 'Durable software thesis'
      }
    });

    await expect(
      service.save({
        body: 'Updated user-authored thesis body.',
        conviction: 'high',
        id: 'thesis_msft',
        reviewDueAt: '2026-09-01',
        status: 'watch',
        ticker: 'msft',
        title: 'Updated software thesis'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        body: 'Updated user-authored thesis body.',
        conviction: 'high',
        id: 'thesis_msft',
        reviewDueAt: '2026-09-01',
        status: 'watch',
        ticker: 'MSFT',
        title: 'Updated software thesis'
      }
    });

    await expect(service.list()).resolves.toEqual({
      ok: true,
      value: [
        {
          body: 'Updated user-authored thesis body.',
          conviction: 'high',
          id: 'thesis_msft',
          reviewDueAt: '2026-09-01',
          status: 'watch',
          ticker: 'MSFT',
          title: 'Updated software thesis'
        }
      ]
    });

    await service.close();
  });

  it('returns clear errors for storage failures', async () => {
    const service = createThesisNotesStorageService(async () => {
      throw new Error('thesis storage unavailable');
    });

    await expect(service.list()).resolves.toEqual({
      ok: false,
      errors: ['thesis storage unavailable']
    });
  });
});
