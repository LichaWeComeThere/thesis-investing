import { useScoreStock } from '../../score-stock/useScoreStock';
import { activeGlowClass } from '../../animations';

export function ScoreModeTabs(): JSX.Element {
  const { mode, setMode } = useScoreStock();
  const tabs: { id: typeof mode; label: string; hint: string }[] = [
    { id: 'autofill', label: 'Auto-Fill', hint: 'Fast scoring with provider data' },
    { id: 'beginner', label: 'Beginner', hint: 'Plain-English prompts' },
    { id: 'advanced', label: 'Advanced', hint: 'Full control & buckets' }
  ];
  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-1 rounded-[18px] border border-pl-border-muted bg-pl-muted/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:mb-6"
      role="tablist"
      aria-label="Scoring mode"
    >
      {tabs.map((t) => {
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={t.hint}
            onClick={() => setMode(t.id)}
            className={`relative flex-1 rounded-[14px] px-3 py-2.5 text-center text-xs font-semibold transition-all duration-200 ease-out sm:flex-none sm:min-w-[7.5rem] sm:px-4 sm:text-sm ${
              active
                ? `bg-pl-card text-pl-ink shadow-card ring-1 ${activeGlowClass}`
                : 'text-pl-slate hover:bg-pl-card/55 hover:text-pl-ink'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
