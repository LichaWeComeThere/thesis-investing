type Props = {
  label: string;
  pct: number;
  className?: string;
};

/** Compact completeness-style meter (used in Auto-Fill). */
export function ConfidenceBadge({ label, pct, className = '' }: Props): JSX.Element {
  return (
    <div className={`rounded-2xl border border-pl-border bg-pl-card/80 p-4 ${className}`.trim()}>
      <p className="text-xs font-semibold uppercase tracking-wide text-pl-mist">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-pl-ink">{pct}%</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-pl-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pl-teal-deep to-pl-teal transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
