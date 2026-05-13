import type {
  Holding,
  Reminder,
  ReminderType,
  ThesisNote,
  ThesisStatus,
  WatchlistItem
} from './domain';

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;

const THESIS_STATUSES = new Set<ThesisStatus>([
  'draft',
  'active',
  'watch',
  'challenged',
  'broken',
  'closed'
]);

const REMINDER_TYPES = new Set<ReminderType>([
  'earnings',
  'thesis-review',
  'custom'
]);

export function normalizeTickerSymbol(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function isValidTickerSymbol(ticker: string): boolean {
  const normalizedTicker = normalizeTickerSymbol(ticker);

  return (
    TICKER_PATTERN.test(normalizedTicker) &&
    !normalizedTicker.endsWith('.') &&
    !normalizedTicker.endsWith('-') &&
    !normalizedTicker.includes('..') &&
    !normalizedTicker.includes('--') &&
    !normalizedTicker.includes('.-') &&
    !normalizedTicker.includes('-.')
  );
}

export function validateHolding(holding: Holding): ValidationResult {
  const errors: string[] = [];

  if (!isValidTickerSymbol(holding.ticker)) {
    errors.push('Holding ticker must be a valid ticker symbol.');
  }

  if (!isPositiveNumber(holding.shares)) {
    errors.push('Holding shares must be greater than zero.');
  }

  if (
    holding.averageCost !== undefined &&
    !isNonNegativeNumber(holding.averageCost)
  ) {
    errors.push('Holding average cost cannot be negative.');
  }

  if (holding.openedAt !== undefined && !isValidIsoDate(holding.openedAt)) {
    errors.push('Holding opened date must use YYYY-MM-DD format.');
  }

  return toValidationResult(errors);
}

export function validateWatchlistItem(
  item: WatchlistItem
): ValidationResult {
  const errors: string[] = [];

  if (!isValidTickerSymbol(item.ticker)) {
    errors.push('Watchlist ticker must be a valid ticker symbol.');
  }

  if (item.companyName !== undefined && !isNonEmptyString(item.companyName)) {
    errors.push('Watchlist company name cannot be blank when provided.');
  }

  if (item.createdAt !== undefined && !isValidIsoDate(item.createdAt)) {
    errors.push('Watchlist created date must use YYYY-MM-DD format.');
  }

  return toValidationResult(errors);
}

export function validateThesisNote(note: ThesisNote): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(note.title)) {
    errors.push('Thesis note title is required.');
  }

  if (!isNonEmptyString(note.body)) {
    errors.push('Thesis note body is required.');
  }

  if (!THESIS_STATUSES.has(note.status)) {
    errors.push('Thesis note status is not supported.');
  }

  if (note.ticker !== undefined && !isValidTickerSymbol(note.ticker)) {
    errors.push('Thesis note ticker must be a valid ticker symbol.');
  }

  if (note.createdAt !== undefined && !isValidIsoDate(note.createdAt)) {
    errors.push('Thesis note created date must use YYYY-MM-DD format.');
  }

  if (note.updatedAt !== undefined && !isValidIsoDate(note.updatedAt)) {
    errors.push('Thesis note updated date must use YYYY-MM-DD format.');
  }

  if (note.reviewDueAt !== undefined && !isValidIsoDate(note.reviewDueAt)) {
    errors.push('Thesis note review date must use YYYY-MM-DD format.');
  }

  return toValidationResult(errors);
}

export function validateReminder(reminder: Reminder): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(reminder.title)) {
    errors.push('Reminder title is required.');
  }

  if (!isValidIsoDate(reminder.dueDate)) {
    errors.push('Reminder due date must use YYYY-MM-DD format.');
  }

  if (!REMINDER_TYPES.has(reminder.type)) {
    errors.push('Reminder type is not supported.');
  }

  if (reminder.ticker !== undefined && !isValidTickerSymbol(reminder.ticker)) {
    errors.push('Reminder ticker must be a valid ticker symbol.');
  }

  if (
    reminder.completedAt !== undefined &&
    !isValidIsoDate(reminder.completedAt)
  ) {
    errors.push('Reminder completed date must use YYYY-MM-DD format.');
  }

  if (reminder.createdAt !== undefined && !isValidIsoDate(reminder.createdAt)) {
    errors.push('Reminder created date must use YYYY-MM-DD format.');
  }

  return toValidationResult(errors);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  return day >= 1 && day <= daysInMonth(year, month);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function toValidationResult(errors: string[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors
  };
}
