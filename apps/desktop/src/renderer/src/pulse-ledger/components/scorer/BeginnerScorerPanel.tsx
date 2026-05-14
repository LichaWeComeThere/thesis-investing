import { HelpCircle } from 'lucide-react';
import { BUCKETS } from '../../score-stock/model';
import { useScoreStock } from '../../score-stock/useScoreStock';
import { BucketAccordion } from './BucketAccordion';
import { FieldSourceIndicator } from './FieldSourceIndicator';
import { TermTip } from './TermTip';

export function BeginnerScorerPanel(): JSX.Element {
  const { fields, setFieldValue, expandOpen, toggleBucket, expandAllBuckets, collapseAllBuckets, bucketScores } =
    useScoreStock();
  const segments = [
    { label: 'Low', v: 28 },
    { label: 'Mid', v: 52 },
    { label: 'High', v: 78 }
  ];
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={expandAllBuckets}
          className="rounded-full border border-pl-border-strong bg-pl-card px-3 py-1.5 text-xs font-semibold text-pl-ink transition hover:border-pl-teal/35"
        >
          Expand all buckets
        </button>
        <button
          type="button"
          onClick={collapseAllBuckets}
          className="rounded-full border border-pl-border-strong bg-pl-card px-3 py-1.5 text-xs font-semibold text-pl-ink transition hover:border-pl-teal/35"
        >
          Collapse all buckets
        </button>
      </div>
      <div className="space-y-3 sm:space-y-4">
        {BUCKETS.map((bucket) => {
          const open = expandOpen[bucket.id];
          const bs = bucketScores.find((x) => x.id === bucket.id);
          const pct = bs && bs.max > 0 ? Math.round((bs.earned / bs.max) * 100) : 0;
          return (
            <BucketAccordion
              key={bucket.id}
              bucket={bucket}
              open={open}
              onToggle={() => toggleBucket(bucket.id)}
              earned={bs?.earned ?? 0}
              max={bs?.max ?? 0}
              pct={pct}
              variant="beginner"
            >
              {bucket.fields.map((f) => {
                const e = fields[f.key];
                const val = e?.value ?? 0;
                return (
                  <div key={f.key} className="rounded-2xl border border-pl-border-muted bg-pl-muted/15 p-4 sm:p-4">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm font-medium text-pl-ink">{f.beginnerPrompt}</p>
                      {f.termTip ? <TermTip text={f.termTip} /> : null}
                      {!f.termTip ? (
                        <span title={f.helperBeginner} className="shrink-0 text-pl-mist">
                          <HelpCircle className="h-4 w-4" aria-hidden />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-pl-slate">{f.helperBeginner}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {segments.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => setFieldValue(f.key, s.v, { manual: true })}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                            Math.abs(val - s.v) < 8
                              ? 'bg-pl-pill-active-bg text-pl-pill-active-fg ring-1 ring-pl-teal/30'
                              : 'bg-pl-card text-pl-slate ring-1 ring-pl-border hover:border-pl-border-strong'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(ev) => setFieldValue(f.key, Number(ev.target.value), { manual: true })}
                        className="w-full accent-pl-teal"
                      />
                      <div className="mt-1 flex justify-between text-[11px] text-pl-faint">
                        <span>0</span>
                        <span className="tabular-nums text-pl-ink">{val}</span>
                        <span>100</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <FieldSourceIndicator entry={e ?? { value: 0, source: 'missing', manualOverride: false }} />
                    </div>
                  </div>
                );
              })}
            </BucketAccordion>
          );
        })}
      </div>
    </div>
  );
}
