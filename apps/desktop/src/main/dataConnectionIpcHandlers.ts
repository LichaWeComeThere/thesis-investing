import type { CompanyDetailsApi, DataConnectionApi, ConnectionResult } from '../shared/companyDetails';
import { hasControlCharacters } from './dataConnection/companyDetailsValidation';
type Service = DataConnectionApi & CompanyDetailsApi;
const invalid = (): ConnectionResult<never> => ({ ok: false, error: { code: 'invalid-request', message: 'The connection request is invalid.' } });
const boundedId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200 && id.trim() === id && !hasControlCharacters(id);

/** Validation precedes initialization; no renderer-controlled URL, path, or credential read. */
export function createDataConnectionIpcHandlers(getService: () => Service) {
  async function run<T>(operation: (service: Service) => Promise<ConnectionResult<T>>): Promise<ConnectionResult<T>> {
    try { return await operation(getService()); }
    catch { return { ok: false, error: { code: 'storage', message: 'The optional data connection is unavailable. Your saved research is unaffected.' } }; }
  }
  return {
    status: (...args: unknown[]) => args.length ? Promise.resolve(invalid()) : run((s) => s.status()),
    remove: (...args: unknown[]) => args.length ? Promise.resolve(invalid()) : run((s) => s.remove()),
    saveKey: (key: unknown, ...extra: unknown[]) => typeof key !== 'string' || !/^[\x21-\x7e]{1,256}$/.test(key) || extra.length
      ? Promise.resolve(invalid()) : run((s) => s.saveKey(key)),
    getCached: (id: unknown, ...extra: unknown[]) => !boundedId(id) || extra.length
      ? Promise.resolve(invalid()) : run((s) => s.getCached(id)),
    refresh: (id: unknown, ...extra: unknown[]) => !boundedId(id) || extra.length
      ? Promise.resolve(invalid()) : run((s) => s.refresh(id))
  };
}
