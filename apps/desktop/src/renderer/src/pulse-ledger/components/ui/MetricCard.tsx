import { Card } from './Card';

type Props = {
  label: string;
  value: string;
  hint?: string;
  span?: string;
  className?: string;
};

export function MetricCard({ label, value, hint, span = 'sm:col-span-3', className = '' }: Props): JSX.Element {
  return (
    <Card className={`p-6 sm:p-7 ${span} ${className}`.trim()}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-pl-ink tabular-nums sm:text-[1.65rem]">{value}</p>
      {hint ? <p className="mt-2 text-sm text-pl-slate">{hint}</p> : null}
    </Card>
  );
}
