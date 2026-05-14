import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useScoreStock } from '../../score-stock/useScoreStock';
import { WhyThisScoreCard } from '../../score-stock/WhyThisScoreCard';
import { ActionButton } from '../ui/ActionButton';
import { ScoreBadge } from './ScoreBadge';

export function LiveScorePanel({ onStockSaved }: { onStockSaved: () => void }): JSX.Element {
  const {
    ticker,
    frameworkRaw,
    adjustedPreview,
    meiMultiplier,
    frameworkSignal,
    resetAll,
    completenessPct
  } = useScoreStock();
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const thesisScore = Math.round(adjustedPreview * meiMultiplier * 10) / 10;

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="pl-score-dock pl-premium-card relative overflow-hidden rounded-[26px] border border-pl-border-strong bg-gradient-to-b from-pl-card via-pl-card to-pl-muted/40 p-6 sm:rounded-[28px] sm:p-7">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pl-teal/45 to-transparent"
          aria-hidden
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pl-teal" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Score summary</p>
            </div>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-pl-teal tabular-nums sm:text-[2.35rem]">
              {thesisScore}
            </p>
            <p className="mt-1 text-xs text-pl-slate">Thesis score (preview)</p>
          </div>
          <ScoreBadge signal={frameworkSignal} />
        </div>

        {resetNotice ? (
          <p className="mt-4 rounded-xl bg-pl-muted px-3 py-2 text-xs font-medium text-pl-slate ring-1 ring-pl-border-muted">
            {resetNotice}
          </p>
        ) : null}

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-pl-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pl-teal-deep to-pl-teal transition-all duration-300"
            style={{ width: `${completenessPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-pl-mist">Completeness · {completenessPct}%</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-pl-border-muted bg-pl-muted/20 p-4 text-sm ring-1 ring-pl-border-muted/40">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-pl-mist">Adjusted (preview)</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-pl-ink">{adjustedPreview}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-pl-mist">MEI multiplier</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-pl-ink">×{meiMultiplier}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-pl-mist">Raw (framework)</dt>
            <dd className="mt-1 font-semibold tabular-nums text-pl-ink">{frameworkRaw}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-pl-mist">Ticker</dt>
            <dd className="mt-1 font-semibold tracking-wide text-pl-ink">{ticker ? ticker.toUpperCase() : '—'}</dd>
          </div>
        </dl>

        <p className="mt-4 text-[11px] leading-relaxed text-pl-mist">
          Raw uses <code className="rounded bg-pl-muted px-1 py-px text-[10px]">calculateMbsScore()</code> from core
          (unchanged). Adjusted preview and thesis score are local UI weighting only.
        </p>

        <WhyThisScoreCard />

        <div className="mt-6 flex flex-col gap-2.5">
          <ActionButton variant="primary" type="button" onClick={() => onStockSaved()}>
            Save to portfolio
          </ActionButton>
          <ActionButton variant="secondary" type="button" onClick={() => onStockSaved()}>
            Save to watchlist
          </ActionButton>
          <button
            type="button"
            onClick={() => {
              resetAll();
              setResetNotice('Workspace cleared.');
              window.setTimeout(() => setResetNotice(null), 1800);
            }}
            className="rounded-2xl border border-dashed border-pl-border-strong py-2 text-xs font-semibold text-pl-slate transition hover:text-pl-ink"
          >
            Reset workspace
          </button>
        </div>
      </div>
    </aside>
  );
}
