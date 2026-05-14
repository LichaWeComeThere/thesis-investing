import { ChevronDown } from 'lucide-react';
import type { BucketDef } from '../../score-stock/model';

type Props = {
  bucket: BucketDef;
  open: boolean;
  onToggle: () => void;
  earned: number;
  max: number;
  pct: number;
  variant: 'beginner' | 'advanced';
  children: React.ReactNode;
};

export function BucketAccordion({ bucket, open, onToggle, earned, max, pct, variant, children }: Props): JSX.Element {
  return (
    <div className="overflow-hidden rounded-[26px] border border-pl-border bg-pl-card shadow-sm transition-all duration-200 hover:border-pl-border-strong hover:shadow-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors sm:px-5 ${
          variant === 'beginner' ? 'hover:bg-pl-muted/20 sm:py-4' : 'hover:bg-pl-muted/25 sm:py-4'
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pl-teal/15 text-sm font-bold text-pl-teal ring-1 ring-pl-teal/25">
          {bucket.letter}
        </span>
        <div className="min-w-0 flex-1">
          {variant === 'beginner' ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">{bucket.beginnerSection}</p>
              <h3 className="mt-0.5 text-base font-semibold text-pl-ink sm:text-lg">{bucket.name}</h3>
            </>
          ) : (
            <p className="text-sm font-semibold text-pl-ink">
              Bucket {bucket.letter} — {bucket.name}
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-pl-slate">{bucket.plainEnglishSummary}</p>
          <p className="mt-2 text-[11px] text-pl-mist">
            {earned} / {max} pts · {pct}
            {variant === 'beginner' ? '% of bucket cap' : '% of bucket'}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pl-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pl-teal-deep to-pl-teal transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-pl-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          className={`border-t border-pl-border-muted px-4 sm:px-5 ${
            variant === 'beginner' ? 'pb-4 pt-1 sm:pb-5' : 'py-4 sm:py-5'
          }`}
        >
          <div className="space-y-4 sm:space-y-5">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
