import type { CompanyDetails, ConnectionErrorCode, ConnectionResult } from '../../shared/companyDetails';
import type { CompanyDetailsAdapter } from './companyDetailsService';
import { hasControlCharacters, isTimestamp, normalizeCompanySymbol, validateCompanyDetails } from './companyDetailsValidation';
import { requestCompanyOverview } from './providerTransport';

// Deliberately narrow provisional scope. Entitled account coverage must be checked
// before calling these values verified; other exchanges/assets are unsupported.
export const SUPPORTED_ALPHA_VANTAGE_EXCHANGES = ['NYSE', 'NASDAQ'] as const;
export const SUPPORTED_ALPHA_VANTAGE_ASSET_TYPE = 'Common Stock';
const missingValues = new Set(['', 'none', 'null', 'n/a', '-']);
const messages = {
  unsupported: 'The provider could not verify a supported US-listed common stock for this ticker.',
  'invalid-response': 'The provider returned company details that could not be verified.',
  'invalid-request': 'The company lookup request is invalid.',
  'invalid-key': 'Check the API key in Settings.',
  forbidden: 'The provider does not permit this request.',
  'rate-limited': 'The provider request limit was reached. Try again later.',
  network: 'Company details could not be retrieved.',
  timeout: 'The company details request timed out. Try again later.',
  cancelled: 'The company details request was cancelled.'
} satisfies Partial<Record<ConnectionErrorCode, string>>;
type AdapterErrorCode = keyof typeof messages;
type OverviewTransport = (input: Parameters<CompanyDetailsAdapter>[0]) => Promise<ConnectionResult<unknown>>;

function failure(code: AdapterErrorCode, retryAt?: string): ConnectionResult<never> {
  return { ok: false, error: { code, message: messages[code], ...(code === 'rate-limited' && isTimestamp(retryAt) ? { retryAt } : {}) } };
}

/** undefined means malformed; null means absent or a provider missing-value marker. */
function textField(value: unknown, maximum: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > maximum || hasControlCharacters(value)) return undefined;
  const text = value.trim();
  return missingValues.has(text.toLowerCase()) ? null : text;
}

/** Main-process only: retain a small validated read model, never the provider body. */
export function createAlphaVantageCompanyDetailsAdapter(options: {
  transport?: OverviewTransport;
  now?: () => number;
} = {}): CompanyDetailsAdapter {
  const transport = options.transport ?? requestCompanyOverview;
  const now = options.now ?? Date.now;
  return async input => {
    if (normalizeCompanySymbol(input.symbol) !== input.symbol || typeof input.key !== 'string' || !/^[\x21-\x7e]{1,256}$/.test(input.key)) return failure('invalid-request');
    if (input.signal.aborted) return failure('cancelled');
    try {
      const response = await transport(input);
      if (input.signal.aborted) return failure('cancelled');
      if (!response || typeof response !== 'object' || typeof response.ok !== 'boolean') return failure('invalid-response');
      if (!response.ok) {
        const code = response.error?.code;
        return typeof code === 'string' && Object.hasOwn(messages, code)
          ? failure(code as AdapterErrorCode, response.error?.retryAt)
          : failure('invalid-response');
      }
      if (!response.value || typeof response.value !== 'object' || Array.isArray(response.value)) return failure('invalid-response');
      const body = response.value as Record<string, unknown>;
      // Transport handles these too; an error envelope is never a company profile.
      if (['Note', 'Information', 'Error Message'].some(field => Object.hasOwn(body, field))) return failure('invalid-response');
      const symbol = textField(body.Symbol, 12);
      const name = textField(body.Name, 256);
      const exchange = textField(body.Exchange, 128);
      const assetType = textField(body.AssetType, 128);
      if (symbol !== input.symbol || !name || !exchange ||
        !SUPPORTED_ALPHA_VANTAGE_EXCHANGES.some(supported => exchange === supported) ||
        assetType !== SUPPORTED_ALPHA_VANTAGE_ASSET_TYPE) return failure('unsupported');

      const sector = textField(body.Sector, 128);
      const industry = textField(body.Industry, 128);
      const country = textField(body.Country, 128);
      const currency = textField(body.Currency, 128);
      if ([sector, industry, country, currency].some(value => value === undefined)) return failure('invalid-response');
      // Even a syntactically valid response must not reflect the credential into
      // displayed/cached fields. Unused raw fields are discarded altogether.
      if ([symbol, name, exchange, sector, industry, country, currency].some(value => value?.includes(input.key))) return failure('invalid-response');
      const timestamp = new Date(now());
      if (!Number.isFinite(timestamp.getTime())) return failure('invalid-response');
      const details: CompanyDetails = {
        schemaVersion: 1, provider: 'alpha-vantage', providerSymbol: symbol,
        companyName: name, exchange, sector: sector ?? null, industry: industry ?? null,
        country: country ?? null, currency: currency ?? null,
        retrievedAt: timestamp.toISOString(),
        // LatestQuarter is a reporting period, not a record publication timestamp.
        sourceUpdatedAt: null
      };
      const validated = validateCompanyDetails(details, input.symbol);
      return validated ? { ok: true, value: validated } : failure('invalid-response');
    } catch { return failure(input.signal.aborted ? 'cancelled' : 'network'); }
  };
}
