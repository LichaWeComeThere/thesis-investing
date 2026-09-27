import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { CompanyDetails } from '../../shared/companyDetails';
import { createProviderCache, COMPANY_DETAILS_RETENTION_MS, type ProviderCache } from './providerCache';

const timestamp = Date.parse('2026-09-27T02:00:00.000Z');
const entry = (symbol = 'ACME', time = timestamp): CompanyDetails => ({ schemaVersion: 1, provider: 'alpha-vantage', providerSymbol: symbol, companyName: 'Example Company', exchange: 'NASDAQ', sector: null, industry: null, country: null, currency: 'USD', retrievedAt: new Date(time).toISOString(), sourceUpdatedAt: null });
const directories: string[] = [];
const caches: ProviderCache[] = [];
const directory = () => { const path = mkdtempSync(join(tmpdir(), 'provider-cache-')); directories.push(path); return path; };
const open = (options?: Parameters<typeof createProviderCache>[0]) => { const cache = createProviderCache(options); caches.push(cache); return cache; };
afterEach(() => { caches.splice(0).forEach(cache => cache.close()); directories.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })); });

describe('disposable company details cache', () => {
  it('uses session memory by default and returns independent copies', () => {
    const cache = open({ now: () => timestamp }); cache.put(entry());
    const copy = cache.get('ACME')!; copy.companyName = 'changed';
    expect(cache.get('ACME')?.companyName).toBe('Example Company');
    expect(open({ now: () => timestamp }).get('ACME')).toBeNull();
  });
  it('persists only when explicitly allowed and expires at 30 days without extending on reads', () => {
    let time = timestamp;
    const options = { now: () => time, persistence: { directory: directory(), allowed: true as const } };
    const first = open(options); first.put(entry()); first.close();
    const reopened = open(options);
    time += COMPANY_DETAILS_RETENTION_MS - 1;
    expect(reopened.get('ACME')?.retrievedAt).toBe(new Date(timestamp).toISOString());
    time++;
    expect(reopened.get('ACME')).toBeNull();
  });
  it('evicts oldest retrievals over 500 entries; clears persistent data', () => {
    const cache = open({ now: () => timestamp, persistence: { directory: directory(), allowed: true } });
    for (let index = 0; index < 501; index++) cache.put(entry(`T${index}`, timestamp - 501 + index));
    expect(cache.get('T0')).toBeNull();
    expect(cache.get('T1')).not.toBeNull();
    expect(cache.get('T500')).not.toBeNull();
    cache.clear(); expect(cache.get('T500')).toBeNull();
  });
  it('rejects invalid identity and drops arbitrary fields', () => {
    const cache = open({ now: () => timestamp });
    expect(() => cache.put({ ...entry(), companyName: '' })).toThrow('Invalid provider cache entry');
    cache.put({ ...entry(), privatePayload: 'not-stored' } as CompanyDetails);
    expect(cache.get('ACME')).not.toHaveProperty('privatePayload');
  });
  it('isolates corrupt persistent cache failure and does not overwrite the corrupt file', () => {
    const path = directory(); writeFileSync(join(path, 'provider-cache.sqlite'), 'corrupt');
    const cache = open({ persistence: { directory: path, allowed: true } });
    expect(() => cache.get('ACME')).toThrow('Provider cache unavailable');
  });
});
