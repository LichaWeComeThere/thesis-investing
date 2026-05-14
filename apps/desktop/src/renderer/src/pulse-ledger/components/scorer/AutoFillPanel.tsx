import { Wand2 } from 'lucide-react';
import { BUCKETS } from '../../score-stock/model';
import { useScoreStock } from '../../score-stock/useScoreStock';
import { ActionButton } from '../ui/ActionButton';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FieldSourceIndicator } from './FieldSourceIndicator';

export function AutoFillPanel(): JSX.Element {
  const { ticker, setTicker, fields, runAutofill, goAdvancedReview, completenessPct } = useScoreStock();
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-pl-mist" htmlFor="ticker-autofill">
            Ticker
          </label>
          <input
            id="ticker-autofill"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g. NVDA"
            className="mt-1.5 w-full rounded-2xl border border-pl-border-strong bg-pl-card px-4 py-3 text-sm font-semibold tracking-wide text-pl-ink outline-none transition-all duration-200 focus:border-pl-teal/45 focus:ring-4 focus:ring-pl-teal/20"
          />
        </div>
        <ActionButton variant="teal" type="button" onClick={runAutofill} className="inline-flex items-center justify-center gap-2">
          <Wand2 className="h-4 w-4" aria-hidden />
          Auto-fill
        </ActionButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ConfidenceBadge label="Completeness" pct={completenessPct} />
        <div className="rounded-2xl border border-pl-border bg-pl-card/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-pl-mist">Confidence</p>
          <p className="mt-2 text-sm leading-relaxed text-pl-slate">
            Mock providers fill fields when available. Missing items stay editable in any mode.
          </p>
        </div>
      </div>

      <div className="rounded-[26px] border border-pl-border bg-pl-card p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-pl-mist">Auto-filled snapshot</p>
        <ul className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {BUCKETS.flatMap((b) =>
            b.fields.map((f) => {
              const e = fields[f.key];
              return (
                <li
                  key={f.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-pl-border-muted bg-pl-muted/25 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-pl-ink">{f.advancedLabel}</span>
                  <span className="tabular-nums text-pl-slate">{e?.value ?? 0}</span>
                  <FieldSourceIndicator entry={e ?? { value: 0, source: 'missing', manualOverride: false }} />
                </li>
              );
            })
          )}
        </ul>
        <button
          type="button"
          onClick={goAdvancedReview}
          className="mt-4 w-full rounded-xl border border-dashed border-pl-border-strong py-2 text-xs font-semibold text-pl-teal transition-colors hover:bg-pl-teal/10"
        >
          Review in Advanced
        </button>
      </div>
    </div>
  );
}
