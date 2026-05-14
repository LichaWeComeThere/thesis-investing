/** Recommended workflow callout on the score workspace header. */
export function RecommendedModeTag(): JSX.Element {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-pl-teal/12 px-3 py-1 text-[11px] font-semibold leading-snug text-pl-teal ring-1 ring-pl-teal/30 sm:text-xs">
      Recommended · Auto-Fill
    </span>
  );
}

/** Framework signal pill next to the live thesis score. */
export function ScoreBadge({ signal }: { signal: string }): JSX.Element {
  const signalTone =
    signal === 'Strong watch'
      ? 'bg-pl-teal/15 text-pl-teal ring-pl-teal/35'
      : signal === 'Caution'
        ? 'bg-pl-coralsoft text-pl-coral ring-pl-coral/25'
        : 'bg-pl-muted text-pl-ink ring-pl-border-muted';

  return (
    <span
      className={`pl-badge-chip max-w-[11rem] shrink-0 justify-center text-center text-[11px] font-semibold leading-snug ${signalTone}`}
    >
      {signal}
    </span>
  );
}
