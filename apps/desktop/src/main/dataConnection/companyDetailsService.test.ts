import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompanyDetails, CompanyDetailsView, ConnectionResult } from '../../shared/companyDetails';
import { createCompanyDetailsService, type CompanyDetailsAdapter, type CompanyDetailsService } from './companyDetailsService';
import { createProviderCache } from './providerCache';
import type { CredentialStore } from './credentialStore';
import type { RequestBudget } from './requestBudget';

const initialTime = Date.parse('2026-09-27T02:00:00.000Z');
const details = (symbol = 'ACME'): CompanyDetails => ({ schemaVersion: 1, provider: 'alpha-vantage', providerSymbol: symbol, companyName: 'Fictional Research Company', exchange: 'NASDAQ', sector: null, industry: 'Software', country: 'USA', currency: 'USD', retrievedAt: '2020-01-01T00:00:00.000Z', sourceUpdatedAt: null });
const services: CompanyDetailsService[] = [];
afterEach(() => { services.splice(0).forEach(service => service.close()); vi.useRealTimers(); });
function setup(adapter?: CompanyDetailsAdapter) {
  let clock = initialTime;
  let ticker = 'ACME';
  let key: string | null = 'test-secret-key';
  const credentials: CredentialStore = { status: vi.fn(async () => key ? 'configured' : 'not-configured'), readKey: vi.fn(async () => key), storeKey: vi.fn(async value => { key = value; }), remove: vi.fn(async () => { key = null; }) };
  const cache = createProviderCache({ now: () => clock });
  const budget: RequestBudget = { reserve: vi.fn(() => ({ allowed: true as const })), cooldown: vi.fn(), close: vi.fn() };
  const getThesis = vi.fn(async (id: string) => id === 'missing' ? undefined : ({ id, ticker: id.startsWith('symbol-') ? id.slice(7) : ticker }));
  const service = createCompanyDetailsService({ credentials, cache, budget, getThesis, adapter, now: () => clock });
  services.push(service);
  return { service, cache, budget, credentials, getThesis, setTicker: (value: string) => { ticker = value; }, setTime: (value: number) => { clock = value; } };
}
function value(result: ConnectionResult<CompanyDetailsView>) { expect(result.ok).toBe(true); if (!result.ok) throw new Error('Unexpected failure'); return result.value; }
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
function pendingAdapter() {
  const pending: { symbol: string; signal: AbortSignal; resolve: (value: ConnectionResult<CompanyDetails>) => void }[] = [];
  const adapter = vi.fn<CompanyDetailsAdapter>(async ({ symbol, signal }) => new Promise(resolve => pending.push({ symbol, signal, resolve })));
  return { pending, adapter };
}

