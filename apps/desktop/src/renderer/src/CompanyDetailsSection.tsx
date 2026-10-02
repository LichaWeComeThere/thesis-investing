import { Button } from '@thesis-investing/ui';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
  CompanyDetailsApi, CompanyDetailsView, ConnectionError, ConnectionErrorCode,
  ConnectionResult
} from '../../shared/companyDetails';
import './company-details.css';

export type CompanyDetailsSectionProps = {
  thesisId: string;
  /** The latest saved ticker, never an unsaved field value. */
  ticker?: string | null;
  api?: CompanyDetailsApi | null;
  disabled?: boolean;
  onOpenSettings?: () => void;
};

const errorMessages: Record<ConnectionErrorCode, string> = {
  'not-configured': 'Add your Alpha Vantage key in Settings to load company details.',
  unsupported: 'Company details are only available for supported US-listed common stocks.',
  'not-found': 'This saved thesis is no longer available. Reopen the thesis to continue.',
  'invalid-key': 'The key could not be used. Enter your key again in Settings.',
  forbidden: 'Your Alpha Vantage connection does not have access to these company details.',
  'rate-limited': 'The request limit was reached. Try again later.',
  network: 'Alpha Vantage could not be reached. Try again when a connection is available.',
  timeout: 'The request took too long. You can try again.',
  'invalid-response': 'The returned company details could not be verified for this ticker.',
  'secure-storage-unavailable': 'Protected key storage is unavailable. Check your connection in Settings.',
  storage: 'Company details could not be read. Your saved research is unaffected.',
  cancelled: 'The request was cancelled or the saved ticker changed. You can try again.',
  busy: 'Another company lookup is in progress. Try again shortly.',
  'invalid-request': 'Choose a saved thesis to load company details.'
};

function defaultApi(): CompanyDetailsApi | null {
  return typeof window === 'undefined' ? null : window.thesisInvesting?.companyDetails ?? null;
}

function displayTime(value: string): string {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : 'Time unavailable';
}

/** A different saved identity starts a clean view, including pending requests. */
export function CompanyDetailsSection(props: CompanyDetailsSectionProps): JSX.Element {
  return <CompanyDetailsIdentity key={JSON.stringify([props.thesisId, props.ticker ?? null])} {...props} />;
}

