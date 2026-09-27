import type {
  CompanyDetails, CompanyDetailsView, ConnectionError, ConnectionErrorCode, ConnectionResult, ConnectionStatus,
  DataConnectionApi, CompanyDetailsApi
} from '../../shared/companyDetails';
import type { CredentialStore } from './credentialStore';
import { hasControlCharacters, isTimestamp, normalizeCompanySymbol, validateCompanyDetails } from './companyDetailsValidation';
import { COMPANY_DETAILS_FRESHNESS_MS, type ProviderCache } from './providerCache';
import type { RequestBudget } from './requestBudget';

export type CompanyDetailsAdapter = (request: { symbol: string; key: string; signal: AbortSignal }) => Promise<ConnectionResult<CompanyDetails>>;
export type CompanyDetailsService = DataConnectionApi & CompanyDetailsApi & { close(): void };
const messages: Record<ConnectionErrorCode, string> = {
  'not-configured': 'Add your API key in Settings before loading company details.',
  unsupported: 'Company details are not available for this connection or ticker.',
  'not-found': 'The saved thesis could not be found.',
  'invalid-key': 'Enter a valid API key again.',
  forbidden: 'This connection does not have access to company details.',
  'rate-limited': 'The request limit was reached. Try again later.',
  network: 'Company details could not be reached. Try again later.',
  timeout: 'The company details request timed out. Try again later.',
  'invalid-response': 'The provider returned company details that could not be verified.',
  'secure-storage-unavailable': 'Protected API-key storage is unavailable. Enter your key again when it is available.',
  storage: 'Company details storage is unavailable. Your saved research is unaffected.',
  cancelled: 'The company details request was cancelled or the saved ticker changed.',
  busy: 'Company details are busy. Try again after the current requests finish.',
  'invalid-request': 'Choose a saved thesis with a valid identifier.'
};
const error = (code: ConnectionErrorCode, retryAt?: string): ConnectionError => ({
  code, message: messages[code], ...(code === 'rate-limited' && isTimestamp(retryAt) ? { retryAt } : {})
});
const failure = <T>(code: ConnectionErrorCode, retryAt?: string): ConnectionResult<T> => ({ ok: false, error: error(code, retryAt) });
const success = <T>(value: T): ConnectionResult<T> => ({ ok: true, value });
type Task = { symbol: string; generation: number; controller: AbortController; promise: Promise<ConnectionResult<CompanyDetails>>; finish: (result: ConnectionResult<CompanyDetails>) => void };

