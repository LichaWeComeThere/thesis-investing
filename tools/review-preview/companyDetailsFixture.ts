import type { CompanyDetails, CompanyDetailsApi, DataConnectionApi } from '../../apps/desktop/src/shared/companyDetails';

// Fictional, memory-only UI fixture. Never forwards a key or ticker to a provider.
// The preview accepts this public dummy value only; real keys do not belong here.
let configured = false;
const cache = new Map<string, CompanyDetails>();
const status = () => ({ provider: 'alpha-vantage' as const, configured, secureStorageAvailable: true, adapterAvailable: true });
export const previewDataConnection: DataConnectionApi = {
  status: async () => ({ ok: true, value: status() }),
  saveKey: async (key) => {
    if (key !== 'preview-only-key') return { ok: false, error: { code: 'invalid-key', message: 'Use the fictional preview key.' } };
    configured = true; cache.clear();
    return { ok: true, value: status() };
  },
  remove: async () => { configured = false; cache.clear(); return { ok: true, value: status() }; }
};

export function previewCompanyDetails(readThesis: (id: string) => Promise<{ ok: boolean; value?: { ticker?: string } }>): CompanyDetailsApi {
  const view = async (id: string, load: boolean) => {
    const thesis = await readThesis(id);
    const ticker = thesis.value?.ticker ?? null;
    if (!thesis.ok) return { ok: false as const, error: { code: 'not-found' as const, message: 'Example thesis not found.' } };
    if (load && configured && ticker === 'ACME') cache.set(ticker, {
      schemaVersion: 1, provider: 'alpha-vantage', providerSymbol: ticker,
      companyName: 'Acme Research — fictional preview', exchange: 'NASDAQ',
      sector: 'Technology', industry: 'Example software', country: 'USA', currency: 'USD',
      retrievedAt: new Date().toISOString(), sourceUpdatedAt: null
    });
    const data = ticker ? cache.get(ticker) ?? null : null;
    return { ok: true as const, value: {
      thesisId: id, ticker, data, freshness: data ? 'fresh' as const : 'unavailable' as const,
      ...(load && !configured ? { error: { code: 'not-configured' as const, message: 'Set up the fictional connection.' } } :
        load && ticker !== 'ACME' ? { error: { code: 'unsupported' as const, message: 'This preview supports ACME only.' } } : {})
    } };
  };
  return { getCached: id => view(id, false), refresh: id => view(id, true) };
}
