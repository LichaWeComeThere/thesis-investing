import type { HoldingRow } from '../../data/fakeData';
import { EmailStatusBadge } from './EmailStatusBadge';
import { RiskBadge } from './RiskBadge';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

type Props = {
  rows: HoldingRow[];
};

export function DataTable({ rows }: Props): JSX.Element {
  return (
    <div className="mt-7 hidden overflow-x-auto pl-table-frame md:block">
      <table className="min-w-[960px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wider text-pl-faint">
            <th className="sticky top-0 z-[2] whitespace-nowrap border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Ticker
            </th>
            <th className="sticky top-0 z-[2] border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Company
            </th>
            <th className="sticky top-0 z-[2] whitespace-nowrap border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Portfolio
            </th>
            <th className="sticky top-0 z-[2] whitespace-nowrap border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Price
            </th>
            <th className="sticky top-0 z-[2] whitespace-nowrap border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Daily
            </th>
            <th className="sticky top-0 z-[2] whitespace-nowrap border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Position
            </th>
            <th className="sticky top-0 z-[2] whitespace-nowrap border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Alloc.
            </th>
            <th className="sticky top-0 z-[2] whitespace-nowrap border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Risk
            </th>
            <th className="sticky top-0 z-[2] border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              AI signal
            </th>
            <th className="sticky top-0 z-[2] whitespace-nowrap border-b border-pl-border-muted/50 bg-pl-table-header/95 px-4 py-4 backdrop-blur-md sm:px-5">
              Email
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h, rowIdx) => {
            const up = h.dailyChangePct >= 0;
            const isLast = rowIdx === rows.length - 1;
            return (
              <tr
                key={h.ticker}
                className={`border-b border-pl-border-muted/35 bg-pl-table-row transition-colors duration-200 ease-out hover:bg-pl-table-row-hover ${
                  isLast ? 'border-b-0' : ''
                }`}
              >
                <td className="px-4 py-4 font-semibold text-pl-ink sm:px-5 sm:py-5">{h.ticker}</td>
                <td className="max-w-[200px] px-4 py-4 text-pl-slate sm:px-5 sm:py-5">
                  <span className="line-clamp-2">{h.company}</span>
                </td>
                <td className="px-4 py-4 text-pl-slate sm:px-5 sm:py-5">{h.portfolio}</td>
                <td className="px-4 py-4 font-medium tabular-nums text-pl-ink sm:px-5 sm:py-5">{money.format(h.currentPrice)}</td>
                <td className={`px-4 py-4 font-semibold tabular-nums sm:px-5 sm:py-5 ${up ? 'text-pl-positive' : 'text-pl-negative'}`}>
                  {up ? '+' : ''}
                  {h.dailyChangePct.toFixed(2)}%
                </td>
                <td className="px-4 py-4 font-medium tabular-nums text-pl-ink sm:px-5 sm:py-5">{money.format(h.positionValue)}</td>
                <td className="px-4 py-4 tabular-nums text-pl-slate sm:px-5 sm:py-5">{h.allocationPct.toFixed(1)}%</td>
                <td className="px-4 py-4 sm:px-5 sm:py-5">
                  <RiskBadge level={h.riskLevel} />
                </td>
                <td className="px-4 py-4 text-sm text-pl-ink sm:px-5 sm:py-5">{h.aiSignal}</td>
                <td className="px-4 py-4 sm:px-5 sm:py-5">
                  <EmailStatusBadge status={h.emailStatus} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
