type Props = {
  label: string;
  value: string;
  className?: string;
};

/** Compact label/value for sizing or allocation emphasis. */
export function PositionSizingCard({ label, value, className = '' }: Props): JSX.Element {
  return (
    <div className={`rounded-2xl border border-pl-border-muted bg-pl-muted/20 px-3 py-2 ${className}`.trim()}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-pl-mist">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-pl-ink">{value}</p>
    </div>
  );
}
