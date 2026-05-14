import { riskAlert } from '../../data/fakeData';
import { Card } from '../ui/Card';

export function RiskAlertCard({ spanClass = 'lg:col-span-3' }: { spanClass?: string }): JSX.Element {
  return (
    <Card
      variant="premium"
      className={`border-l-[3px] border-l-pl-coral/50 bg-gradient-to-br from-pl-risk-from to-pl-risk-to p-6 sm:p-7 ${spanClass}`.trim()}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-pl-risk-label">Risk alert</p>
      <p className="mt-2 text-lg font-semibold text-pl-ink">{riskAlert.title}</p>
      <p className="mt-3 text-sm leading-relaxed text-pl-slate">{riskAlert.detail}</p>
      <span className="mt-4 pl-badge-chip inline-flex rounded-full bg-pl-risk-pill-bg px-3 py-1.5 text-xs font-semibold text-pl-risk-pill-text ring-1 ring-pl-risk-pill-ring">
        Severity · {riskAlert.severity}
      </span>
    </Card>
  );
}
