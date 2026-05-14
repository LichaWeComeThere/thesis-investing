import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type Props = {
  /** Called after enter + hold + exit animations so parent can unmount this instance. */
  onComplete: () => void;
};

/**
 * Lightweight, non-blocking save + reset confirmation centered in the viewport.
 * Wrapper uses pointer-events-none so the UI stays interactive.
 */
export function SaveResetFeedback({ onComplete }: Props): JSX.Element {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setEntered(true));
    });
    const tExit = window.setTimeout(() => setExiting(true), 1280);
    const tDone = window.setTimeout(() => onComplete(), 1680);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(tExit);
      window.clearTimeout(tDone);
    };
  }, [onComplete]);

  const cardMotion =
    exiting || !entered
      ? 'opacity-0 scale-[0.97] translate-y-2'
      : 'opacity-100 scale-100 translate-y-0';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center p-6 sm:p-10"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`pointer-events-none max-w-[min(100%,20rem)] rounded-3xl border border-pl-border-strong bg-pl-card/92 px-7 py-6 text-center shadow-[0_0_0_1px_rgba(45,212,191,0.08),0_18px_50px_-12px_rgba(0,0,0,0.55),0_0_40px_-18px_rgba(45,212,191,0.25)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${cardMotion}`}
      >
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pl-teal/12 ring-1 ring-pl-teal/25 transition-transform duration-700 ease-out motion-reduce:transition-none ${entered ? 'rotate-[360deg]' : 'rotate-0'}`}
        >
          <RefreshCw
            className={`h-6 w-6 text-pl-teal transition-opacity duration-300 ${entered ? 'opacity-100' : 'opacity-70'}`}
            strokeWidth={2}
            aria-hidden
          />
        </div>
        <p className="text-base font-semibold tracking-tight text-pl-ink">Saved and reset</p>
        <p className="mt-1.5 text-sm leading-snug text-pl-slate">Ready for the next stock</p>
      </div>
    </div>
  );
}
