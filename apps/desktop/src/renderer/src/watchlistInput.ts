import {
  createId,
  normalizeTickerSymbol,
  validateWatchlistItem,
  type ValidationResult,
  type WatchlistItem
} from '@thesis-investing/core';

export type LocalWatchlistItem = WatchlistItem & {
  thesisReference?: string;
};

export type WatchlistFormState = {
  id: string;
  ticker: string;
  companyName: string;
  tags: string;
  note: string;
  thesisReference: string;
};

export type WatchlistFormResult = {
  item: LocalWatchlistItem;
  validation: ValidationResult;
};

export function createEmptyWatchlistForm(
  seed: string | number = 'draft'
): WatchlistFormState {
  return {
    companyName: '',
    id: createId('watchlist', ['local', seed]),
    note: '',
    tags: '',
    thesisReference: '',
    ticker: ''
  };
}

export function watchlistItemToForm(
  item: LocalWatchlistItem
): WatchlistFormState {
  return {
    companyName: item.companyName ?? '',
    id: item.id,
    note: item.note ?? '',
    tags: item.tags?.join(', ') ?? '',
    thesisReference: item.thesisReference ?? '',
    ticker: item.ticker
  };
}

export function buildWatchlistItemFromForm(
  form: WatchlistFormState
): WatchlistFormResult {
  const item: LocalWatchlistItem = {
    id: form.id,
    ticker: normalizeTickerSymbol(form.ticker)
  };

  if (form.companyName.length > 0) {
    item.companyName = form.companyName.trim();
  }

  const tags = parseWatchlistTags(form.tags);
  if (tags.length > 0) {
    item.tags = tags;
  }

  if (form.note.trim()) {
    item.note = form.note.trim();
  }

  if (form.thesisReference.trim()) {
    item.thesisReference = form.thesisReference.trim();
  }

  return {
    item,
    validation: validateWatchlistItem(item)
  };
}

export function hasWatchlistFormContent(form: WatchlistFormState): boolean {
  return [
    form.ticker,
    form.companyName,
    form.tags,
    form.note,
    form.thesisReference
  ].some((value) => value.trim().length > 0);
}

export function upsertLocalWatchlistItem(
  items: LocalWatchlistItem[],
  nextItem: LocalWatchlistItem
): LocalWatchlistItem[] {
  const existingItemIndex = items.findIndex((item) => item.id === nextItem.id);

  if (existingItemIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

export function removeLocalWatchlistItem(
  items: LocalWatchlistItem[],
  itemId: string
): LocalWatchlistItem[] {
  return items.filter((item) => item.id !== itemId);
}

function parseWatchlistTags(tags: string): string[] {
  const normalizedTags = tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set(normalizedTags)];
}
