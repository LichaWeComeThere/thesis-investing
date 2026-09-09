import type { LivingThesesStorageApi } from '../../shared/livingThesesStorage';
import type { ThesisInvestingApi } from '../../shared/watchlistStorage';

declare global {
  interface Window {
    thesisInvesting?: ThesisInvestingApi;
  }
}

export type LivingThesesStorageClient = LivingThesesStorageApi;

export function getDefaultLivingThesesStorageClient(): LivingThesesStorageClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.thesisInvesting?.livingTheses ?? null;
}
