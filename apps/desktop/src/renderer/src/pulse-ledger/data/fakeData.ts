export type RiskLevel = 'Low' | 'Medium' | 'High';
export type EmailStatus = 'Queued' | 'Sent' | 'Draft';

export interface HoldingRow {
  ticker: string;
  company: string;
  portfolio: string;
  currentPrice: number;
  dailyChangePct: number;
  positionValue: number;
  allocationPct: number;
  riskLevel: RiskLevel;
  aiSignal: string;
  emailStatus: EmailStatus;
}

export interface SparkPoint {
  i: number;
  v: number;
}

export interface AnnualBar {
  m: string;
  p: number;
}

export const portfolioSummary = {
  totalValue: 2_847_320.42,
  totalIncome: 48_920.11,
  totalExpenses: 12_340.55,
  dailyChangePct: 0.84,
  dailyChangeAbs: 23_771.2,
  growthRatePct: 72
};

export const sparklineSeries: SparkPoint[] = [
  { i: 0, v: 2.62 },
  { i: 1, v: 2.58 },
  { i: 2, v: 2.64 },
  { i: 3, v: 2.59 },
  { i: 4, v: 2.71 },
  { i: 5, v: 2.68 },
  { i: 6, v: 2.75 },
  { i: 7, v: 2.72 },
  { i: 8, v: 2.8 },
  { i: 9, v: 2.77 },
  { i: 10, v: 2.84 },
  { i: 11, v: 2.81 }
];

export const annualProfitBars: AnnualBar[] = [
  { m: 'J', p: 42 },
  { m: 'F', p: 38 },
  { m: 'M', p: 55 },
  { m: 'A', p: 48 },
  { m: 'M', p: 62 },
  { m: 'J', p: 58 },
  { m: 'J', p: 66 },
  { m: 'A', p: 61 },
  { m: 'S', p: 70 },
  { m: 'O', p: 64 },
  { m: 'N', p: 72 },
  { m: 'D', p: 68 }
];

export const riskAlert = {
  title: 'Concentration watch',
  detail:
    'Technology growth sleeve is 38% of total equity exposure. AI summary suggests trimming on strength if policy bands are exceeded.',
  severity: 'medium' as const
};

export const aiSummary =
  'Overnight, mega-cap growth led while defensives lagged. Your book shows mild net long beta with balanced factor tilts. Income accounts accrued scheduled distributions; no mandate breaches detected. Review PLTR and TSLA notes ahead of next week’s data cluster.';

export const activityItems = [
  { id: '1', label: 'Daily digest generated', time: '6:12 AM', tone: 'done' as const },
  { id: '2', label: 'Risk memo queued for compliance', time: '6:08 AM', tone: 'pending' as const },
  { id: '3', label: 'Recipient list synced (5)', time: '5:55 AM', tone: 'done' as const }
];

export const assignedRecipients = [
  { name: 'Jordan Lee', role: 'Portfolio lead', email: 'jordan.lee@example.com' },
  { name: 'Sam Rivera', role: 'Risk', email: 'sam.rivera@example.com' },
  { name: 'Alex Morgan', role: 'Advisor', email: 'alex.morgan@example.com' }
];

export const emailPreview = {
  subject: 'PulseLedger AI — Daily portfolio brief (May 12)',
  snippet:
    'Good morning — equities drifted higher on light volume. Your core sleeve added 0.84% on the day with balanced sector weights...',
  schedule: 'Weekdays · 6:15 AM ET',
  lastSent: 'May 11, 2026 · Delivered'
};

export const holdings: HoldingRow[] = [
  {
    ticker: 'NVDA',
    company: 'NVIDIA Corp.',
    portfolio: 'Core Growth',
    currentPrice: 1124.5,
    dailyChangePct: 1.24,
    positionValue: 412_800,
    allocationPct: 14.5,
    riskLevel: 'Medium',
    aiSignal: 'Momentum Improving',
    emailStatus: 'Sent'
  },
  {
    ticker: 'AAPL',
    company: 'Apple Inc.',
    portfolio: 'Core Growth',
    currentPrice: 198.32,
    dailyChangePct: -0.32,
    positionValue: 286_400,
    allocationPct: 10.1,
    riskLevel: 'Low',
    aiSignal: 'Hold',
    emailStatus: 'Queued'
  },
  {
    ticker: 'MSFT',
    company: 'Microsoft Corp.',
    portfolio: 'Core Growth',
    currentPrice: 418.9,
    dailyChangePct: 0.51,
    positionValue: 302_100,
    allocationPct: 10.6,
    riskLevel: 'Low',
    aiSignal: 'Strong Watch',
    emailStatus: 'Sent'
  },
  {
    ticker: 'PLTR',
    company: 'Palantir Technologies',
    portfolio: 'Satellite',
    currentPrice: 24.18,
    dailyChangePct: 2.05,
    positionValue: 98_200,
    allocationPct: 3.4,
    riskLevel: 'High',
    aiSignal: 'Earnings Watch',
    emailStatus: 'Draft'
  },
  {
    ticker: 'TSLA',
    company: 'Tesla Inc.',
    portfolio: 'Satellite',
    currentPrice: 178.44,
    dailyChangePct: -1.12,
    positionValue: 124_600,
    allocationPct: 4.4,
    riskLevel: 'High',
    aiSignal: 'Review Position',
    emailStatus: 'Queued'
  },
  {
    ticker: 'AMD',
    company: 'Advanced Micro Devices',
    portfolio: 'Core Growth',
    currentPrice: 164.22,
    dailyChangePct: 0.88,
    positionValue: 156_700,
    allocationPct: 5.5,
    riskLevel: 'Medium',
    aiSignal: 'Momentum Improving',
    emailStatus: 'Sent'
  },
  {
    ticker: 'META',
    company: 'Meta Platforms Inc.',
    portfolio: 'Core Growth',
    currentPrice: 512.4,
    dailyChangePct: 0.41,
    positionValue: 268_900,
    allocationPct: 9.4,
    riskLevel: 'Medium',
    aiSignal: 'Hold',
    emailStatus: 'Sent'
  }
];

export const mainStocksDisplay = [
  { ticker: 'NVDA', changePct: 1.24 },
  { ticker: 'AAPL', changePct: -0.32 },
  { ticker: 'MSFT', changePct: 0.51 },
  { ticker: 'META', changePct: 0.41 }
];
