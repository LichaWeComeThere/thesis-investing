import type { ThesisHistoryStorageApi } from '../../shared/thesisHistoryStorage';

export function getDefaultThesisHistoryStorageClient(): ThesisHistoryStorageApi | null {
  return typeof window === 'undefined' ? null : window.thesisInvesting?.thesisHistory ?? null;
}
