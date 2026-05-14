import { portfolioSummary } from '../../data/fakeData';
import { GrowthRing } from '../../charts/DashboardCharts';
import { Card } from '../ui/Card';

export function GrowthRateCard({ spanClass = 'lg:col-span-4' }: { spanClass?: string }): JSX.Element {
  return (
    <Card variant="premium" className={`p-6 sm:p-7 ${spanClass}`.trim()}>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Growth rate</p>
          <p className="mt-2 text-lg font-semibold text-pl-ink">On track vs plan</p>
          <p className="mt-1 text-sm text-pl-slate">Rolling 90-day contribution pace</p>
        </div>
        <GrowthRing value={portfolioSummary.growthRatePct} />
      </div>
    </Card>
  );
}
