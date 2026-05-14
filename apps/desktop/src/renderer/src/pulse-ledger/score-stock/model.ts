export type ScoreMode = 'autofill' | 'beginner' | 'advanced';

export type FieldSource = 'polygon' | 'alpha_vantage' | 'manual' | 'missing' | 'demo';

export type FieldEntry = {
  value: number;
  source: FieldSource;
  manualOverride: boolean;
};

export type FieldDef = {
  key: string;
  advancedLabel: string;
  beginnerPrompt: string;
  helperAdvanced: string;
  helperBeginner: string;
  maxPoints: number;
  defaultValue: number;
  /** Short glossary line for the advanced label (native tooltip). */
  termTip?: string;
};

export type BucketDef = {
  id: string;
  letter: string;
  name: string;
  beginnerSection: string;
  /** One plain-English sentence describing what this bucket captures. */
  plainEnglishSummary: string;
  fields: FieldDef[];
};

export const BUCKETS: BucketDef[] = [
  {
    id: 'growth',
    letter: 'A',
    name: 'Growth Quality',
    beginnerSection: 'Growth',
    plainEnglishSummary:
      'How durable the growth story looks—sales momentum, earnings quality, and room left to reinvest.',
    fields: [
      {
        key: 'rev_growth',
        advancedLabel: 'Revenue growth trajectory',
        beginnerPrompt: 'How strong is revenue growth?',
        helperAdvanced: 'YoY or multi-year revenue CAGR vs peers.',
        helperBeginner: 'Higher means faster-growing sales.',
        maxPoints: 10,
        defaultValue: 55,
        termTip: 'Revenue growth trajectory: pace and consistency of sales growth versus history and peers.'
      },
      {
        key: 'earnings_quality',
        advancedLabel: 'Earnings quality score',
        beginnerPrompt: 'Are profits steady and believable?',
        helperAdvanced: 'Accruals, one-offs, and margin stability.',
        helperBeginner: 'Pick higher if earnings look clean and repeatable.',
        maxPoints: 10,
        defaultValue: 50,
        termTip:
          'Earnings quality: how much reported profit is backed by cash and repeatable operations (not one-time items).'
      },
      {
        key: 'runway',
        advancedLabel: 'Reinvestment runway',
        beginnerPrompt: 'Does the business still have room to reinvest?',
        helperAdvanced: 'TAM penetration, capex intensity, R&D optionality.',
        helperBeginner: 'Higher if you see years of growth ahead.',
        maxPoints: 8,
        defaultValue: 45,
        termTip: 'Runway: headroom to deploy capital into growth before returns naturally fade.'
      }
    ]
  },
  {
    id: 'business',
    letter: 'B',
    name: 'Business Quality',
    beginnerSection: 'Business quality',
    plainEnglishSummary:
      'How defendable and well-run the franchise is—returns on capital, moat, and balance-sheet resilience.',
    fields: [
      {
        key: 'moat',
        advancedLabel: 'Economic moat / defensibility',
        beginnerPrompt: 'How hard is it for competitors to copy this business?',
        helperAdvanced: 'Network effects, switching costs, scale, IP.',
        helperBeginner: 'Higher = stronger competitive position.',
        maxPoints: 10,
        defaultValue: 50,
        termTip: 'Economic moat: structural advantages that protect pricing power and market share over time.'
      },
      {
        key: 'roic',
        advancedLabel: 'Return on invested capital (proxy)',
        beginnerPrompt: 'Does the company earn good returns on the money it invests?',
        helperAdvanced: 'ROIC vs WACC and persistence.',
        helperBeginner: 'Higher if capital earns attractive returns.',
        maxPoints: 10,
        defaultValue: 48,
        termTip:
          'ROIC (return on invested capital): profit per dollar of debt + equity capital employed. WACC is the blended cost of that capital.'
      },
      {
        key: 'balance_sheet',
        advancedLabel: 'Balance sheet strength',
        beginnerPrompt: 'Is the balance sheet conservative?',
        helperAdvanced: 'Leverage, liquidity, covenant headroom.',
        helperBeginner: 'Higher if debt looks manageable.',
        maxPoints: 8,
        defaultValue: 52,
        termTip: 'Balance sheet strength: cushion to handle shocks—cash, maturities, leverage, and liquidity.'
      }
    ]
  },
  {
    id: 'momentum',
    letter: 'C',
    name: 'Momentum & Technical',
    beginnerSection: 'Momentum',
    plainEnglishSummary:
      'How price is behaving—trend structure, distance from highs, and strength versus the sector.',
    fields: [
      {
        key: 'trend_template',
        advancedLabel: 'Minervini trend template',
        beginnerPrompt: 'Is the stock in a strong uptrend?',
        helperAdvanced: 'Stage analysis, moving averages, relative strength.',
        helperBeginner: 'Higher if price action is constructive vs the market.',
        maxPoints: 10,
        defaultValue: 45,
        termTip:
          'Minervini-style trend template: a disciplined checklist (trend, structure, RS) for stage-based momentum investing.'
      },
      {
        key: 'dist_52w',
        advancedLabel: 'Distance from 52-week high',
        beginnerPrompt: 'How close is the stock to its highs?',
        helperAdvanced: 'Percent off highs; supply overhead.',
        helperBeginner: 'Higher if trading nearer highs with control.',
        maxPoints: 8,
        defaultValue: 40,
        termTip: 'Distance from 52-week high: how far price sits under its best level of the past year—supply overhead matters.'
      },
      {
        key: 'rel_strength',
        advancedLabel: 'Relative strength vs sector',
        beginnerPrompt: 'Is it outperforming peers?',
        helperAdvanced: 'RS line vs benchmark and sector median.',
        helperBeginner: 'Higher if outperforming similar names.',
        maxPoints: 8,
        defaultValue: 50,
        termTip: 'Relative strength: performance versus a benchmark or sector peers, not absolute return.'
      }
    ]
  },
  {
    id: 'valuation',
    letter: 'D',
    name: 'Valuation Fit',
    beginnerSection: 'Valuation',
    plainEnglishSummary:
      'Whether the price you pay lines up with cash generation and growth—multiples versus history and peers.',
    fields: [
      {
        key: 'pe_vs_hist',
        advancedLabel: 'P/E vs 5-year median',
        beginnerPrompt: 'Does valuation look reasonable vs its own history?',
        helperAdvanced: 'Multiple vs history and cycle position.',
        helperBeginner: 'Higher if multiples look undemanding.',
        maxPoints: 10,
        defaultValue: 45,
        termTip: 'P/E (price-to-earnings): price per dollar of earnings; comparing to its own five-year median shows cycle context.'
      },
      {
        key: 'fcf_yield',
        advancedLabel: 'Free cash flow yield',
        beginnerPrompt: 'How much cash yield are you paying for?',
        helperAdvanced: 'FCF yield vs risk-free and peers.',
        helperBeginner: 'Higher if cash generation looks attractive.',
        maxPoints: 10,
        defaultValue: 48,
        termTip: 'Free cash flow yield: free cash flow divided by enterprise value—cash returned to owners per dollar of price.'
      },
      {
        key: 'peg',
        advancedLabel: 'PEG / growth-adjusted multiple',
        beginnerPrompt: 'Are you paying a fair price for growth?',
        helperAdvanced: 'PEG vs sector and growth durability.',
        helperBeginner: 'Higher if growth looks underpriced.',
        maxPoints: 8,
        defaultValue: 46,
        termTip: 'PEG ratio: P/E divided by expected earnings growth—adjusts expensive multiples for faster growers.'
      }
    ]
  },
  {
    id: 'leadership',
    letter: 'E',
    name: 'Leadership & Narrative',
    beginnerSection: 'Leadership / story',
    plainEnglishSummary:
      'People and story—trust in management, clarity of strategy, and whether insiders are aligned with you.',
    fields: [
      {
        key: 'mgmt_cred',
        advancedLabel: 'Management credibility',
        beginnerPrompt: 'Do you trust leadership to execute?',
        helperAdvanced: 'Track record, capital allocation, guidance quality.',
        helperBeginner: 'Higher if leadership has earned trust.',
        maxPoints: 10,
        defaultValue: 50
      },
      {
        key: 'strategy_clarity',
        advancedLabel: 'Strategic clarity',
        beginnerPrompt: 'Is the strategy easy to understand and track?',
        helperAdvanced: 'KPI disclosure, narrative vs numbers.',
        helperBeginner: 'Higher if the plan is clear and measurable.',
        maxPoints: 8,
        defaultValue: 48
      },
      {
        key: 'insider',
        advancedLabel: 'Insider alignment',
        beginnerPrompt: 'Are insiders aligned with shareholders?',
        helperAdvanced: 'Ownership, buying/selling, compensation design.',
        helperBeginner: 'Higher if alignment looks strong.',
        maxPoints: 8,
        defaultValue: 47,
        termTip: 'Insider alignment: ownership, buying/selling behavior, and pay design vs long-term shareholder outcomes.'
      }
    ]
  },
  {
    id: 'structure',
    letter: 'F',
    name: 'Structure & Sentiment',
    beginnerSection: 'Risk / sentiment',
    plainEnglishSummary:
      'Market microstructure and mood—float/shorts, sentiment heat, and a quick fundamental health check.',
    fields: [
      {
        key: 'float_short',
        advancedLabel: 'Float / short interest structure',
        beginnerPrompt: 'Is the shareholder base stable?',
        helperAdvanced: 'Float, short %, borrow rates.',
        helperBeginner: 'Higher if structure looks orderly.',
        maxPoints: 8,
        defaultValue: 50,
        termTip: 'Float: shares freely tradable; short interest is borrowed shares sold short—together they shape squeeze and liquidity risk.'
      },
      {
        key: 'sentiment',
        advancedLabel: 'Sentiment / positioning',
        beginnerPrompt: 'Is sentiment overly euphoric or panicked?',
        helperAdvanced: 'Options skew, flows, contrarian context.',
        helperBeginner: 'Higher if positioning is not extreme either way.',
        maxPoints: 8,
        defaultValue: 52,
        termTip: 'Sentiment / positioning: how crowded or fearful positioning is—extremes can mean revert.'
      },
      {
        key: 'piotroski',
        advancedLabel: 'Piotroski F-Score',
        beginnerPrompt: 'Financial health (F-Score style)',
        helperAdvanced: 'Classic 9-point fundamental health screen.',
        helperBeginner: 'Higher means healthier fundamentals on this checklist.',
        maxPoints: 10,
        defaultValue: 55,
        termTip:
          'Piotroski F-Score: a 0–9 checklist of profitability, leverage, and operating efficiency trends from financial statements.'
      }
    ]
  }
];

export function defaultFieldMap(): Record<string, FieldEntry> {
  const m: Record<string, FieldEntry> = {};
  for (const b of BUCKETS) {
    for (const f of b.fields) {
      m[f.key] = { value: f.defaultValue, source: 'missing', manualOverride: false };
    }
  }
  return m;
}
