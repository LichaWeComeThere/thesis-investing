import { describe, expect, it, vi } from 'vitest';
import { requestCompanyOverview } from './providerTransport';
const input = () => ({ symbol: 'EXM', key: 'synthetic-key', signal: new AbortController().signal });
const invoke = (response: Response) => requestCompanyOverview(input(), { fetcher: vi.fn<typeof fetch>(async () => response), now: () => Date.parse('2026-09-27T12:00:00.000Z') });

describe('bounded company data transport (mock HTTP only)', () => {
  it('uses only the fixed HTTPS endpoint with encoded parameters, GET and redirect rejection', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{"Symbol":"EXM","Name":"Example"}'));
    expect(await requestCompanyOverview(input(), { fetcher })).toEqual({ ok: true, value: { Symbol: 'EXM', Name: 'Example' } });
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe('https://www.alphavantage.co/query?function=OVERVIEW&symbol=EXM&apikey=synthetic-key');
    expect(options).toMatchObject({ method: 'GET', redirect: 'error', credentials: 'omit' });
    for (const symbol of ['https://evil.invalid', '', 'EXM&apikey=other', '../', 'X'.repeat(13)]) {
      expect((await requestCompanyOverview({ ...input(), symbol }, { fetcher })).ok).toBe(false);
    }
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([[401, 'invalid-key'], [403, 'forbidden'], [429, 'rate-limited'], [503, 'network']] as const)('maps HTTP %s without returning response text', async (status, code) => {
    const result = await invoke(new Response('synthetic-key', { status, headers: { 'retry-after': '60' } }));
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(JSON.stringify(result)).not.toContain('synthetic-key');
    if (status === 429) expect(result).toMatchObject({ error: { retryAt: '2026-09-27T12:01:00.000Z' } });
  });
  it('recognizes HTTP 200 informational/limit envelopes, malformed JSON and unexpected bodies', async () => {
    for (const body of ['null', '[]', '<html>synthetic-key</html>', '{"Error Message":"synthetic-key"}', '{"Information":"synthetic-key"}', '{"Note":"synthetic-key"}']) {
      const result = await invoke(new Response(body));
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result)).not.toContain('synthetic-key');
    }
    expect(await invoke(new Response('{"Information":"25 requests per day"}'))).toMatchObject({ error: { code: 'rate-limited' } });
  });
  it('bounds response bytes even without a content-length header', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(600000)); }, cancel });
    expect(await invoke(new Response(body))).toMatchObject({ error: { code: 'invalid-response' } });
    expect(cancel).toHaveBeenCalledOnce();
    expect(await invoke(new Response('{}', { headers: { 'content-length': '1048577' } }))).toMatchObject({ error: { code: 'invalid-response' } });
  });
  it('rejects unexpected redirect results and safely handles cancellation or thrown URL-bearing errors', async () => {
    const redirected = new Response('{}');
    Object.defineProperty(redirected, 'redirected', { value: true });
    expect(await invoke(redirected)).toMatchObject({ error: { code: 'invalid-response' } });
    const controller = new AbortController(); controller.abort();
    const fetcher = vi.fn<typeof fetch>(async () => { throw new Error('https://provider.invalid?apikey=synthetic-key'); });
    expect(await requestCompanyOverview({ ...input(), signal: controller.signal }, { fetcher })).toMatchObject({ error: { code: 'cancelled' } });
    expect(fetcher).not.toHaveBeenCalled();
    const result = await requestCompanyOverview(input(), { fetcher });
    expect(result).toMatchObject({ error: { code: 'network' } });
    expect(JSON.stringify(result)).not.toContain('synthetic-key');
  });
  it('passes cancellation through to an active response body and returns a sanitized result', async () => {
    const controller = new AbortController();
    let bodyRead!: () => void;
    const reading = new Promise<void>(resolve => { bodyRead = resolve; });
    const fetcher = vi.fn<typeof fetch>(async (_url, options) => new Response(new ReadableStream<Uint8Array>({
      start(stream) {
        options!.signal!.addEventListener('abort', () => stream.error(new Error('aborted synthetic-key')), { once: true });
      },
      pull() { bodyRead(); }
    })));
    const pending = requestCompanyOverview({ ...input(), signal: controller.signal }, { fetcher });
    await reading;
    controller.abort();
    const result = await pending;
    expect(result).toMatchObject({ ok: false, error: { code: 'cancelled' } });
    expect(JSON.stringify(result)).not.toContain('synthetic-key');
    expect(fetcher.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});
