import type { HoldingRow, RiskLevel } from '../../data/fakeData';

export function riskBadgeClass(level: RiskLevel): string {
  switch (level) {
    case 'Low':
      return 'pl-badge-risk-low';
    case 'Medium':
      return 'pl-badge-risk-medium';
    case 'High':
      return 'pl-badge-risk-high';
  }
}

export function emailStatusBadgeClass(status: HoldingRow['emailStatus']): string {
  switch (status) {
    case 'Sent':
      return 'pl-badge-mail-sent';
    case 'Queued':
      return 'pl-badge-mail-queued';
    case 'Draft':
      return 'pl-badge-mail-draft';
  }
}
