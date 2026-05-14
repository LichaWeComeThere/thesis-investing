import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Wedge from 12 o'clock clockwise; clips shimmer to the active arc only. */
function describeWedge(cx: number, cy: number, r: number, pct: number): string {
  if (pct <= 0.05) return 'M 0 0';
  if (pct >= 99.95) {
    const pad = 3;
    return `M ${cx - r - pad} ${cy - r - pad} h ${2 * r + 2 * pad} v ${2 * r + 2 * pad} h ${-(2 * r + 2 * pad)} z`;
  }
  const a0 = -Math.PI / 2;
  const sweep = (pct / 100) * 2 * Math.PI;
  const a1 = a0 + sweep;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

export type LiquidProgressRingProps = {
  value: number;
  /** Center content; defaults to animated rounded percent. */
  renderPrimary?: (animatedPercent: number) => ReactNode;
  caption?: ReactNode;
  size?: number;
  ringStroke?: number;
  /** Fill-in duration when value updates (ms). */
  fillDurationMs?: number;
  className?: string;
};

export function LiquidProgressRing({
  value,
  renderPrimary,
  caption,
  size = 168,
  ringStroke = 10,
  fillDurationMs = 1000,
  className = ''
}: LiquidProgressRingProps): JSX.Element {
  const uid = useId().replace(/:/g, '');
  const gradId = `liquid-ring-grad-${uid}`;
  const clipId = `liquid-ring-clip-${uid}`;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - ringStroke - 6;
  const c = 2 * Math.PI * r;

  const target = clampPct(value);
  const [displayPct, setDisplayPct] = useState(0);
  const displayRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    if (reduceMotion) {
      displayRef.current = target;
      setDisplayPct(target);
      return;
    }

    const from = displayRef.current;
    const start = performance.now();

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / fillDurationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (target - from) * eased;
      displayRef.current = next;
      setDisplayPct(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
      }
    };

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, fillDurationMs, reduceMotion]);

  const offset = c - (displayPct / 100) * c;
  const wedge = describeWedge(cx, cy, r, displayPct);

  const primary =
    renderPrimary?.(displayPct) ?? (
      <span className="text-3xl font-semibold tracking-tight text-pl-ink tabular-nums">{Math.round(displayPct)}%</span>
    );

  return (
    <div className={`relative flex items-center justify-center ${className}`.trim()} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 pl-liquid-ring-svg">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="var(--pl-teal)" stopOpacity={0.88} />
            <stop offset="42%" stopColor="var(--pl-green)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--pl-teal)" stopOpacity={0.95} />
            {!reduceMotion ? (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from="0 0.5 0.5"
                to="360 0.5 0.5"
                dur="22s"
                repeatCount="indefinite"
              />
            ) : null}
          </linearGradient>
          <clipPath id={clipId}>
            <path d={wedge} />
          </clipPath>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--pl-ring-track)"
          strokeWidth={ringStroke}
          className="opacity-[0.92]"
        />

        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={ringStroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="pl-liquid-ring-progress"
        />

        {!reduceMotion && displayPct > 0.5 ? (
          <g clipPath={`url(#${clipId})`}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(10, ringStroke * 1.8)} ${c * 0.55}`}
              strokeDashoffset={0}
              className="pl-liquid-ring-shimmer"
            >
              <animate
                attributeName="stroke-dashoffset"
                values={`0;${(c * 0.97).toFixed(2)};0`}
                keyTimes="0;0.5;1"
                dur="18s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.2 1;0.42 0 0.2 1"
              />
            </circle>
          </g>
        ) : null}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {primary}
        {caption ? <div className="mt-0.5 max-w-[9rem]">{caption}</div> : null}
      </div>
    </div>
  );
}
