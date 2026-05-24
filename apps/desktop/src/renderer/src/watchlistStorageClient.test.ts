import { describe, expect, it } from 'vitest';

import { toPersistedWatchlistItem } from './watchlistStorageClient';
import type { LocalWatchlistItem } from './watchlistInput';

describe('watchlistStorageClient', () => {
  it('strips current-session thesis reference text before persistence', () => {
    const localItem: LocalWatchlistItem = {
      companyName: 'Microsoft',
      id: 'watchlist_msft',
      note: 'Manual note.',
      tags: ['quality'],
      thesisReference: 'Current session note reference',
      ticker: 'MSFT'
    };

    expect(toPersistedWatchlistItem(localItem)).toEqual({
      companyName: 'Microsoft',
      createdAt: undefined,
      id: 'watchlist_msft',
      note: 'Manual note.',
      tags: ['quality'],
      thesisNoteId: undefined,
      ticker: 'MSFT'
    });
  });
});
