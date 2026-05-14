import type { HoldingRow } from '../../data/fakeData';
import { EmailStatusBadge } from '../table/EmailStatusBadge';
import { riskBadgeClass } from '../table/riskAndEmailBadges';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function SavedPositionCard({ holding }: { holding: HoldingRow }): JSX.Element {
  const up = holding.dailyChangePct >= 0;
  return (
    <article className="pl-premium-card rounded-[26px] border border-pl-border bg-pl-card p-4 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-pl-ink">{holding.ticker}</p>
          <p className="text-sm text-pl-slate">{holding.company}</p>
        </div>
        <span className={`text-sm font-semibold ${up ? 'text-pl-positive' : 'text-pl-negative'}`}>
          {up ? '+' : ''}
          {holding.dailyChangePct.toFixed(2)}%
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-pl-slate">
        <div>
          <dt className="text-pl-mist">Portfolio</dt>
          <dd className="font-medium text-pl-ink">{holding.portfolio}</dd>
        </div>
        <div>
          <dt className="text-pl-mist">Price</dt>
          <dd className="font-medium text-pl-ink">{money.format(holding.currentPrice)}</dd>
        </div>
        <div>
          <dt className="text-pl-mist">Position</dt>
          <dd className="font-medium text-pl-ink">{money.format(holding.positionValue)}</dd>
        </div>
        <div>
          <dt className="text-pl-mist">Alloc.</dt>
          <dd className="font-medium text-pl-ink">{holding.allocationPct.toFixed(1)}%</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-pl-mist">AI signal</dt>
          <dd className="font-medium text-pl-ink">{holding.aiSignal}</dd>
        </div>
        <div className="col-span-2 flex flex-wrap gap-2">
          <span className={`pl-badge-chip ${riskBadgeClass(holding.riskLevel)}`}>{holding.riskLevel} risk</span>
          <EmailStatusBadge status={holding.emailStatus} />
        </div>
      </dl>
    </article>
  );
}
