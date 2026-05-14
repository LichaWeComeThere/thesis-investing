import { BUCKETS } from '../../score-stock/model';
import { useScoreStock } from '../../score-stock/useScoreStock';
import { BucketAccordion } from './BucketAccordion';
import { FieldSourceIndicator } from './FieldSourceIndicator';
import { TermTip } from './TermTip';

export function AdvancedScorerPanel(): JSX.Element {
  const { expandOpen, toggleBucket, expandAllBuckets, collapseAllBuckets, fields, setFieldValue, bucketScores } =
    useScoreStock();
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={expandAllBuckets}
          className="rounded-full border border-pl-border-strong bg-pl-card px-3 py-1.5 text-xs font-semibold text-pl-ink transition hover:border-pl-teal/35"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={collapseAllBuckets}
          className="rounded-full border border-pl-border-strong bg-pl-card px-3 py-1.5 text-xs font-semibold text-pl-ink transition hover:border-pl-teal/35"
        >
          Collapse all
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
              variant="advanced"
            >
              {bucket.fields.map((f) => {
                const e = fields[f.key];
                const val = e?.value ?? 0;
                const contrib = Math.round(((val / 100) * f.maxPoints) * 10) / 10;
                return (
                  <div key={f.key} className="rounded-xl border border-pl-border-muted bg-pl-muted/15 p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-semibold text-pl-ink">{f.advancedLabel}</p>
                          {f.termTip ? <TermTip text={f.termTip} /> : null}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-pl-slate">{f.helperAdvanced}</p>
                      </div>
                      <span
                        title="Contribution to thesis preview"
                        className="shrink-0 text-xs font-semibold text-pl-teal"
                      >
                        +{contrib} / {f.maxPoints}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(ev) => setFieldValue(f.key, Number(ev.target.value), { manual: true })}
                        className="w-full min-w-0 flex-1 accent-pl-teal sm:min-w-[200px]"
                      />
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="w-10 tabular-nums text-sm font-medium text-pl-ink">{val}</span>
                        <FieldSourceIndicator entry={e ?? { value: 0, source: 'missing', manualOverride: false }} />
                      </div>
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
