import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { BUCKETS } from './model';
import { useScoreStock } from './useScoreStock';

function bucketFill(earned: number, max: number): number {
  return max > 0 ? Math.round((earned / max) * 1000) / 10 : 0;
}

function formatBucketLine(b: { letter: string; name: string; fill: number }): string {
  return `Bucket ${b.letter} (${b.name}), ~${b.fill}% of its cap`;
}

type InsightBlock = { title: string; body: string };

export function WhyThisScoreCard(): JSX.Element {
  const { bucketScores, adjustedPreview, frameworkSignal, meiMultiplier, fields, completenessPct, frameworkRaw } =
    useScoreStock();

  const blocks = useMemo((): InsightBlock[] => {
    const thesisScore = Math.round(adjustedPreview * meiMultiplier * 10) / 10;

    const enriched = bucketScores.map((b) => ({
      ...b,
      fill: bucketFill(b.earned, b.max)
    }));
    const strongestFirst = [...enriched].sort((a, b) => b.fill - a.fill);
    const weakestFirst = [...enriched].sort((a, b) => a.fill - b.fill);

    const topPick = strongestFirst.slice(0, 2);
    const bottomPick = weakestFirst.slice(0, 2);

    let missingCount = 0;
    const missingBucketHits = new Map<string, number>();
    for (const b of BUCKETS) {
      let n = 0;
      for (const f of b.fields) {
        if (fields[f.key]?.source === 'missing') {
          n += 1;
          missingCount += 1;
        }
      }
      if (n > 0) missingBucketHits.set(b.name, n);
    }

    const missingBucketsText =
      missingBucketHits.size === 0
        ? ''
        : Array.from(missingBucketHits.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, n]) => `${name} (${n})`)
            .join(', ');

    const spread =
      strongestFirst.length && weakestFirst.length ? strongestFirst[0].fill - weakestFirst[0].fill : 0;

    const overall: InsightBlock = {
      title: 'Overall result',
      body:
        `Core framework raw (engine) is ${frameworkRaw}. Your adjusted preview is ${adjustedPreview} from the sliders, ` +
        `which reads as "${frameworkSignal}" using the usual bands (72 / 58 / 45). ` +
        `Sentiment applies ×${meiMultiplier}, so the thesis preview lands at ${thesisScore}.`
    };

    const strongest: InsightBlock = {
      title: 'Strongest buckets',
      body:
        spread < 2
          ? 'All buckets are within a couple of points of each other versus their caps—no single bucket is dominating yet.'
          : `Leading inputs: ${topPick.map(formatBucketLine).join('; ')}.`
    };

    const weakest: InsightBlock = {
      title: 'Weakest buckets',
      body:
        spread < 2
          ? 'Nothing stands out as weak yet—nudge any bucket where you have lower conviction.'
          : `Most headroom: ${bottomPick.map(formatBucketLine).join('; ')}.`
    };

    const missing: InsightBlock = {
      title: 'Missing information',
      body:
        missingCount === 0
          ? `Nothing is flagged "missing" right now. Completeness is ${completenessPct}% because manual, demo, or provider tags count as filled—not only live feeds.`
          : `${missingCount} input${missingCount === 1 ? '' : 's'} still use a "missing" data flag${
              missingBucketsText ? ` (${missingBucketsText})` : ''
            }. Fill or auto-fill them so the preview is not leaning on empty slots.`
    };

    const weakestFill = weakestFirst[0]?.fill ?? 0;
    const sentiment = fields.sentiment?.value ?? 50;
    let nextBody = '';
    if (missingCount > 0) {
      nextBody =
        'Fill or auto-fill the missing inputs first—completeness drives how trustworthy the preview feels.';
    } else if (weakestFill < 35) {
      nextBody = `Revisit ${weakestFirst[0].name} (Bucket ${weakestFirst[0].letter})—it is furthest below its cap, so small edits there move the preview the most.`;
    } else if (sentiment <= 20 || sentiment >= 92) {
      nextBody =
        'Check the sentiment / positioning slider—it is near an extreme, which swings the MEI multiplier. Confirm that matches your real view.';
    } else if (spread > 18) {
      nextBody =
        'Compare your strongest and weakest buckets against your written thesis—large spreads usually mean one story is optimistic and another is conservative.';
    } else {
      nextBody =
        'Scan any slider that still feels like a placeholder, then re-read the signal—when buckets are tight, small edits change the story.';
    }

    const next: InsightBlock = {
      title: 'What to review next',
      body: nextBody
    };

    return [overall, strongest, weakest, missing, next];
  }, [bucketScores, adjustedPreview, frameworkSignal, meiMultiplier, fields, completenessPct, frameworkRaw]);

  return (
    <div className="mt-5 rounded-[18px] border border-pl-border-muted bg-pl-card/50 p-4 ring-1 ring-pl-teal/15 backdrop-blur-sm sm:p-5">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 shrink-0 text-pl-teal" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wide text-pl-mist">Why this score?</p>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-pl-mist">
        Rule-based summary from your current sliders and flags—no AI, no external calls.
      </p>
      <dl className="mt-4 space-y-3.5">
        {blocks.map((block) => (
          <div key={block.title}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-pl-mist">{block.title}</dt>
            <dd className="mt-1 text-xs leading-relaxed text-pl-slate">{block.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
