import { AlertCircle, CheckCircle2, Circle, FlaskConical } from 'lucide-react';
import type { DevDataSourceLine } from './dataSourceTypes';
import { showDevDataSourceStatus } from './devEnv';

function statusMeta(line: DevDataSourceLine): {
  Icon: typeof CheckCircle2;
  iconClass: string;
  label: string;
  title: string;
} {
  if (line.id === 'mock') {
    if (line.status === 'mock') {
      return {
        Icon: FlaskConical,
        iconClass: 'text-pl-teal',
        label: 'Active',
        title: 'Demo or mock fallback data contributed to this autofill.'
      };
    }
    if (line.status === 'standby') {
      return {
        Icon: Circle,
        iconClass: 'text-pl-mist',
        label: 'Idle',
        title: 'No demo/mock layer used for the last autofill (live API paths only).'
      };
    }
  }

  switch (line.status) {
    case 'live':
      return {
        Icon: CheckCircle2,
        iconClass: 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]',
        label: 'Live',
        title: 'Live data returned successfully (dev simulation).'
      };
    case 'error':
      return {
        Icon: AlertCircle,
        iconClass: 'text-red-400',
        label: 'Error',
        title: 'Provider request failed or returned no usable payload (dev simulation).'
      };
    case 'mock':
      return {
        Icon: FlaskConical,
        iconClass: 'text-pl-teal',
        label: 'Mock',
        title: 'Mock, sandbox, or local demo data used for this autofill.'
      };
    default:
      return {
        Icon: Circle,
        iconClass: 'text-pl-mist',
        label: 'Standby',
        title: 'Not queried yet. Run Auto-fill to refresh provider status.'
      };
  }
}

type Props = {
  lines: DevDataSourceLine[];
  /** Tighter padding and smaller type for inline rows */
  dense?: boolean;
  className?: string;
  /** Hide the small dev hint line (e.g. when stacked near other help text) */
  showFootnote?: boolean;
};

export function DevDataSourceStrip({
  lines,
  dense,
  className = '',
  showFootnote = true
}: Props): JSX.Element | null {
  if (!showDevDataSourceStatus()) return null;

  return (
    <div
      className={`rounded-[16px] border border-dashed border-pl-border-strong/70 bg-pl-muted/25 ${dense ? 'px-3 py-2' : 'px-4 py-3'} ${className}`}
      role="status"
      aria-label="Development data source status"
    >
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${dense ? 'text-[11px]' : 'text-xs'}`}>
        <span className="font-semibold uppercase tracking-wide text-pl-mist">Data sources</span>
        <span className="hidden h-3 w-px bg-pl-border-strong sm:inline" aria-hidden />
        {lines.map((line) => {
          const meta = statusMeta(line);
          const { Icon } = meta;
          return (
            <span
              key={line.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-pl-card/80 px-2.5 py-1 text-[11px] font-medium ring-1 ring-pl-border-muted transition-colors duration-200 hover:ring-pl-teal/25"
              title={`${line.label}: ${meta.title}`}
            >
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${meta.iconClass} ${line.status === 'live' ? 'motion-safe:animate-pulse' : ''}`}
                aria-hidden
              />
              <span className="font-medium text-pl-ink">{line.label}</span>
              <span className="text-pl-mist">{meta.label}</span>
            </span>
          );
        })}
      </div>
      {showFootnote ? (
        <p className={`mt-1.5 text-pl-mist ${dense ? 'text-[10px]' : 'text-[11px]'}`}>
          Dev build only. Status updates when you run Auto-fill; wire to real API metadata when available.
        </p>
      ) : null}
    </div>
  );
}
