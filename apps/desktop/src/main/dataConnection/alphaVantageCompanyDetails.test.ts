import { describe, expect, it, vi } from 'vitest';
import type { ConnectionResult } from '../../shared/companyDetails';
import { createAlphaVantageCompanyDetailsAdapter } from './alphaVantageCompanyDetails';

const retrievedAt = '2026-09-28T12:00:00.000Z';
const request = () => ({ symbol: 'EXM', key: 'synthetic-private-key', signal: new AbortController().signal });
// Fictional, minimal fixtures only. These do not establish live provider coverage.
const overview = (): Record<string, unknown> => ({
  Symbol: 'EXM', Name: 'Example Research Company', Exchange: 'NYSE', AssetType: 'Common Stock',
  Sector: 'TECHNOLOGY', Industry: 'FICTIONAL SERVICES', Country: 'USA', Currency: 'USD'
});
function setup(body: unknown = overview()) {
  const transport = vi.fn(async (): Promise<ConnectionResult<unknown>> => ({ ok: true, value: body }));
  const adapter = createAlphaVantageCompanyDetailsAdapter({ transport, now: () => Date.parse(retrievedAt) });
  return { adapter, transport };
}

describe('strict Alpha Vantage Company Overview adapter (synthetic responses only)', () => {
  it('maps only company identity and optional attributes with app retrieval provenance', async () => {
    const body = {
      ...overview(), Name: ' Example Research Company ', LatestQuarter: '2026-06-30',
      LastUpdated: '2026-09-27', Description: 'not retained', Website: 'https://unused.invalid',
      apikey: 'synthetic-private-key', MarketCapitalization: '123456'
    };
    const original = structuredClone(body);
    const { adapter, transport } = setup(body);
    const input = request();
    expect(await adapter(input)).toEqual({ ok: true, value: {
      schemaVersion: 1, provider: 'alpha-vantage', providerSymbol: 'EXM',
      companyName: 'Example Research Company', exchange: 'NYSE', sector: 'TECHNOLOGY',
      industry: 'FICTIONAL SERVICES', country: 'USA', currency: 'USD', retrievedAt,
      sourceUpdatedAt: null
    } });
    expect(transport).toHaveBeenCalledOnce();
    expect(transport).toHaveBeenCalledWith(input);
    expect(body).toEqual(original);
  });

  it.each(['NYSE', 'NASDAQ'])('accepts the provisional supported exchange value %s', async exchange => {
    const { adapter } = setup({ ...overview(), Exchange: exchange });
    expect(await adapter(request())).toMatchObject({ ok: true, value: { exchange } });
  });

  it('keeps an exact supported share-class symbol, without substituting another spelling', async () => {
    const { adapter } = setup({ ...overview(), Symbol: 'EXM.A' });
    expect(await adapter({ ...request(), symbol: 'EXM.A' })).toMatchObject({ ok: true, value: { providerSymbol: 'EXM.A' } });
    expect(await adapter({ ...request(), symbol: 'EXM-A' })).toMatchObject({ ok: false, error: { code: 'unsupported' } });
  });

  it.each([undefined, null, '', '  ', 'None', ' none ', 'null', 'N/A', '-'])('normalizes missing optional attributes (%s) without using industry as sector', async missing => {
    const { adapter } = setup({ ...overview(), Sector: missing, Country: missing, Currency: missing });
    expect(await adapter(request())).toMatchObject({ ok: true, value: {
      sector: null, country: null, currency: null, industry: 'FICTIONAL SERVICES'
    } });
  });

  it.each([
    {}, { Symbol: 'OTHER' }, { Symbol: 'exm' }, { Symbol: 'EXM.L' }, { Symbol: null },
    { Name: '' }, { Name: 'None' }, { Name: 123 }, { Name: 'x'.repeat(257) },
    { Name: 'Example\nCompany' }, { Exchange: null }, { Exchange: 'LSE' },
    { Exchange: 'NYSE ARCA' }, { Exchange: 'AMEX' }, { Exchange: 'NASDAQ/NYSE' },
    { Exchange: 'nasdaq' }, { AssetType: 'ETF' }, { AssetType: 'Fund' },
    { AssetType: null }, { AssetType: 'common stock' }
  ])('rejects absent or unsupported identity evidence: %j', async changed => {
    const body = Object.keys(changed).length ? { ...overview(), ...changed } : {};
    const { adapter } = setup(body);
    expect(await adapter(request())).toMatchObject({ ok: false, error: { code: 'unsupported' } });
  });

  it.each([
    { Sector: 0 }, { Industry: [] }, { Country: {} }, { Currency: false },
    { Sector: 'x'.repeat(129) }, { Industry: 'Example\u0000Industry' }, { Currency: 'US\u007fD' }
  ])('rejects malformed optional fields rather than caching or silently omitting them: %j', async changed => {
    const { adapter } = setup({ ...overview(), ...changed });
    expect(await adapter(request())).toMatchObject({ ok: false, error: { code: 'invalid-response' } });
  });

  it.each([null, [], 'profile', 123, { ...overview(), Information: 'synthetic-private-key' }])('rejects malformed or envelope payloads: %j', async body => {
    const result = await setup(body).adapter(request());
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-response' } });
    expect(JSON.stringify(result)).not.toContain('synthetic-private-key');
  });

  it('does not permit a credential reflected into a displayed company field', async () => {
    for (const field of ['Name', 'Sector', 'Industry', 'Country', 'Currency']) {
      const result = await setup({ ...overview(), [field]: 'value synthetic-private-key' }).adapter(request());
      expect(result).toMatchObject({ ok: false, error: { code: 'invalid-response' } });
      expect(JSON.stringify(result)).not.toContain('synthetic-private-key');
    }
  });

  it('validates normalized input before dispatch and forwards the actual abort signal', async () => {
    const { adapter, transport } = setup();
    for (const symbol of ['exm', ' EXM ', '', 'https://unused.invalid', 'EXM&apikey=other']) {
      expect(await adapter({ ...request(), symbol })).toMatchObject({ ok: false, error: { code: 'invalid-request' } });
    }
    for (const key of ['', 'bad key', 'bad\nkey', 'x'.repeat(257)]) {
      expect(await adapter({ ...request(), key })).toMatchObject({ ok: false, error: { code: 'invalid-request' } });
    }
    const controller = new AbortController(); controller.abort();
    expect(await adapter({ ...request(), signal: controller.signal })).toMatchObject({ ok: false, error: { code: 'cancelled' } });
    expect(transport).not.toHaveBeenCalled();
    const input = request();
    await adapter(input);
    expect(transport.mock.calls[0]).toEqual([input]);
  });

  it('discards an eventual successful transport result after cancellation', async () => {
    let resolve!: (value: ConnectionResult<unknown>) => void;
    const transport = vi.fn(async () => new Promise<ConnectionResult<unknown>>(done => { resolve = done; }));
    const adapter = createAlphaVantageCompanyDetailsAdapter({ transport });
    const controller = new AbortController();
    const pending = adapter({ ...request(), signal: controller.signal });
    controller.abort();
    resolve({ ok: true, value: overview() });
    expect(await pending).toMatchObject({ ok: false, error: { code: 'cancelled' } });
  });

  it('preserves meaningful error codes and a valid quota retry time without forwarding provider text', async () => {
    const { adapter, transport } = setup();
    for (const code of ['invalid-key', 'forbidden', 'rate-limited', 'network', 'timeout', 'cancelled', 'invalid-response'] as const) {
      transport.mockResolvedValueOnce({ ok: false, error: { code, message: 'https://unused.invalid?apikey=synthetic-private-key', retryAt: '2026-09-28T12:01:00.000Z' } });
      const result = await adapter(request());
      expect(result).toMatchObject({ ok: false, error: { code } });
      expect(JSON.stringify(result)).not.toContain('synthetic-private-key');
      if (code === 'rate-limited') expect(result).toMatchObject({ error: { retryAt: '2026-09-28T12:01:00.000Z' } });
      else expect(result).not.toHaveProperty('error.retryAt');
    }
    transport.mockResolvedValueOnce({ ok: false, error: { code: 'rate-limited', message: 'unused', retryAt: 'synthetic-private-key' } });
    expect(await adapter(request())).not.toHaveProperty('error.retryAt');
    transport.mockRejectedValueOnce(new Error('https://unused.invalid?apikey=synthetic-private-key'));
    const result = await adapter(request());
    expect(result).toMatchObject({ ok: false, error: { code: 'network' } });
    expect(JSON.stringify(result)).not.toContain('synthetic-private-key');
  });
});
