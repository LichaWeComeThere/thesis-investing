import type { DecisionsStorageApi } from '../../shared/decisionsStorage';

export function getDefaultDecisionsStorageClient(): DecisionsStorageApi | null {
  return typeof window === 'undefined' ? null : window.thesisInvesting?.decisions ?? null;
}
