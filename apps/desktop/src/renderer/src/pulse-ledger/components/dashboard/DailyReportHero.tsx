import { IconMic } from '../../icons';
import { ActionButton } from '../ui/ActionButton';
import { Card } from '../ui/Card';

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
}

export function DailyReportHero(): JSX.Element {
  const today = new Date(2026, 4, 12);

  return (
    <section
      id="section-home"
      className="scroll-mt-28 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-8"
    >
      <div className="max-w-2xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-pl-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
            Hey, need help?
          </h1>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-pl-border-strong bg-pl-card text-pl-slate shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-pl-teal/45 hover:text-pl-teal hover:shadow-card active:translate-y-0"
            aria-label="Voice assistant"
          >
            <IconMic className="h-5 w-5" />
          </button>
        </div>
        <p className="max-w-xl text-base leading-relaxed text-pl-slate sm:text-lg">Your daily portfolio report is ready.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Card variant="premium" className="px-5 py-4 sm:px-7 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Today</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-pl-ink">{formatDate(today)}</p>
        </Card>
        <ActionButton
          variant="primary"
          type="button"
          className="inline-flex items-center justify-center rounded-[24px] px-7 py-3.5 hover:-translate-y-0.5 sm:rounded-[28px]"
        >
          Send Daily Report
        </ActionButton>
      </div>
    </section>
  );
}
