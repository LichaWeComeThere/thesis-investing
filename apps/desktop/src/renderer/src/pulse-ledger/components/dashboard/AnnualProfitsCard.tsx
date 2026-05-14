import { annualProfitBars } from '../../data/fakeData';
import { AnnualProfitBars } from '../../charts/DashboardCharts';
import { Card } from '../ui/Card';

export function AnnualProfitsCard(): JSX.Element {
  return (
    <Card variant="premium" className="p-6 sm:p-7 lg:col-span-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Annual profits</p>
      <p className="mt-2 text-lg font-semibold text-pl-ink">Realized + accrued</p>
      <p className="text-sm text-pl-slate">Quiet grid · no legend clutter</p>
      <div className="mt-5">
        <AnnualProfitBars data={annualProfitBars} />
      </div>
    </Card>
  );
}