export function createCompanyDetailsService(options: {
  credentials: CredentialStore;
  getThesis: (id: string) => Promise<{ id: string; ticker?: string } | undefined>;
  cache: ProviderCache;
  budget: RequestBudget;
  adapter?: CompanyDetailsAdapter;
  now?: () => number;
}): CompanyDetailsService {
  const now = options.now ?? Date.now;
  const tasks = new Map<string, Task>();
  const queue: Task[] = [];
  let active: Task | undefined;
  let generation = 0;
  let closed = false;
  let mutations = 0;
  let credentialMutation: Promise<unknown> = Promise.resolve();

  function invalidate() {
    generation++;
    for (const task of tasks.values()) {
      task.controller.abort();
      task.finish(failure('cancelled'));
    }
    queue.length = 0;
    tasks.clear();
  }
  async function status(): Promise<ConnectionResult<ConnectionStatus>> {
    if (closed) return failure('cancelled');
    try {
      const state = await options.credentials.status();
      if (closed) return failure('cancelled');
      return success({ provider: 'alpha-vantage', configured: state === 'configured', secureStorageAvailable: state !== 'unavailable', adapterAvailable: Boolean(options.adapter) });
    } catch { return failure('secure-storage-unavailable'); }
  }
  function mutate(operation: () => Promise<void>): Promise<ConnectionResult<ConnectionStatus>> {
    if (closed) return Promise.resolve(failure('cancelled'));
    mutations++;
    invalidate();
    const result = credentialMutation.then(async (): Promise<ConnectionResult<ConnectionStatus>> => {
      if (closed) return failure('cancelled');
      let cacheFailed = false;
      try { options.cache.clear(); } catch { cacheFailed = true; }
      try { await operation(); } catch { return failure('secure-storage-unavailable'); }
      if (cacheFailed) return failure('storage');
      return status();
    }).finally(() => { mutations--; });
    credentialMutation = result;
    return result;
  }
  async function resolveThesis(id: string): Promise<ConnectionResult<{ id: string; ticker: string | null; symbol: string | null }>> {
    if (closed) return failure('cancelled');
    if (typeof id !== 'string' || !id.trim() || id.length > 200 || hasControlCharacters(id)) return failure('invalid-request');
    try {
      const thesis = await options.getThesis(id);
      if (closed) return failure('cancelled');
      if (!thesis || thesis.id !== id) return failure('not-found');
      const ticker = typeof thesis.ticker === 'string' && thesis.ticker.length <= 256 ? thesis.ticker : null;
      return success({ id, ticker, symbol: normalizeCompanySymbol(ticker) });
    } catch { return failure('storage'); }
  }
  function view(id: string, ticker: string | null, symbol: string | null, attemptError?: ConnectionError): CompanyDetailsView {
    let data: CompanyDetails | null = null;
    let viewError = attemptError;
    if (symbol) {
      try { data = options.cache.get(symbol); } catch { viewError ??= error('storage'); }
    }
    const age = data ? now() - Date.parse(data.retrievedAt) : NaN;
    return { thesisId: id, ticker, data, freshness: !data ? 'unavailable' : age >= 0 && age < COMPANY_DETAILS_FRESHNESS_MS ? 'fresh' : 'stale', ...(viewError ? { error: viewError } : {}) };
  }
  async function execute(task: Task): Promise<ConnectionResult<CompanyDetails>> {
    if (closed || mutations || task.generation !== generation) return failure('cancelled');
    let key: string | null;
    try { key = await options.credentials.readKey(); } catch { return failure('secure-storage-unavailable'); }
    if (closed || mutations || task.generation !== generation) return failure('cancelled');
    if (!key) return failure('not-configured');
    if (!options.adapter) return failure('unsupported');
    let reservation;
    try { reservation = options.budget.reserve(); } catch { return failure('storage'); }
    if (!reservation.allowed) return failure(reservation.reason, reservation.retryAt);
    // The adapter must support AbortSignal. The race also bounds caller wait if it ignores cancellation.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;
    try {
      const cancellation = new Promise<ConnectionResult<CompanyDetails>>(resolve => {
        abortListener = () => resolve(failure('cancelled'));
        task.controller.signal.addEventListener('abort', abortListener, { once: true });
      });
      const deadline = new Promise<ConnectionResult<CompanyDetails>>(resolve => {
        timer = setTimeout(() => { resolve(failure('timeout')); task.controller.abort(); }, 10_000);
      });
      const reply = await Promise.race([options.adapter({ symbol: task.symbol, key, signal: task.controller.signal }), deadline, cancellation]);
      if (closed || mutations || task.generation !== generation) return failure('cancelled');
      if (!reply || typeof reply !== 'object' || typeof reply.ok !== 'boolean') return failure('invalid-response');
      if (!reply.ok) {
        const code = reply.error?.code;
        const safeCode = typeof code === 'string' && Object.hasOwn(messages, code) ? code : 'invalid-response';
        const retryAt = isTimestamp(reply.error?.retryAt) ? reply.error.retryAt : undefined;
        if (safeCode === 'rate-limited') options.budget.cooldown(retryAt);
        return failure(safeCode, retryAt);
      }
      const details = validateCompanyDetails(reply.value, task.symbol);
      if (!details) return failure('invalid-response');
      details.retrievedAt = new Date(now()).toISOString();
      try { options.cache.put(details); } catch { return failure('storage'); }
      return success(details);
    } catch { return failure('network'); }
    finally {
      if (timer) clearTimeout(timer);
      if (abortListener) task.controller.signal.removeEventListener('abort', abortListener);
    }
  }
  function pump() {
    if (active || closed) return;
    const next = queue.shift();
    if (!next) return;
    active = next;
    void execute(next).then(next.finish).finally(() => {
      if (tasks.get(next.symbol) === next) tasks.delete(next.symbol);
      active = undefined;
      pump();
    });
  }
  function request(symbol: string): Promise<ConnectionResult<CompanyDetails>> {
    const existing = tasks.get(symbol);
    if (existing) return existing.promise;
    if (queue.length >= 5) return Promise.resolve(failure('busy'));
    let finish!: Task['finish'];
    const promise = new Promise<ConnectionResult<CompanyDetails>>(resolve => { finish = resolve; });
    const task = { symbol, promise, finish, controller: new AbortController(), generation };
    tasks.set(symbol, task);
    queue.push(task);
    pump();
    return promise;
  }
  return {
    status,
    saveKey(key) {
      if (typeof key !== 'string' || !/^[\x21-\x7e]{1,256}$/.test(key)) return Promise.resolve(failure('invalid-key'));
      return mutate(() => options.credentials.storeKey(key));
    },
    remove() { return mutate(() => options.credentials.remove()); },
    async getCached(thesisId) {
      const startingGeneration = generation;
      const resolved = await resolveThesis(thesisId);
      if (!resolved.ok) return resolved;
      if (closed || startingGeneration !== generation || mutations) return failure('cancelled');
      const { ticker, symbol } = resolved.value;
      return success(view(thesisId, ticker, symbol, symbol ? undefined : error('unsupported')));
    },
    async refresh(thesisId) {
      const startingGeneration = generation;
      const resolved = await resolveThesis(thesisId);
      if (!resolved.ok) return resolved;
      const { ticker, symbol } = resolved.value;
      if (!symbol || !options.adapter) return success(view(thesisId, ticker, symbol, error('unsupported')));
      if (mutations) return success(view(thesisId, ticker, symbol, error('busy')));
      if (startingGeneration !== generation) return failure('cancelled');
      const result = await request(symbol);
      if (closed || startingGeneration !== generation) return failure('cancelled');
      const current = await resolveThesis(thesisId);
      if (!current.ok) return current;
      if (closed || startingGeneration !== generation || mutations) return failure('cancelled');
      if (current.value.ticker !== ticker || current.value.symbol !== symbol) return failure('cancelled');
      return success(view(thesisId, ticker, symbol, result.ok ? undefined : result.error));
    },
    close() {
      if (closed) return;
      closed = true;
      invalidate();
      options.cache.close();
      options.budget.close();
    }
  };
}
