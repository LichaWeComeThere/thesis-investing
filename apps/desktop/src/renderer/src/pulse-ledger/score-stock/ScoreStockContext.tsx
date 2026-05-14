import { calculateMbsScore } from '@thesis-investing/core';
import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { BUCKETS, defaultFieldMap, type FieldEntry, type FieldSource, type ScoreMode } from './model';
import { INITIAL_DEV_DATA_SOURCE_LINES, type DevDataSourceLine } from '../dev/dataSourceTypes';

export type Ctx = {
  mode: ScoreMode;
  setMode: (m: ScoreMode) => void;
  ticker: string;
  setTicker: (t: string) => void;
  fields: Record<string, FieldEntry>;
  setFieldValue: (key: string, value: number, opts?: { manual?: boolean }) => void;
  runAutofill: () => void;
  resetAll: () => void;
  expandOpen: Record<string, boolean>;
  toggleBucket: (bucketId: string) => void;
  expandAllBuckets: () => void;
  collapseAllBuckets: () => void;
  goAdvancedReview: () => void;
  /** Dev-only: last autofill provider simulation; wire to API metadata when available */
  devDataSourceLines: DevDataSourceLine[];
  /** Official engine output — unchanged from packages/core */
  frameworkRaw: number;
  /** Local weighted preview for UI (does not replace core) */
  adjustedPreview: number;
  completenessPct: number;
  meiMultiplier: number;
  frameworkSignal: string;
  bucketScores: { id: string; letter: string; name: string; earned: number; max: number }[];
};

const ScoreCtx = createContext<Ctx | null>(null);

export { ScoreCtx };

type ApiRoll = 'live' | 'error' | 'mock';

function rollApiState(): ApiRoll {
  const r = Math.random();
  if (r < 0.5) return 'live';
  if (r < 0.78) return 'error';
  return 'mock';
}

function pickAutofillFieldSource(p: ApiRoll, a: ApiRoll): FieldSource {
  const bag: FieldSource[] = [];
  if (p === 'live') bag.push('polygon');
  if (a === 'live') bag.push('alpha_vantage');
  if (p === 'mock') bag.push('demo');
  if (a === 'mock') bag.push('demo');
  if (bag.length === 0) {
    return Math.random() < 0.9 ? 'demo' : 'missing';
  }
  return bag[Math.floor(Math.random() * bag.length)]!;
}

function applyAutofill(
  prev: Record<string, FieldEntry>,
  p: ApiRoll,
  a: ApiRoll
): { next: Record<string, FieldEntry>; lines: DevDataSourceLine[] } {
  let anyDemo = false;
  const next: Record<string, FieldEntry> = { ...prev };
  for (const b of BUCKETS) {
    for (const f of b.fields) {
      const src = pickAutofillFieldSource(p, a);
      if (src === 'demo') anyDemo = true;
      const jitter = Math.round((Math.random() - 0.5) * 24);
      const value = Math.min(100, Math.max(0, f.defaultValue + jitter));
      next[f.key] = { value, source: src, manualOverride: false };
    }
  }
  const mockLayerActive = anyDemo || p === 'mock' || a === 'mock';
  return {
    next,
    lines: [
      { id: 'polygon', label: 'Polygon', status: p },
      { id: 'alpha_vantage', label: 'Alpha Vantage', status: a },
      { id: 'mock', label: 'Mock / demo', status: mockLayerActive ? 'mock' : 'standby' }
    ]
  };
}

function computeMetrics(fields: Record<string, FieldEntry>) {
  let earned = 0;
  let max = 0;
  const bucketScores: Ctx['bucketScores'] = [];
  for (const b of BUCKETS) {
    let be = 0;
    let bm = 0;
    for (const f of b.fields) {
      const e = fields[f.key];
      const portion = ((e?.value ?? 0) / 100) * f.maxPoints;
      be += portion;
      bm += f.maxPoints;
    }
    earned += be;
    max += bm;
    bucketScores.push({
      id: b.id,
      letter: b.letter,
      name: b.name,
      earned: Math.round(be * 10) / 10,
      max: bm
    });
  }
  const adjustedPreview = max > 0 ? Math.round((earned / max) * 1000) / 10 : 0;
  let filled = 0;
  let total = 0;
  for (const b of BUCKETS) {
    for (const f of b.fields) {
      total += 1;
      if (fields[f.key]?.source !== 'missing') filled += 1;
    }
  }
  const completenessPct = total ? Math.round((filled / total) * 100) : 0;
  const sent = fields.sentiment?.value ?? 50;
  const meiMultiplier = Math.round((0.85 + (sent / 100) * 0.3) * 100) / 100;
  let frameworkSignal = 'Review';
  if (adjustedPreview >= 72) frameworkSignal = 'Strong watch';
  else if (adjustedPreview >= 58) frameworkSignal = 'Constructive';
  else if (adjustedPreview >= 45) frameworkSignal = 'Neutral';
  else frameworkSignal = 'Caution';
  return {
    adjustedPreview,
    completenessPct,
    meiMultiplier,
    frameworkSignal,
    bucketScores,
    earned,
    max
  };
}

