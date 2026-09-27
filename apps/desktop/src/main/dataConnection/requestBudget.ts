import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const WINDOW_MS = 24 * 60 * 60 * 1000;
const SPACING_MS = 15_000;
const LIMIT = 25;
const FALLBACK_COOLDOWN_MS = 60_000;
export type BudgetReservation = { allowed: true } | { allowed: false; reason: 'storage' | 'rate-limited'; retryAt?: string };
export interface RequestBudget {
  reserve(): BudgetReservation;
  cooldown(retryAt?: string): void;
  close(): void;
}

/** Operational accounting is intentionally separate from disposable provider data. */
export function createRequestBudget(options: { directory: string; now?: () => number }): RequestBudget {
  const now = options.now ?? Date.now;
  let database: DatabaseSync | undefined;
  let failed = false;
  let closed = false;
  try {
    mkdirSync(options.directory, { recursive: true, mode: 0o700 });
    const filename = join(options.directory, 'provider-request-budget.sqlite');
    const existed = existsSync(filename);
    const { DatabaseSync: Database } = require('node:sqlite') as typeof import('node:sqlite');
    database = new Database(filename);
    database.exec('PRAGMA busy_timeout = 1000');
    if (!existed) database.exec(`BEGIN IMMEDIATE;
      CREATE TABLE attempts (id INTEGER PRIMARY KEY, attempted_at INTEGER NOT NULL);
      CREATE TABLE budget_state (id INTEGER PRIMARY KEY CHECK(id=1), cooldown_until INTEGER NOT NULL);
      INSERT INTO budget_state VALUES(1,0);
      PRAGMA user_version = 1;
      COMMIT;`);
    if (database.prepare('PRAGMA user_version').get()?.user_version !== 1 ||
      database.prepare('PRAGMA quick_check').get()?.quick_check !== 'ok') throw new Error('Invalid ledger.');
  } catch {
    failed = true;
    try { database?.close(); } catch { /* Fail closed and retain corrupt ledger for diagnosis. */ }
    database = undefined;
  }
  const read = () => {
    if (closed || failed || !database) throw new Error('Ledger unavailable.');
    const states = database.prepare('SELECT id, cooldown_until FROM budget_state').all();
    const timestamps = database.prepare('SELECT attempted_at FROM attempts ORDER BY attempted_at ASC').all().map(row => row.attempted_at);
    if (states.length !== 1 || states[0].id !== 1 || !Number.isSafeInteger(states[0].cooldown_until) || Number(states[0].cooldown_until) < 0 ||
      timestamps.some(time => !Number.isSafeInteger(time) || Number(time) < 0)) throw new Error('Invalid ledger.');
    return { cooldown: Number(states[0].cooldown_until), timestamps: timestamps as number[] };
  };
  const transaction = <T>(operation: () => T): T => {
    if (closed || failed || !database) throw new Error('Ledger unavailable.');
    database.exec('BEGIN IMMEDIATE');
    try { const result = operation(); database.exec('COMMIT'); return result; }
    catch { try { database.exec('ROLLBACK'); } catch { /* Preserve original fail-closed state. */ } failed = true; throw new Error('Ledger unavailable.'); }
  };
  return {
    reserve() {
      try {
        return transaction(() => {
          const time = now();
          if (!Number.isSafeInteger(time) || time < 0) throw new Error('Invalid clock.');
          const ledger = read();
          const recent = ledger.timestamps.filter(attempt => attempt > time - WINDOW_MS);
          const last = ledger.timestamps.at(-1);
          const quotaRetry = recent.length >= LIMIT ? recent[recent.length - LIMIT] + WINDOW_MS : 0;
          const retry = Math.max(ledger.cooldown, last === undefined ? 0 : last + SPACING_MS, quotaRetry);
          if (retry > time) return { allowed: false as const, reason: 'rate-limited' as const, retryAt: new Date(retry).toISOString() };
          database!.prepare('DELETE FROM attempts WHERE attempted_at <= ?').run(time - WINDOW_MS);
          database!.prepare('INSERT INTO attempts(attempted_at) VALUES (?)').run(time);
          return { allowed: true as const };
        });
      } catch { failed = true; return { allowed: false, reason: 'storage' }; }
    },
    cooldown(retryAt) {
      try {
        transaction(() => {
          const ledger = read();
          const time = now();
          const requested = retryAt ? Date.parse(retryAt) : NaN;
          const until = Number.isFinite(requested) && requested > time ? requested : time + FALLBACK_COOLDOWN_MS;
          database!.prepare('UPDATE budget_state SET cooldown_until = ? WHERE id=1').run(Math.max(ledger.cooldown, until));
        });
      } catch { failed = true; }
    },
    close() {
      if (closed) return;
      closed = true;
      try { database?.close(); } catch { /* Already unavailable. */ }
    }
  };
}
