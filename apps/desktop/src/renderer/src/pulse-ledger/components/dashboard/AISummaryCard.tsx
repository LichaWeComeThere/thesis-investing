import { aiSummary } from '../../data/fakeData';
import { Card } from '../ui/Card';

export function AISummaryCard(): JSX.Element {
  return (
    <Card variant="premium" className="p-6 sm:p-7 lg:col-span-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">AI summary</p>
      <p className="mt-3 text-sm leading-relaxed text-pl-slate">{aiSummary}</p>
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-pl-muted">
        <div className="pl-progress-shine h-full w-2/3 rounded-full bg-gradient-to-r from-pl-teal-deep to-pl-teal" />
      </div>
      <p className="mt-2 text-xs text-pl-mist">Confidence · illustrative</p>
    </Card>
  );
}
