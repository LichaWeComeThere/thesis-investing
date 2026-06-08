import type { DashboardSummariesStorageApi } from '../../shared/dashboardSummariesStorage';
import type { ThesisInvestingApi } from '../../shared/watchlistStorage';

declare global {
  interface Window {
    thesisInvesting?: ThesisInvestingApi;
  }
}

export type DashboardSummariesStorageClient = DashboardSummariesStorageApi;

export function getDefaultDashboardSummariesStorageClient(): DashboardSummariesStorageClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.thesisInvesting?.dashboardSummaries ?? null;
}
