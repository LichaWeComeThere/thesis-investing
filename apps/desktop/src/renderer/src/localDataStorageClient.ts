import type { LocalDataStorageApi } from '../../shared/localDataStorage';
import type { ThesisInvestingApi } from '../../shared/watchlistStorage';

declare global {
  interface Window {
    thesisInvesting?: ThesisInvestingApi;
  }
}

export type LocalDataStorageClient = LocalDataStorageApi;

export function getDefaultLocalDataStorageClient(): LocalDataStorageClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.thesisInvesting?.localData ?? null;
}
