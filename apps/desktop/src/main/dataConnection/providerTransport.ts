import type { ConnectionErrorCode, ConnectionResult } from '../../shared/companyDetails';
const MAX_BYTES = 1024 * 1024;
const endpoint = 'https://www.alphavantage.co/query';
const messages: Partial<Record<ConnectionErrorCode, string>> = {
  'invalid-key': 'Check the API key in Settings.', forbidden: 'The provider does not permit this request.',
  'rate-limited': 'The provider request limit was reached. Try again later.', network: 'Company details could not be retrieved.',
  'invalid-response': 'The provider returned an unsupported response.', cancelled: 'The request was cancelled.',
  'invalid-request': 'The company lookup request is invalid.'
};
function failure(code: ConnectionErrorCode, retryAt?: string): ConnectionResult<never> {
  return { ok: false, error: { code, message: messages[code] ?? 'Company details are unavailable.', ...(retryAt ? { retryAt } : {}) } };
}
function retryTime(raw: string | null, now: number): string | undefined {
  if (!raw) return undefined;
  const milliseconds = /^\d+$/.test(raw) ? now + Number(raw) * 1000 : Date.parse(raw);
  return Number.isFinite(milliseconds) && milliseconds > now && milliseconds <= now + 7 * 86400000
    ? new Date(milliseconds).toISOString() : undefined;
}

/** Fixed endpoint transport for a future adapter. Not connected to the production service in Stage 2A. */
export async function requestCompanyOverview(
  input: { symbol: string; key: string; signal: AbortSignal },
  options: { fetcher?: typeof fetch; now?: () => number } = {}
): Promise<ConnectionResult<unknown>> {
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(input.symbol) || !/^[\x21-\x7e]{1,256}$/.test(input.key)) return failure('invalid-request');
  if (input.signal.aborted) return failure('cancelled');
  try {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ function: 'OVERVIEW', symbol: input.symbol, apikey: input.key }).toString();
    const response = await (options.fetcher ?? fetch)(url, {
      method: 'GET', redirect: 'error', credentials: 'omit', signal: input.signal,
      headers: { Accept: 'application/json' }
    });
    if (response.redirected || (response.url && new URL(response.url).origin !== new URL(endpoint).origin)) {
      await response.body?.cancel(); return failure('invalid-response');
    }
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401) return failure('invalid-key');
      if (response.status === 403) return failure('forbidden');
      if (response.status === 429) return failure('rate-limited', retryTime(response.headers.get('retry-after'), (options.now ?? Date.now)()));
      return failure('network');
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES || !response.body) {
      await response.body?.cancel(); return failure('invalid-response');
    }
    const reader = response.body.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); return failure('invalid-response'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    if (input.signal.aborted) return failure('cancelled');
    let parsed: unknown;
    try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return failure('invalid-response'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return failure('invalid-response');
    const body = parsed as Record<string, unknown>;
    // Error envelopes use HTTP 200 too. Never forward their text (it may echo credentials).
    if ('Note' in body) return failure('rate-limited');
    if ('Information' in body) return failure(typeof body.Information === 'string' && /rate limit|call frequency|requests per day/i.test(body.Information) ? 'rate-limited' : 'forbidden');
    if ('Error Message' in body) return failure('invalid-response');
    return { ok: true, value: body };
  } catch { return failure(input.signal.aborted ? 'cancelled' : 'network'); }
}
