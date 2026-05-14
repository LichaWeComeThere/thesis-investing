import type { RiskLevel } from '../../data/fakeData';
import { riskBadgeClass } from './riskAndEmailBadges';

export function RiskBadge({ level }: { level: RiskLevel }): JSX.Element {
  return <span className={`pl-badge-chip ${riskBadgeClass(level)}`}>{level}</span>;
}
