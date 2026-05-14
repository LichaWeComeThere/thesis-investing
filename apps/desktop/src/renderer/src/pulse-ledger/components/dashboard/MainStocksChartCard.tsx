import { mainStocksDisplay, sparklineSeries } from '../../data/fakeData';
import { StockSparkline } from '../../charts/DashboardCharts';
import { Card } from '../ui/Card';

export function MainStocksChartCard({ spanClass = 'lg:col-span-5' }: { spanClass?: string }): JSX.Element {
  return (
    <Card
      variant="premium"
      id="section-watchlist"
      className={`p-6 sm:p-7 ${spanClass}`.trim()}
      aria-label="Watchlist"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Main stocks</p>
          <p className="mt-2 text-lg font-semibold text-pl-ink">Leaders in your book</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mainStocksDisplay.map((s) => (
            <span
              key={s.ticker}
              className="pl-badge-chip rounded-full border border-pl-border-strong bg-pl-muted/50 px-3 py-1.5 text-xs font-semibold text-pl-ink shadow-sm ring-1 ring-pl-border-muted/40 transition-all duration-200 hover:border-pl-teal/35 hover:bg-pl-card hover:shadow-card"
            >
              {s.ticker}{' '}
              <span className={s.changePct >= 0 ? 'text-pl-positive' : 'text-pl-negative'}>
                {s.changePct >= 0 ? '+' : ''}
                {s.changePct.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <StockSparkline data={sparklineSeries} />
      </div>
    </Card>
  );
}