describe('optional company details service', () => {
  it('does no request or key read when the runtime adapter is absent', async () => {
    const { service, budget, credentials } = setup();
    expect(value(await service.refresh('thesis')).error?.code).toBe('unsupported');
    expect(await service.status()).toEqual({ ok: true, value: { provider: 'alpha-vantage', configured: true, secureStorageAvailable: true, adapterAvailable: false } });
    expect(credentials.readKey).not.toHaveBeenCalled(); expect(budget.reserve).not.toHaveBeenCalled();
  });
  it('validates saved identity, normalizes the symbol, sets retrieval time, and does not modify research', async () => {
    const adapter = vi.fn<CompanyDetailsAdapter>(async ({ symbol }) => ({ ok: true, value: { ...details(symbol), rawPayload: 'discard' } as CompanyDetails }));
    const { service, setTicker, getThesis } = setup(adapter); setTicker(' acme ');
    const result = value(await service.refresh('thesis'));
    expect(result).toMatchObject({ thesisId: 'thesis', ticker: ' acme ', freshness: 'fresh', data: { providerSymbol: 'ACME', retrievedAt: new Date(initialTime).toISOString() } });
    expect(result.data).not.toHaveProperty('rawPayload'); expect(getThesis).toHaveBeenCalledTimes(2);
    expect(await service.refresh('missing')).toMatchObject({ ok: false, error: { code: 'not-found' } });
    expect(await service.refresh('')).toMatchObject({ ok: false, error: { code: 'invalid-request' } });
    setTicker('INVALID/SYMBOL'); expect(value(await service.refresh('thesis')).error?.code).toBe('unsupported');
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it('getCached never sends requests and distinguishes fresh, stale, future, and expired values', async () => {
    const adapter = vi.fn<CompanyDetailsAdapter>(); const { service, cache, setTime } = setup(adapter);
    cache.put({ ...details(), retrievedAt: new Date(initialTime).toISOString() });
    expect(value(await service.getCached('thesis')).freshness).toBe('fresh');
    setTime(initialTime - 1); expect(value(await service.getCached('thesis')).freshness).toBe('stale');
    setTime(initialTime + 7 * 86_400_000); expect(value(await service.getCached('thesis')).freshness).toBe('stale');
    setTime(initialTime + 30 * 86_400_000); expect(value(await service.getCached('thesis')).freshness).toBe('unavailable');
    expect(adapter).not.toHaveBeenCalled();
  });
  it('coalesces the same symbol, serializes different symbols, and bounds queued symbols to five', async () => {
    const { adapter, pending } = pendingAdapter(); const { service, budget } = setup(adapter);
    const first = service.refresh('first'); const same = service.refresh('second'); await flush();
    expect(adapter).toHaveBeenCalledTimes(1);
    const queued = ['B', 'C', 'D', 'E', 'F'].map(symbol => service.refresh(`symbol-${symbol}`)); await flush();
    expect(value(await service.refresh('symbol-G')).error?.code).toBe('busy');
    expect(adapter).toHaveBeenCalledTimes(1);
    pending[0].resolve({ ok: true, value: details() }); await flush();
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(value(await first).thesisId).toBe('first'); expect(value(await same).thesisId).toBe('second');
    for (let index = 1; index <= 5; index++) { pending[index].resolve({ ok: true, value: details(pending[index].symbol) }); await flush(); }
    await Promise.all(queued); expect(budget.reserve).toHaveBeenCalledTimes(6);
  });
  it('times out after ten seconds, aborts transport, and never caches a late result or retries', async () => {
    vi.useFakeTimers(); const { adapter, pending } = pendingAdapter(); const { service, cache, budget } = setup(adapter);
    const request = service.refresh('thesis'); await flush(); await vi.advanceTimersByTimeAsync(10_000);
    expect(value(await request).error?.code).toBe('timeout'); expect(pending[0].signal.aborted).toBe(true);
    pending[0].resolve({ ok: true, value: details() }); await flush(); expect(cache.get('ACME')).toBeNull();
    expect(adapter).toHaveBeenCalledTimes(1); expect(budget.reserve).toHaveBeenCalledTimes(1);
  });
  it.each(['remove', 'key-change', 'close'] as const)('invalidates queued and active work on %s, even if transport ignores abort', async action => {
    const { adapter, pending } = pendingAdapter(); const { service, cache } = setup(adapter);
    const first = service.refresh('thesis'); const second = service.refresh('symbol-OTHER'); await flush();
    if (action === 'remove') await service.remove(); else if (action === 'key-change') await service.saveKey('new-key'); else service.close();
    expect(await first).toMatchObject({ ok: false, error: { code: 'cancelled' } });
    expect(await second).toMatchObject({ ok: false, error: { code: 'cancelled' } });
    expect(pending[0].signal.aborted).toBe(true);
    pending[0].resolve({ ok: true, value: details() }); await flush();
    if (action !== 'close') expect(cache.get('ACME')).toBeNull();
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it('rechecks the saved ticker and never returns data attached to an outdated target', async () => {
    const { adapter, pending } = pendingAdapter(); const { service, setTicker } = setup(adapter);
    const request = service.refresh('thesis'); await flush(); setTicker('OTHER'); pending[0].resolve({ ok: true, value: details() });
    expect(await request).toMatchObject({ ok: false, error: { code: 'cancelled' } });
  });
  it.each(['getCached', 'refresh'] as const)('cancels %s if removal happens while its final identity read is pending', async method => {
    const context = setup(async () => ({ ok: true, value: details() }));
    let resolveRead!: (value: { id: string; ticker: string }) => void;
    if (method === 'refresh') context.getThesis.mockResolvedValueOnce({ id: 'thesis', ticker: 'ACME' });
    context.getThesis.mockImplementationOnce(async () => new Promise(resolve => { resolveRead = resolve; }));
    const request = context.service[method]('thesis'); await flush();
    expect(resolveRead).toBeDefined();
    await context.service.remove(); resolveRead({ id: 'thesis', ticker: 'ACME' });
    expect(await request).toMatchObject({ ok: false, error: { code: 'cancelled' } });
  });
  it('retains cached data and its age after sanitized failures, and records provider cooldown', async () => {
    const adapter = vi.fn<CompanyDetailsAdapter>(async () => ({ ok: false, error: { code: 'rate-limited', message: 'LEAK test-secret-key https://api/?apikey=secret', retryAt: '2026-09-27T02:02:00.000Z' } }));
    const { service, cache, budget } = setup(adapter); const retrievedAt = '2026-09-19T02:00:00.000Z'; cache.put({ ...details(), retrievedAt });
    const result = value(await service.refresh('thesis'));
    expect(result).toMatchObject({ freshness: 'stale', data: { retrievedAt }, error: { code: 'rate-limited', retryAt: '2026-09-27T02:02:00.000Z' } });
    expect(JSON.stringify(result)).not.toContain('secret'); expect(JSON.stringify(result)).not.toContain('LEAK');
    expect(budget.cooldown).toHaveBeenCalledWith('2026-09-27T02:02:00.000Z'); expect(adapter).toHaveBeenCalledTimes(1);
  });
  it('never spends quota without a key and obeys a fail-closed budget without a transport call', async () => {
    const adapter = vi.fn<CompanyDetailsAdapter>(); const { service, budget } = setup(adapter);
    await service.remove(); expect(value(await service.refresh('thesis')).error?.code).toBe('not-configured');
    expect(budget.reserve).not.toHaveBeenCalled(); await service.saveKey('new-key');
    vi.mocked(budget.reserve).mockReturnValue({ allowed: false, reason: 'storage' });
    expect(value(await service.refresh('thesis')).error?.code).toBe('storage'); expect(adapter).not.toHaveBeenCalled();
  });
  it.each([
    { ...details(), providerSymbol: 'OTHER' }, { ...details(), companyName: '' },
    { ...details(), sector: 'x'.repeat(129) }, { ...details(), sourceUpdatedAt: 'not-a-date' }
  ])('rejects unverified normalized fields', async invalid => {
    const { service, cache } = setup(async () => ({ ok: true, value: invalid }));
    expect(value(await service.refresh('thesis')).error?.code).toBe('invalid-response'); expect(cache.get('ACME')).toBeNull();
  });
  it('contains raw exceptions and cache-write failures without disclosing credentials', async () => {
    const { service } = setup(async () => { throw new Error('test-secret-key'); });
    const result = await service.refresh('thesis'); expect(value(result).error?.code).toBe('network'); expect(JSON.stringify(result)).not.toContain('test-secret-key');
    const other = setup(async () => ({ ok: true, value: details() })); vi.spyOn(other.cache, 'put').mockImplementation(() => { throw new Error('private path'); });
    expect(value(await other.service.refresh('thesis')).error?.code).toBe('storage');
  });
  it('validates key shape locally, exposes safe status only, and does not reset quota on removal/key replacement', async () => {
    const { service, budget, credentials } = setup();
    expect(await service.saveKey('bad key')).toMatchObject({ ok: false, error: { code: 'invalid-key' } });
    expect(credentials.storeKey).not.toHaveBeenCalled();
    expect(await service.saveKey('new-secret')).toMatchObject({ ok: true, value: { configured: true } });
    expect(await service.remove()).toMatchObject({ ok: true, value: { configured: false } });
    expect(budget.close).not.toHaveBeenCalled(); expect(budget.reserve).not.toHaveBeenCalled();
    expect(JSON.stringify(await service.status())).not.toContain('new-secret');
  });
});
