import { describe, expect, it } from 'vitest';
import {
  calculateMbsScore,
  createId,
  isValidTickerSymbol,
  normalizeTickerSymbol,
  validateHolding,
  validateReminder,
  validateThesisNote,
  validateWatchlistItem
} from './index';
import type { Holding, Reminder, ThesisNote, WatchlistItem } from './index';

describe('ticker helpers', () => {
  it('normalizes ticker symbols by trimming and uppercasing', () => {
    expect(normalizeTickerSymbol(' msft ')).toBe('MSFT');
    expect(normalizeTickerSymbol('brk.b')).toBe('BRK.B');
  });

  it('validates common ticker symbol formats', () => {
    expect(isValidTickerSymbol('AAPL')).toBe(true);
    expect(isValidTickerSymbol('brk.b')).toBe(true);
    expect(isValidTickerSymbol('BRK-B')).toBe(true);
    expect(isValidTickerSymbol('')).toBe(false);
    expect(isValidTickerSymbol('TOO-LONG-SYMBOL')).toBe(false);
    expect(isValidTickerSymbol('BAD!')).toBe(false);
    expect(isValidTickerSymbol('MSFT.')).toBe(false);
  });
});

describe('createId', () => {
  it('creates stable ids from the same prefix and seed', () => {
    expect(createId('holding', ['AAPL', 1])).toBe(
      createId('holding', ['AAPL', 1])
    );
  });

  it('uses the prefix in the generated id', () => {
    expect(createId('watchlist', 'AAPL').startsWith('watchlist_')).toBe(true);
  });
});

describe('validateHolding', () => {
  const validHolding: Holding = {
    id: createId('holding', 'AAPL'),
    ticker: 'AAPL',
    shares: 3,
    averageCost: 100,
    openedAt: '2026-01-31'
  };

  it('accepts a valid holding', () => {
    expect(validateHolding(validHolding)).toEqual({
      valid: true,
      errors: []
    });
  });

  it('rejects invalid holding values', () => {
    const result = validateHolding({
      ...validHolding,
      ticker: 'BAD!',
      shares: 0,
      averageCost: -1,
      openedAt: '2026-02-31'
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Holding ticker must be a valid ticker symbol.',
      'Holding shares must be greater than zero.',
      'Holding average cost cannot be negative.',
      'Holding opened date must use YYYY-MM-DD format.'
    ]);
  });
});

describe('validateWatchlistItem', () => {
  const validWatchlistItem: WatchlistItem = {
    id: createId('watchlist', 'MSFT'),
    ticker: 'MSFT',
    companyName: 'Microsoft',
    createdAt: '2026-05-12'
  };

  it('accepts a valid watchlist item', () => {
    expect(validateWatchlistItem(validWatchlistItem)).toEqual({
      valid: true,
      errors: []
    });
  });

  it('rejects invalid watchlist item values', () => {
    const result = validateWatchlistItem({
      ...validWatchlistItem,
      ticker: 'MS FT',
      companyName: '   ',
      createdAt: '2026-13-01'
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Watchlist ticker must be a valid ticker symbol.',
      'Watchlist company name cannot be blank when provided.',
      'Watchlist created date must use YYYY-MM-DD format.'
    ]);
  });
});

describe('validateThesisNote', () => {
  const validThesisNote: ThesisNote = {
    id: createId('thesis', 'AAPL thesis'),
    title: 'Durable services revenue',
    body: 'User-authored thesis note.',
    status: 'active',
    ticker: 'AAPL',
    createdAt: '2026-05-12',
    reviewDueAt: '2026-06-01'
  };

  it('accepts a valid thesis note', () => {
    expect(validateThesisNote(validThesisNote)).toEqual({
      valid: true,
      errors: []
    });
  });

  it('rejects invalid thesis note values', () => {
    const result = validateThesisNote({
      ...validThesisNote,
      title: '',
      body: '   ',
      status: 'unsupported',
      ticker: 'BAD!',
      reviewDueAt: '2026-02-29'
    } as unknown as ThesisNote);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Thesis note title is required.',
      'Thesis note body is required.',
      'Thesis note status is not supported.',
      'Thesis note ticker must be a valid ticker symbol.',
      'Thesis note review date must use YYYY-MM-DD format.'
    ]);
  });
});

describe('validateReminder', () => {
  const validReminder: Reminder = {
    id: createId('reminder', 'AAPL earnings'),
    title: 'Review earnings',
    dueDate: '2026-07-25',
    type: 'earnings',
    ticker: 'AAPL'
  };

  it('accepts a valid reminder', () => {
    expect(validateReminder(validReminder)).toEqual({
      valid: true,
      errors: []
    });
  });

  it('rejects invalid reminder values', () => {
    const result = validateReminder({
      ...validReminder,
      title: '',
      dueDate: '2026-04-31',
      type: 'unsupported',
      ticker: 'NOPE!'
    } as unknown as Reminder);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Reminder title is required.',
      'Reminder due date must use YYYY-MM-DD format.',
      'Reminder type is not supported.',
      'Reminder ticker must be a valid ticker symbol.'
    ]);
  });
});

describe('calculateMbsScore', () => {
  it('returns a typed placeholder score without implementing the engine', () => {
    expect(calculateMbsScore({ businessQuality: 4 })).toEqual({
      score: 0,
      maxScore: 100,
      rating: 'not-scored',
      completedCriteria: 1,
      input: {
        businessQuality: 4
      }
    });
  });
});