export function ScoreStockProvider({ children }: { children: ReactNode }): JSX.Element {
  const [mode, setMode] = useState<ScoreMode>('autofill');
  const [ticker, setTicker] = useState('');
  const [fields, setFields] = useState<Record<string, FieldEntry>>(defaultFieldMap);
  const [devDataSourceLines, setDevDataSourceLines] =
    useState<DevDataSourceLine[]>(INITIAL_DEV_DATA_SOURCE_LINES);
  const [expandOpen, setExpandOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    for (const b of BUCKETS) o[b.id] = b.id === 'growth';
    return o;
  });

  const frameworkRaw = useMemo(() => calculateMbsScore(), []);

  const metrics = useMemo(() => computeMetrics(fields), [fields]);

  const setFieldValue = useCallback((key: string, value: number, opts?: { manual?: boolean }) => {
    setFields((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: Math.min(100, Math.max(0, value)),
        manualOverride: Boolean(opts?.manual),
        source: opts?.manual ? 'manual' : prev[key]?.source ?? 'manual'
      }
    }));
  }, []);

  const runAutofill = useCallback(() => {
    const sym = ticker.trim().toUpperCase();
    if (!sym) return;
    const p = rollApiState();
    const a = rollApiState();
    setFields((prev) => {
      const { next, lines } = applyAutofill(prev, p, a);
      setDevDataSourceLines(lines);
      return next;
    });
  }, [ticker]);

  const resetAll = useCallback(() => {
    setTicker('');
    setFields(defaultFieldMap());
    setDevDataSourceLines(INITIAL_DEV_DATA_SOURCE_LINES);
    setExpandOpen(() => {
      const o: Record<string, boolean> = {};
      for (const b of BUCKETS) o[b.id] = b.id === 'growth';
      return o;
    });
    setMode('autofill');
  }, []);

  const toggleBucket = useCallback((bucketId: string) => {
    setExpandOpen((p) => ({ ...p, [bucketId]: !p[bucketId] }));
  }, []);

  const expandAllBuckets = useCallback(() => {
    setExpandOpen(() => {
      const o: Record<string, boolean> = {};
      for (const b of BUCKETS) o[b.id] = true;
      return o;
    });
  }, []);

  const collapseAllBuckets = useCallback(() => {
    setExpandOpen(() => {
      const o: Record<string, boolean> = {};
      for (const b of BUCKETS) o[b.id] = false;
      return o;
    });
  }, []);

  const goAdvancedReview = useCallback(() => {
    setMode('advanced');
    expandAllBuckets();
  }, [expandAllBuckets]);

  const value: Ctx = useMemo(
    () => ({
      mode,
      setMode,
      ticker,
      setTicker,
      fields,
      setFieldValue,
      runAutofill,
      resetAll,
      expandOpen,
      toggleBucket,
      expandAllBuckets,
      collapseAllBuckets,
      goAdvancedReview,
      devDataSourceLines,
      frameworkRaw,
      adjustedPreview: metrics.adjustedPreview,
      completenessPct: metrics.completenessPct,
      meiMultiplier: metrics.meiMultiplier,
      frameworkSignal: metrics.frameworkSignal,
      bucketScores: metrics.bucketScores
    }),
    [
      mode,
      ticker,
      fields,
      setFieldValue,
      runAutofill,
      resetAll,
      expandOpen,
      toggleBucket,
      expandAllBuckets,
      collapseAllBuckets,
      goAdvancedReview,
      devDataSourceLines,
      frameworkRaw,
      metrics
    ]
  );

  return <ScoreCtx.Provider value={value}>{children}</ScoreCtx.Provider>;
}
