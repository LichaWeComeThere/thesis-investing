import { describe, expect, it } from 'vitest';

import { createSqliteStorage } from '../storage/sqlite';
import { createPortfolioRankerStorageService } from './portfolioRankerStorageService';

describe('createPortfolioRankerStorageService', () => {
  it('lists, saves, updates, and removes portfolio ranker items through storage', async () => {
    const service = createPortfolioRankerStorageService(() =>
      createSqliteStorage()
    );

    expect(await service.list()).toEqual({ ok: true, value: [] });

    await expect(
      service.save({
        companyName: 'Microsoft',
        id: 'portfolio-ranker_msft',
        manualScore: 82,
        notes: 'Durable software franchise.',
        ticker: 'msft'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        companyName: 'Microsoft',
        id: 'portfolio-ranker_msft',
        manualScore: 82,
        notes: 'Durable software franchise.',
        ticker: 'MSFT'
      }
    });

    await expect(
      service.save({
        companyName: 'Microsoft',
        id: 'portfolio-ranker_msft',
        manualScore: 91,
        notes: 'Raised conviction after research review.',
        ticker: 'msft'
      })
    ).resolves.toEqual({
      ok: true,
      value: {
        companyName: 'Microsoft',
        id: 'portfolio-ranker_msft',
        manualScore: 91,
        notes: 'Raised conviction after research review.',
        ticker: 'MSFT'
      }
    });

    await expect(service.list()).resolves.toEqual({
      ok: true,
      value: [
        {
          companyName: 'Microsoft',
          id: 'portfolio-ranker_msft',
          manualScore: 91,
          notes: 'Raised conviction after research review.',
          ticker: 'MSFT'
        }
      ]
    });

    await expect(service.remove('portfolio-ranker_msft')).resolves.toEqual({
      ok: true,
      value: true
    });
    await expect(service.list()).resolves.toEqual({ ok: true, value: [] });

    await service.close();
  });

  it('returns clear errors for storage failures', async () => {
    const service = createPortfolioRankerStorageService(async () => {
      throw new Error('storage unavailable');
    });

    await expect(service.list()).resolves.toEqual({
      ok: false,
      errors: ['storage unavailable']
    });
  });

  it('returns validation errors instead of writing invalid items', async () => {
    const service = createPortfolioRankerStorageService(() =>
      createSqliteStorage()
    );

    const result = await service.save({
      id: 'portfolio-ranker_invalid',
      ticker: 'bad ticker',
      manualScore: 200
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        'Portfolio ranker ticker must be a valid ticker symbol.',
        'Portfolio ranker manual score must be a finite number from 0 to 100.'
      ]
    });

    await expect(service.list()).resolves.toEqual({ ok: true, value: [] });
    await service.close();
  });
});
