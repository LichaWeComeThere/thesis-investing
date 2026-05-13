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
import type {
  Holding,
  ManualBusinessScoreInput,
  Reminder,
  ThesisNote,
  WatchlistItem
} from './index';

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
  it('calculates a complete weighted score from valid inputs', () => {
    expect(
      calculateMbsScore({
        businessQuality: 8,
        moat: 7,
        management: 9,
        balanceSheet: 6,
        growth: 7,
        valuation: 5,
        risk: 8
      })
    ).toEqual({
      score: 71.9,
      maxScore: 100,
      percentage: 71.9,
      rating: 'strong',
      completedCriteria: 7,
      missingCriteria: [],
      warnings: [],
      errors: [],
      input: {
        businessQuality: 8,
        moat: 7,
        management: 9,
        balanceSheet: 6,
        growth: 7,
        valuation: 5,
        risk: 8
      }
    });
  });

  it('handles partial scoring with missing criteria', () => {
    const result = calculateMbsScore({
      businessQuality: 8,
      moat: 6
    });

    expect(result.score).toBe(25);
    expect(result.percentage).toBe(25);
    expect(result.rating).toBe('incomplete');
    expect(result.completedCriteria).toBe(2);
    expect(result.missingCriteria).toEqual([
      'management',
      'balanceSheet',
      'growth',
      'valuation',
      'risk'
    ]);
    expect(result.warnings).toEqual([
      {
        code: 'missing-criteria',
        message: 'Score is incomplete because one or more criteria are missing.',
        categories: [
          'management',
          'balanceSheet',
          'growth',
          'valuation',
          'risk'
        ]
      }
    ]);
    expect(result.errors).toEqual([]);
  });

  it('returns validation errors for invalid category values', () => {
    const result = calculateMbsScore({
      businessQuality: -1,
      moat: 11,
      management: Number.NaN,
      balanceSheet: 'high',
      growth: 5
    } as unknown as ManualBusinessScoreInput);

    expect(result.score).toBe(6);
    expect(result.rating).toBe('incomplete');
    expect(result.completedCriteria).toBe(1);
    expect(result.missingCriteria).toEqual(['valuation', 'risk']);
    expect(result.errors.map((error) => error.category)).toEqual([
      'businessQuality',
      'moat',
      'management',
      'balanceSheet'
    ]);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'missing-criteria',
      'invalid-criteria-excluded'
    ]);
  });

  it('supports boundary values of 0 and 10', () => {
    expect(createCompleteMbsInput(0)).toMatchObject({
      businessQuality: 0,
      risk: 0
    });
    expect(calculateMbsScore(createCompleteMbsInput(0))).toMatchObject({
      score: 0,
      percentage: 0,
      rating: 'weak',
      completedCriteria: 7,
      missingCriteria: []
    });
    expect(calculateMbsScore(createCompleteMbsInput(10))).toMatchObject({
      score: 100,
      percentage: 100,
      rating: 'exceptional',
      completedCriteria: 7,
      missingCriteria: []
    });
  });

  it('assigns rating bands at deterministic thresholds', () => {
    expect(calculateMbsScore(createCompleteMbsInput(3.9)).rating).toBe('weak');
    expect(calculateMbsScore(createCompleteMbsInput(4)).rating).toBe('mixed');
    expect(calculateMbsScore(createCompleteMbsInput(6.5)).rating).toBe('strong');
    expect(calculateMbsScore(createCompleteMbsInput(8.5)).rating).toBe(
      'exceptional'
    );
  });

  it('does not let notes affect the score', () => {
    const withoutNotes = calculateMbsScore(createCompleteMbsInput(7));
    const withNotes = calculateMbsScore({
      ...createCompleteMbsInput(7),
      notes: 'This user-authored note is informational only.'
    });

    expect(withNotes.score).toBe(withoutNotes.score);
    expect(withNotes.percentage).toBe(withoutNotes.percentage);
    expect(withNotes.rating).toBe(withoutNotes.rating);
    expect(withNotes.completedCriteria).toBe(withoutNotes.completedCriteria);
  });

  it('returns deterministic output for repeated calls', () => {
    const input = {
      businessQuality: 9,
      moat: 8,
      management: 8,
      balanceSheet: 7,
      growth: 6,
      valuation: 5,
      risk: 8
    };

    expect(calculateMbsScore(input)).toEqual(calculateMbsScore(input));
  });
});

function createCompleteMbsInput(value: number): ManualBusinessScoreInput {
  return {
    businessQuality: value,
    moat: value,
    management: value,
    balanceSheet: value,
    growth: value,
    valuation: value,
    risk: value
  };
}
