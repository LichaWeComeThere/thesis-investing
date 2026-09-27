import type { CompanyDetails } from '../../shared/companyDetails';

export function normalizeCompanySymbol(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const symbol = value.trim().toUpperCase();
  return /^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol) ? symbol : null;
}

export function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

export const hasControlCharacters = (value: string): boolean => Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);

const plainText = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maximum && value.trim() === value &&
  !hasControlCharacters(value);

/** Copies only the supported normalized fields. No arbitrary provider payload is retained. */
export function validateCompanyDetails(value: unknown, symbol: string): CompanyDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1 || record.provider !== 'alpha-vantage' || record.providerSymbol !== symbol ||
    normalizeCompanySymbol(symbol) !== symbol || !plainText(record.companyName, 256) ||
    !isTimestamp(record.retrievedAt) || (record.sourceUpdatedAt !== null && !isTimestamp(record.sourceUpdatedAt))) return null;
  for (const field of ['exchange', 'sector', 'industry', 'country', 'currency']) {
    if (record[field] !== null && !plainText(record[field], 128)) return null;
  }
  return {
    schemaVersion: 1, provider: 'alpha-vantage', providerSymbol: symbol, companyName: record.companyName,
    exchange: record.exchange as string | null, sector: record.sector as string | null,
    industry: record.industry as string | null, country: record.country as string | null,
    currency: record.currency as string | null, retrievedAt: record.retrievedAt,
    sourceUpdatedAt: record.sourceUpdatedAt as string | null
  };
}
