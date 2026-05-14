import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WatchlistScreen } from './WatchlistScreen';
import {
  buildWatchlistItemFromForm,
  createEmptyWatchlistForm,
  removeLocalWatchlistItem,
  upsertLocalWatchlistItem,
  watchlistItemToForm,
  type LocalWatchlistItem
} from './watchlistInput';

const sampleItem: LocalWatchlistItem = {
  companyName: 'Microsoft',
  id: 'watchlist_sample',
  note: 'Manual research follow-up.',
  tags: ['quality', 'software'],
  thesisReference: 'Durable software thesis',
  ticker: 'MSFT'
};

describe('WatchlistScreen', () => {
  it('renders manual watchlist copy and selected item details', () => {
    const html = renderToStaticMarkup(
      <WatchlistScreen initialItems={[sampleItem]} />
    );

    expect(html).toContain('Manual entries only');
    expect(html).toContain('No live prices');
    expect(html).toContain('MSFT');
    expect(html).toContain('Microsoft');
    expect(html).toContain('quality, software');
    expect(html).toContain('Durable software thesis');
  });

  it('renders validation errors for invalid populated input', () => {
    const invalidForm = {
      ...createEmptyWatchlistForm('invalid'),
      companyName: '   ',
      ticker: 'bad ticker'
    };

    const html = renderToStaticMarkup(
      <WatchlistScreen initialForm={invalidForm} />
    );

    expect(html).toContain('Validation');
    expect(html).toContain('Watchlist ticker must be a valid ticker symbol.');
    expect(html).toContain(
      'Watchlist company name cannot be blank when provided.'
    );
  });

  it('converts populated form input into a validated watchlist item', () => {
    const form = watchlistItemToForm(sampleItem);
    const result = buildWatchlistItemFromForm({
      ...form,
      companyName: ' Microsoft ',
      tags: 'quality, software, quality',
      ticker: ' msft '
    });

    expect(result.validation.valid).toBe(true);
    expect(result.item).toMatchObject({
      companyName: 'Microsoft',
      tags: ['quality', 'software'],
      ticker: 'MSFT'
    });
  });

  it('upserts and removes local watchlist items deterministically', () => {
    const updatedItem = {
      ...sampleItem,
      note: 'Updated manual note.'
    };
    const addedItem: LocalWatchlistItem = {
      id: 'watchlist_added',
      ticker: 'ADBE'
    };

    const upsertedItems = upsertLocalWatchlistItem(
      upsertLocalWatchlistItem([sampleItem], updatedItem),
      addedItem
    );

    expect(upsertedItems).toEqual([updatedItem, addedItem]);
    expect(removeLocalWatchlistItem(upsertedItems, sampleItem.id)).toEqual([
      addedItem
    ]);
  });
});