function CompanyDetailsIdentity({
  thesisId, ticker, api = defaultApi(), disabled = false, onOpenSettings
}: CompanyDetailsSectionProps): JSX.Element {
  const headingId = useId();
  const [view, setView] = useState<CompanyDetailsView | null>(null);
  const [error, setError] = useState<ConnectionError | null>(null);
  const [loading, setLoading] = useState<'cache' | 'refresh' | null>(null);
  const sequence = useRef(0);
  const invalidateRequest = useCallback(() => { sequence.current++; }, []);
  const symbol = ticker?.trim().toUpperCase() ?? '';
  const supportedTicker = /^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol);

  const acceptResult = useCallback((result: ConnectionResult<CompanyDetailsView>): void => {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.value.thesisId !== thesisId || result.value.ticker !== (ticker ?? null) ||
      (result.value.data && result.value.data.providerSymbol !== symbol)) {
      setError({ code: 'cancelled', message: errorMessages.cancelled });
      return;
    }
    setView(result.value);
    setError(result.value.error ?? null);
  }, [symbol, thesisId, ticker]);

  useEffect(() => {
    const request = ++sequence.current;
    let current = true;
    setView(null);
    setError(null);
    if (!api || !symbol || !supportedTicker || !thesisId) {
      setLoading(null);
      return invalidateRequest;
    }
    setLoading('cache');
    // This reads this app session's cache. It never contacts the provider.
    void Promise.resolve().then(() => api.getCached(thesisId)).then(result => {
      if (current && request === sequence.current) acceptResult(result);
    }).catch(() => {
      if (current && request === sequence.current) setError({ code: 'storage', message: errorMessages.storage });
    }).finally(() => {
      if (current && request === sequence.current) setLoading(null);
    });
    return () => { current = false; invalidateRequest(); };
  }, [acceptResult, api, invalidateRequest, symbol, supportedTicker, thesisId]);

  async function refresh(): Promise<void> {
    if (!api || disabled || loading || !supportedTicker || !thesisId) return;
    const request = ++sequence.current;
    setLoading('refresh');
    setError(null);
    try {
      const result = await api.refresh(thesisId);
      if (request === sequence.current) acceptResult(result);
    } catch {
      if (request === sequence.current) setError({ code: 'storage', message: errorMessages.storage });
    } finally {
      if (request === sequence.current) setLoading(null);
    }
  }

  const data = view?.data ?? null;
  const needsSettings = error && ['not-configured', 'invalid-key', 'forbidden', 'secure-storage-unavailable'].includes(error.code);
  const errorText = error ? errorMessages[error.code] ?? errorMessages['invalid-response'] : null;
  const retryAt = error?.retryAt && Number.isFinite(Date.parse(error.retryAt)) ? error.retryAt : null;

  return (
    <section className="company-details" aria-labelledby={headingId}>
      <div className="company-details-header">
        <div>
          <h3 id={headingId}>Company details</h3>
          <p>Optional reference information from Alpha Vantage.</p>
        </div>
        {api && supportedTicker && thesisId && (
          <Button type="button" variant="secondary" size="sm" disabled={disabled || Boolean(loading)} onClick={() => void refresh()}>
            {loading === 'refresh' ? 'Loading company details…' : data ? 'Refresh company details' : 'Load company details'}
          </Button>
        )}
      </div>

      {!ticker?.trim() ? <p>Add a ticker to look up company details.</p>
        : !supportedTicker ? <p>Company details are only available for supported US-listed common stocks.</p>
          : !api ? <p>Company details are available in the desktop app. Your research works without a connection.</p>
            : (
              <>
                <p className="company-details-note">Loading sends only the saved ticker ({symbol}) to Alpha Vantage. Your research stays local.</p>
                {disabled && <p className="company-details-note">Save or discard thesis changes before loading company details.</p>}
                <div role="status" aria-live="polite">
                  {loading === 'cache' && <p>Checking saved company details…</p>}
                  {loading === 'refresh' && <p>Loading company details for {symbol}…</p>}
                </div>
                {errorText && (
                  <div className="company-details-feedback" role="status">
                    <p>{errorText}{retryAt && <> Retry after <time dateTime={retryAt}>{displayTime(retryAt)}</time>.</>}</p>
                    {needsSettings && onOpenSettings && <Button type="button" variant="ghost" size="sm" onClick={onOpenSettings}>Open data connection settings</Button>}
                  </div>
                )}
                {data ? (
                  <>
                    <dl className="company-details-fields">
                      <div className="company-details-name"><dt>Company</dt><dd>{data.companyName}</dd></div>
                      <div><dt>Symbol</dt><dd>{data.providerSymbol}</dd></div>
                      <div><dt>Exchange</dt><dd>{data.exchange ?? 'Not provided'}</dd></div>
                      <div><dt>Sector</dt><dd>{data.sector ?? 'Not provided'}</dd></div>
                      <div><dt>Industry</dt><dd>{data.industry ?? 'Not provided'}</dd></div>
                      <div><dt>Country</dt><dd>{data.country ?? 'Not provided'}</dd></div>
                      <div><dt>Currency</dt><dd>{data.currency ?? 'Not provided'}</dd></div>
                    </dl>
                    <p className="company-details-note">Source: Alpha Vantage · Retrieved <time dateTime={data.retrievedAt}>{displayTime(data.retrievedAt)}</time></p>
                    {data.sourceUpdatedAt && <p className="company-details-note">Provider updated <time dateTime={data.sourceUpdatedAt}>{displayTime(data.sourceUpdatedAt)}</time></p>}
                    {view?.freshness === 'stale' && <p className="company-details-note">This saved result needs refreshing.</p>}
                    <p className="company-details-note">Details stay in this app session. They are separate from your saved research and backups.</p>
                  </>
                ) : !loading && !errorText && <p className="company-details-note">No company details loaded yet. You can keep researching without them.</p>}
              </>
            )}
    </section>
  );
}
