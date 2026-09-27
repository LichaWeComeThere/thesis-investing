import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createRequestBudget, type RequestBudget } from './requestBudget';

const directories: string[] = [];
const budgets: RequestBudget[] = [];
const directory = () => { const path = mkdtempSync(join(tmpdir(), 'provider-budget-')); directories.push(path); return path; };
const open = (options: Parameters<typeof createRequestBudget>[0]) => { const budget = createRequestBudget(options); budgets.push(budget); return budget; };
afterEach(() => { budgets.splice(0).forEach(budget => budget.close()); directories.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })); });

describe('persistent operational request budget', () => {
  it('reserves attempts before a call and preserves minimum spacing after reopening', () => {
    let time = Date.parse('2026-09-27T02:00:00.000Z'); const initial = time;
    const options = { directory: directory(), now: () => time };
    const first = open(options); expect(first.reserve()).toEqual({ allowed: true }); first.close();
    const reopened = open(options);
    expect(reopened.reserve()).toEqual({ allowed: false, reason: 'rate-limited', retryAt: new Date(initial + 15_000).toISOString() });
    time += 15_000; expect(reopened.reserve()).toEqual({ allowed: true });
  });
  it('allows only 25 attempts in a rolling day and ages the oldest attempt independently', () => {
    let time = Date.parse('2026-09-27T02:00:00.000Z'); const initial = time;
    const options = { directory: directory(), now: () => time }; const budget = open(options);
    for (let index = 0; index < 25; index++) { expect(budget.reserve().allowed).toBe(true); time += 15_000; }
    budget.close();
    const reopened = open(options);
    expect(reopened.reserve()).toEqual({ allowed: false, reason: 'rate-limited', retryAt: new Date(initial + 86_400_000).toISOString() });
    time = initial + 86_400_000; expect(reopened.reserve().allowed).toBe(true);
    time += 15_000; expect(reopened.reserve().allowed).toBe(true);
  });
  it('honors provider cooldown across reopen and supplies a conservative fallback', () => {
    let time = Date.parse('2026-09-27T02:00:00.000Z'); const options = { directory: directory(), now: () => time };
    const first = open(options); first.cooldown(new Date(time + 120_000).toISOString()); first.close();
    const reopened = open(options);
    expect(reopened.reserve()).toMatchObject({ allowed: false, retryAt: new Date(time + 120_000).toISOString() });
    time += 120_000; expect(reopened.reserve().allowed).toBe(true);
    reopened.cooldown('not-a-date');
    expect(reopened.reserve()).toMatchObject({ allowed: false, retryAt: new Date(time + 60_000).toISOString() });
  });
  it('does not forget an attempt when the clock moves backward', () => {
    let time = Date.parse('2026-09-27T02:00:00.000Z'); const initial = time;
    const budget = open({ directory: directory(), now: () => time }); budget.reserve(); time -= 86_400_000;
    expect(budget.reserve()).toMatchObject({ allowed: false, retryAt: new Date(initial + 15_000).toISOString() });
  });
  it('fails closed for a corrupt or empty existing ledger and when storage is unavailable', () => {
    for (const contents of ['corrupt ledger', '']) {
      const path = directory(); writeFileSync(join(path, 'provider-request-budget.sqlite'), contents);
      expect(open({ directory: path }).reserve()).toEqual({ allowed: false, reason: 'storage' });
    }
    const path = join(directory(), 'not-directory'); writeFileSync(path, 'file');
    expect(open({ directory: path }).reserve()).toEqual({ allowed: false, reason: 'storage' });
  });
  it('shares reservations across two open handles and rejects use after close', () => {
    const options = { directory: directory() }; const first = open(options); const second = open(options);
    expect(first.reserve().allowed).toBe(true); expect(second.reserve().allowed).toBe(false);
    first.close(); expect(first.reserve()).toEqual({ allowed: false, reason: 'storage' });
  });
});
