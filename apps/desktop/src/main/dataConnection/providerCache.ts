import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { CompanyDetails } from '../../shared/companyDetails';
import { validateCompanyDetails } from './companyDetailsValidation';

const DAY = 86_400_000;
export const COMPANY_DETAILS_FRESHNESS_MS = 7 * DAY;
export const COMPANY_DETAILS_RETENTION_MS = 30 * DAY;
const MAX_ENTRIES = 500;
const require = createRequire(import.meta.url);

export interface ProviderCache {
  get(symbol: string): CompanyDetails | null;
  put(details: CompanyDetails): void;
  clear(): void;
  close(): void;
}

/** Session only unless retention/display rights have explicitly been established. */
export function createProviderCache(options: {
  now?: () => number;
  persistence?: { directory: string; allowed: true };
} = {}): ProviderCache {
  const now = options.now ?? Date.now;
  const memory = new Map<string, CompanyDetails>();
  let database: DatabaseSync | undefined;
  let failed = false;
  let closed = false;
  if (options.persistence?.allowed === true) {
    try {
      mkdirSync(options.persistence.directory, { recursive: true, mode: 0o700 });
      const { DatabaseSync: Database } = require('node:sqlite') as typeof import('node:sqlite');
      database = new Database(join(options.persistence.directory, 'provider-cache.sqlite'));
      database.exec('CREATE TABLE IF NOT EXISTS company_details (symbol TEXT PRIMARY KEY, data TEXT NOT NULL)');
    } catch {
      try { database?.close(); } catch { /* Disposable cache cannot block app startup. */ }
      database = undefined;
      failed = true;
    }
  }
  const assertAvailable = () => {
    if (closed || failed) throw new Error('Provider cache unavailable.');
  };
  const erase = (symbol: string) => {
    if (database) database.prepare('DELETE FROM company_details WHERE symbol = ?').run(symbol);
    else memory.delete(symbol);
  };
  const entries = (): CompanyDetails[] => {
    assertAvailable();
    const values: CompanyDetails[] = [];
    if (database) {
      for (const row of database.prepare('SELECT symbol, data FROM company_details').all()) {
        let value: CompanyDetails | null = null;
        try { value = validateCompanyDetails(JSON.parse(String(row.data)), String(row.symbol)); } catch { /* Invalid disposable row. */ }
        if (value) values.push(value);
        else erase(String(row.symbol));
      }
    } else values.push(...memory.values());
    const retained = values.filter(value => {
      if (now() - Date.parse(value.retrievedAt) >= COMPANY_DETAILS_RETENTION_MS) {
        erase(value.providerSymbol);
        return false;
      }
      return true;
    }).sort((a, b) => Date.parse(b.retrievedAt) - Date.parse(a.retrievedAt) || a.providerSymbol.localeCompare(b.providerSymbol));
    for (const entry of retained.slice(MAX_ENTRIES)) erase(entry.providerSymbol);
    return retained.slice(0, MAX_ENTRIES);
  };
  return {
    get(symbol) {
      const entry = entries().find(value => value.providerSymbol === symbol);
      return entry ? { ...entry } : null;
    },
    put(details) {
      assertAvailable();
      const value = validateCompanyDetails(details, details.providerSymbol);
      if (!value) throw new Error('Invalid provider cache entry.');
      if (database) database.prepare('INSERT INTO company_details(symbol, data) VALUES (?, ?) ON CONFLICT(symbol) DO UPDATE SET data=excluded.data')
        .run(value.providerSymbol, JSON.stringify(value));
      else memory.set(value.providerSymbol, value);
      entries();
    },
    clear() {
      assertAvailable();
      if (database) database.exec('DELETE FROM company_details');
      memory.clear();
    },
    close() {
      if (closed) return;
      closed = true;
      memory.clear();
      try { database?.close(); } catch { /* Closing is best effort; research storage is independent. */ }
    }
  };
}
