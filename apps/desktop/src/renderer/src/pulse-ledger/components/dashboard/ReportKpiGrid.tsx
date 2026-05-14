import { portfolioSummary } from '../../data/fakeData';
import { ContentGrid } from '../layout/ContentGrid';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const moneyFine = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function ReportKpiGrid(): JSX.Element {
  const daily = portfolioSummary.dailyChangePct;
  const dailyPositive = daily >= 0;

  return (
    <ContentGrid>
      <MetricCard label="Portfolio value" value={moneyFine.format(portfolioSummary.totalValue)} span="lg:col-span-3" />
      <MetricCard label="Total income" value={money.format(portfolioSummary.totalIncome)} span="lg:col-span-3" />
      <MetricCard label="Total expenses" value={money.format(portfolioSummary.totalExpenses)} span="lg:col-span-3" />
      <Card variant="premium" className={`p-6 sm:p-7 lg:col-span-3`}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Daily portfolio change</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-pl-ink sm:text-[1.65rem]">
          {dailyPositive ? '+' : ''}
          {daily.toFixed(2)}%
        </p>
        <p className={`mt-2 text-sm font-medium ${dailyPositive ? 'text-pl-positive' : 'text-pl-negative'}`}>
          {dailyPositive ? '+' : ''}
          {moneyFine.format(portfolioSummary.dailyChangeAbs)} vs prior close
        </p>
      </Card>
    </ContentGrid>
  );
}
