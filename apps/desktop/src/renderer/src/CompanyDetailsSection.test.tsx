// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompanyDetails, CompanyDetailsApi, CompanyDetailsView, ConnectionResult } from '../../shared/companyDetails';
import { CompanyDetailsSection } from './CompanyDetailsSection';

const details: CompanyDetails = {
  schemaVersion: 1, provider: 'alpha-vantage', providerSymbol: 'ACME',
  companyName: 'Acme Research Corporation', exchange: 'NASDAQ', sector: 'Technology',
  industry: null, country: 'USA', currency: 'USD',
  retrievedAt: '2026-09-20T14:30:00.000Z', sourceUpdatedAt: null
};

function result(data: CompanyDetails | null = null, fields: Partial<CompanyDetailsView> = {}): ConnectionResult<CompanyDetailsView> {
  return { ok: true, value: { thesisId: 'thesis-acme', ticker: 'ACME', data, freshness: data ? 'fresh' : 'unavailable', ...fields } };
}

function client(cached = result()): CompanyDetailsApi {
  return {
    getCached: vi.fn(async () => cached),
    refresh: vi.fn(async () => result(details))
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

async function cacheSettled(): Promise<void> {
  await waitFor(() => expect(screen.queryByText('Checking saved company details…')).toBeNull());
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Company details', () => {
  it('reads only the session cache when opened or rerendered; an explicit click loads details', async () => {
    const api = client();
    const { rerender } = render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    await cacheSettled();
    rerender(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    fireEvent.focus(screen.getByRole('button', { name: 'Load company details' }));
    expect(api.getCached).toHaveBeenCalledTimes(1);
    expect(api.refresh).not.toHaveBeenCalled();
    expect(screen.getByText(/Loading sends only the saved ticker \(ACME\)/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Load company details' }));
    expect(await screen.findByText(details.companyName)).toBeTruthy();
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(api.refresh).toHaveBeenCalledWith('thesis-acme');
    expect(screen.getByText('NASDAQ')).toBeTruthy();
    expect(screen.getByText('Technology')).toBeTruthy();
    expect(screen.getByText('Not provided')).toBeTruthy();
    expect(screen.getByText(/Source: Alpha Vantage/).querySelector('time')?.dateTime).toBe(details.retrievedAt);
    expect(screen.getByText(/Details stay in this app session/)).toBeTruthy();
  });

  it('shows cached details without automatically refreshing an old result', async () => {
    const api = client(result(details, { freshness: 'stale' }));
    render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    expect(await screen.findByText(details.companyName)).toBeTruthy();
    expect(screen.getByText('This saved result needs refreshing.')).toBeTruthy();
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it('retains cached data and the original retrieval time after a failed refresh', async () => {
    const api = client(result(details, { freshness: 'stale' }));
    vi.mocked(api.refresh).mockResolvedValue(result(details, { freshness: 'stale', error: { code: 'network', message: 'Untrusted raw provider text' } }));
    render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    await screen.findByText(details.companyName);
    await cacheSettled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh company details' }));
    expect(await screen.findByText(/Alpha Vantage could not be reached/)).toBeTruthy();
    expect(screen.getByText(details.companyName)).toBeTruthy();
    expect(screen.getByText(/Source: Alpha Vantage/).querySelector('time')?.dateTime).toBe(details.retrievedAt);
    expect(screen.queryByText('Untrusted raw provider text')).toBeNull();
  });

  it('provides a Settings action when a key is missing without exposing raw errors', async () => {
    const api = client();
    const openSettings = vi.fn();
    vi.mocked(api.refresh).mockResolvedValue(result(null, { error: { code: 'not-configured', message: 'https://provider.invalid/?apikey=secret' } }));
    render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} onOpenSettings={openSettings} />);
    await cacheSettled();
    fireEvent.click(screen.getByRole('button', { name: 'Load company details' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open data connection settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/apikey=secret/)).toBeNull();
  });

  it.each(['', '^INDEX', 'TICKER/OTHER'])('does not request details for a missing or unsupported ticker (%s)', async ticker => {
    const api = client();
    render(<CompanyDetailsSection thesisId="thesis-acme" ticker={ticker} api={api} />);
    await cacheSettled();
    expect(api.getCached).not.toHaveBeenCalled();
    expect(api.refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Load company details' })).toBeNull();
    expect(screen.getByText(ticker ? /only available for supported US-listed common stocks/ : 'Add a ticker to look up company details.')).toBeTruthy();
  });

  it('keeps an API-unavailable preview understandable', () => {
    render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={null} />);
    expect(screen.getByText(/Your research works without a connection/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('blocks lookups while the thesis has unsaved changes', async () => {
    const api = client(result(details));
    const { rerender } = render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} disabled />);
    await screen.findByText(details.companyName);
    const button = screen.getByRole('button', { name: 'Refresh company details' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(api.refresh).not.toHaveBeenCalled();
    expect(screen.getByText('Save or discard thesis changes before loading company details.')).toBeTruthy();
    rerender(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    expect(button.disabled).toBe(false);
  });

  it('ignores an in-flight cache reply after changing the selected thesis', async () => {
    const pending = deferred<ConnectionResult<CompanyDetailsView>>();
    const api = client();
    vi.mocked(api.getCached).mockImplementation(id => id === 'thesis-acme' ? pending.promise : Promise.resolve(result(null, { thesisId: id, ticker: 'NEXT' })));
    const { rerender } = render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    await waitFor(() => expect(api.getCached).toHaveBeenCalledWith('thesis-acme'));
    rerender(<CompanyDetailsSection thesisId="thesis-next" ticker="NEXT" api={api} />);
    await cacheSettled();
    await act(async () => pending.resolve(result(details)));
    expect(screen.queryByText(details.companyName)).toBeNull();
    expect(screen.getByText(/saved ticker \(NEXT\)/)).toBeTruthy();
  });

  it('ignores a refresh response when the saved ticker changes on the same thesis', async () => {
    const pending = deferred<ConnectionResult<CompanyDetailsView>>();
    const api = client();
    vi.mocked(api.refresh).mockReturnValue(pending.promise);
    const { rerender } = render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    await cacheSettled();
    fireEvent.click(screen.getByRole('button', { name: 'Load company details' }));
    vi.mocked(api.getCached).mockResolvedValue(result(null, { ticker: 'NEXT' }));
    rerender(<CompanyDetailsSection thesisId="thesis-acme" ticker="NEXT" api={api} />);
    await cacheSettled();
    await act(async () => pending.resolve(result(details)));
    expect(screen.queryByText(details.companyName)).toBeNull();
    expect(screen.getByText(/saved ticker \(NEXT\)/)).toBeTruthy();
  });

  it.each([
    { thesisId: 'some-other-thesis' },
    { ticker: 'OTHER' },
    { data: { ...details, providerSymbol: 'OTHER' } }
  ])('rejects a mismatched saved identity or provider symbol (%j)', async override => {
    const api = client(result(details, override));
    render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    expect(await screen.findByText(/request was cancelled or the saved ticker changed/)).toBeTruthy();
    expect(screen.queryByText(details.companyName)).toBeNull();
  });

  it('reports a cache read error and still allows an explicit lookup', async () => {
    const api = client();
    vi.mocked(api.getCached).mockRejectedValue(new Error('Sensitive native storage details'));
    render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    expect(await screen.findByText(/Your saved research is unaffected/)).toBeTruthy();
    await cacheSettled();
    fireEvent.click(screen.getByRole('button', { name: 'Load company details' }));
    expect(await screen.findByText(details.companyName)).toBeTruthy();
    expect(screen.queryByText(/Sensitive native/)).toBeNull();
  });

  it('does not retry or permit duplicate clicks while a request is in progress', async () => {
    const pending = deferred<ConnectionResult<CompanyDetailsView>>();
    const api = client();
    vi.mocked(api.refresh).mockReturnValue(pending.promise);
    render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    await cacheSettled();
    fireEvent.click(screen.getByRole('button', { name: 'Load company details' }));
    const button = screen.getByRole('button', { name: 'Loading company details…' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(api.refresh).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(result(null, { error: { code: 'rate-limited', message: '', retryAt: '2026-09-29T14:30:00.000Z' } })));
    expect(screen.getByText(/The request limit was reached/).querySelector('time')?.dateTime).toBe('2026-09-29T14:30:00.000Z');
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('renders provider strings as plain text without URLs, images, or executable markup', async () => {
    const name = '<img src="https://provider.invalid/logo" onerror="alert(1)">';
    const api = client(result({ ...details, companyName: name }));
    const { container } = render(<CompanyDetailsSection thesisId="thesis-acme" ticker="ACME" api={api} />);
    expect(await screen.findByText(name)).toBeTruthy();
    expect(container.querySelector('img, a, script')).toBeNull();
  });
});
