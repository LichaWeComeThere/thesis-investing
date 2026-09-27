/** Optional provider data never changes user-owned thesis records. */
export type CompanyDetails = {
  schemaVersion: 1;
  provider: 'alpha-vantage';
  providerSymbol: string;
  companyName: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
};
export type ConnectionErrorCode = 'not-configured' | 'unsupported' | 'not-found' |
  'invalid-key' | 'forbidden' | 'rate-limited' | 'network' | 'timeout' |
  'invalid-response' | 'secure-storage-unavailable' | 'storage' | 'cancelled' | 'busy' | 'invalid-request';
export type ConnectionError = { code: ConnectionErrorCode; message: string; retryAt?: string };
export type ConnectionResult<T> = { ok: true; value: T } | { ok: false; error: ConnectionError };
export type ConnectionStatus = { provider: 'alpha-vantage'; configured: boolean; secureStorageAvailable: boolean; adapterAvailable: boolean };
export type CompanyDetailsView = {
  thesisId: string;
  ticker: string | null;
  data: CompanyDetails | null;
  freshness: 'fresh' | 'stale' | 'unavailable';
  error?: ConnectionError;
};
export type DataConnectionApi = {
  status(): Promise<ConnectionResult<ConnectionStatus>>;
  saveKey(key: string): Promise<ConnectionResult<ConnectionStatus>>;
  remove(): Promise<ConnectionResult<ConnectionStatus>>;
};
export type CompanyDetailsApi = {
  getCached(thesisId: string): Promise<ConnectionResult<CompanyDetailsView>>;
  refresh(thesisId: string): Promise<ConnectionResult<CompanyDetailsView>>;
};
export const dataConnectionChannels = {
  status: 'data-connection:status', saveKey: 'data-connection:save-key', remove: 'data-connection:remove',
  getCached: 'company-details:get-cached', refresh: 'company-details:refresh'
} as const;
