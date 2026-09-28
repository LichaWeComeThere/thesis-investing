import { app, safeStorage } from 'electron';
import { join } from 'node:path';
import { dataConnectionChannels as channels } from '../shared/companyDetails';
import { createSqliteStorage } from '../storage/sqlite';
import { handleTrustedIpc } from './electronSecurity';
import { createLivingThesesStorageService } from './livingThesesStorageService';
import { createDataConnectionIpcHandlers } from './dataConnectionIpcHandlers';
import { createCredentialStore } from './dataConnection/credentialStore';
import { createProviderCache } from './dataConnection/providerCache';
import { createRequestBudget } from './dataConnection/requestBudget';
import { createCompanyDetailsService } from './dataConnection/companyDetailsService';
import { createAlphaVantageCompanyDetailsAdapter } from './dataConnection/alphaVantageCompanyDetails';

/** Lazy optional resources: a broken connection must never block offline application startup. */
export function registerDataConnectionIpc(): void {
  let service: ReturnType<typeof createCompanyDetailsService> | undefined;
  let theses: ReturnType<typeof createLivingThesesStorageService> | undefined;
  let stopped = false;
  const handlers = createDataConnectionIpcHandlers(() => {
    if (stopped) throw new Error('Connection closed.');
    if (service) return service;
    const directory = join(app.getPath('userData'), 'data-connection');
    const credentials = createCredentialStore({ directory, encryption: {
      isAvailable: () => app.isReady() && safeStorage.isEncryptionAvailable() &&
        (process.platform !== 'linux' || !['basic_text', 'unknown'].includes(safeStorage.getSelectedStorageBackend())),
      encrypt: (key) => safeStorage.encryptString(key),
      decrypt: (bytes) => safeStorage.decryptString(bytes)
    } });
    const budget = createRequestBudget({ directory });
    const cache = createProviderCache(); // Session-only until provider retention rights are verified.
    theses = createLivingThesesStorageService(() => createSqliteStorage({
      filename: join(app.getPath('userData'), 'thesis-investing.sqlite')
    }));
    service = createCompanyDetailsService({ credentials, cache, budget,
      adapter: createAlphaVantageCompanyDetailsAdapter(),
      getThesis: async (id) => {
        const result = await theses!.getById(id);
        if (result.ok) return result.value;
        if (result.code === 'not-found') return undefined;
        throw new Error('Saved thesis unavailable.');
      }
    });
    return service;
  });
  handleTrustedIpc(channels.status, (_event, ...args) => handlers.status(...args));
  handleTrustedIpc(channels.saveKey, (_event, key, ...args) => handlers.saveKey(key, ...args));
  handleTrustedIpc(channels.remove, (_event, ...args) => handlers.remove(...args));
  handleTrustedIpc(channels.getCached, (_event, id, ...args) => handlers.getCached(id, ...args));
  handleTrustedIpc(channels.refresh, (_event, id, ...args) => handlers.refresh(id, ...args));
  app.once('before-quit', () => {
    stopped = true;
    service?.close();
    void theses?.close().catch(() => { /* Optional read connection closes best effort during shutdown. */ });
  });
}
