import type { HoldingRow } from '../../data/fakeData';
import { emailStatusBadgeClass } from './riskAndEmailBadges';

export function EmailStatusBadge({ status }: { status: HoldingRow['emailStatus'] }): JSX.Element {
  return <span className={`pl-badge-chip ${emailStatusBadgeClass(status)}`}>{status}</span>;
}
