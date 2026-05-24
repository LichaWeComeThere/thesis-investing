import { describe, expect, it } from 'vitest';

import { createSqliteStorage } from '../storage/sqlite';
import { createWatchlistStorageService } from './watchlistStorageService';

describe('createWatchlistStorageService', () => {
  it('lists, saves, updates, and removes watchlist items through storage', async () => {
    const service = createWatchlistStorageService(() => createSqliteStorage());

    expect(await service.list()).toEqual({ ok: true, value: [] });

    await expect(
      service.save({
        companyName: 'Microsoft',
        id: 'watchlist_msft',
        note: 'Persist locally.',
        tags: ['quality', 'software'],
        ticker: 'msft'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        companyName: 'Microsoft',
        id: 'watchlist_msft',
        note: 'Persist locally.',
        tags: ['quality', 'software'],
        ticker: 'MSFT'
      }
    });

    await expect(
      service.save({
        companyName: 'Microsoft',
        id: 'watchlist_msft',
        note: 'Updated local note.',
        tags: ['quality'],
        ticker: 'msft'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        companyName: 'Microsoft',
        id: 'watchlist_msft',
        note: 'Updated local note.',
        tags: ['quality'],
        ticker: 'MSFT'
      }
    });

    await expect(service.list()).resolves.toEqual({
      ok: true,
      value: [
        {
          companyName: 'Microsoft',
          id: 'watchlist_msft',
          note: 'Updated local note.',
          tags: ['quality'],
          ticker: 'MSFT'
        }
      ]
    });

    await expect(service.remove('watchlist_msft')).resolves.toEqual({
      ok: true,
      value: true
    });
    await expect(service.list()).resolves.toEqual({ ok: true, value: [] });

    await service.close();
  });

  it('returns clear errors for storage failures', async () => {
    const service = createWatchlistStorageService(async () => {
      throw new Error('storage unavailable');
    });

    await expect(service.list()).resolves.toEqual({
      ok: false,
      errors: ['storage unavailable']
    });
  });
});
