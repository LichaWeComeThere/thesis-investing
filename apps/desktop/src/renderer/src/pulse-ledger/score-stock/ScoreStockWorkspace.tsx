import { useCallback, useState } from 'react';
import { ScoreStockProvider } from './ScoreStockContext';
import { useScoreStock } from './useScoreStock';
import { DevDataSourceStrip } from '../dev/DevDataSourceStrip';
import { SaveResetFeedback } from './SaveResetFeedback';
import { AdvancedScorerPanel } from '../components/scorer/AdvancedScorerPanel';
import { AutoFillPanel } from '../components/scorer/AutoFillPanel';
import { BeginnerScorerPanel } from '../components/scorer/BeginnerScorerPanel';
import { LiveScorePanel } from '../components/scorer/LiveScorePanel';
import { RecommendedModeTag } from '../components/scorer/ScoreBadge';
import { ScoreModeTabs } from '../components/scorer/ScoreModeTabs';

function ScoreStockInner(): JSX.Element {
  const { mode, devDataSourceLines, resetAll } = useScoreStock();
  const [celebrationKey, setCelebrationKey] = useState(0);
  const dismissCelebration = useCallback(() => {
    setCelebrationKey(0);
  }, []);
  const triggerSavedCelebration = useCallback(() => {
    resetAll();
    setCelebrationKey((k) => k + 1);
  }, [resetAll]);

  return (
    <>
      {celebrationKey > 0 ? (
        <SaveResetFeedback key={celebrationKey} onComplete={dismissCelebration} />
      ) : null}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-x-10 lg:gap-y-10">
        <div className="order-2 min-w-0 space-y-5 lg:order-1 lg:col-span-7">
          <div className="mb-1 flex flex-wrap items-center gap-2 sm:mb-2">
            <h2 className="text-xl font-semibold tracking-tight text-pl-ink sm:text-2xl">Score stock</h2>
            <RecommendedModeTag />
          </div>
          <p className="text-sm leading-relaxed text-pl-slate">
            Same calculator state across modes. Switch anytime — your inputs are preserved.
          </p>
          <DevDataSourceStrip lines={devDataSourceLines} className="mt-1" />
          <ScoreModeTabs />
          {mode === 'autofill' ? <AutoFillPanel /> : null}
          {mode === 'beginner' ? <BeginnerScorerPanel /> : null}
          {mode === 'advanced' ? <AdvancedScorerPanel /> : null}
        </div>
        <div className="order-1 lg:order-2 lg:col-span-5">
          <LiveScorePanel onStockSaved={triggerSavedCelebration} />
        </div>
      </div>
    </>
  );
}

export function ScoreStockWorkspace(): JSX.Element {
  return (
    <ScoreStockProvider>
      <ScoreStockInner />
    </ScoreStockProvider>
  );
}
