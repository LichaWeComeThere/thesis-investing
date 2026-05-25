export type MockThesisIdeaStatus =
  | 'Watchlist'
  | 'Researching'
  | 'Active'
  | 'Needs Review'
  | 'Caution'
  | 'Archived';

export type MockThesisStatus =
  | 'Strong'
  | 'Stable'
  | 'Improving'
  | 'Weakening'
  | 'Broken';

export type MockThesisConviction = 'High' | 'Medium' | 'Low' | 'Unrated';

export type MockThesisRiskLevel = 'Low' | 'Medium' | 'High';

export type MockThesisDecisionLogEntry = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
};

export type MockThesis = {
  id: string;
  ticker: string;
  companyName: string;
  theme: string;
  ideaStatus: MockThesisIdeaStatus;
  thesisStatus: MockThesisStatus;
  mbsScore: number;
  previousMbsScore: number;
  conviction: MockThesisConviction;
  riskLevel: MockThesisRiskLevel;
  thesisSummary: string;
  bullCase: string;
  bearCase: string;
  keyRisks: string;
  catalysts: string;
  lastReviewedDate: string;
  nextReviewDate: string;
  decisionLog: MockThesisDecisionLogEntry[];
  reviewTriggers: string[];
};

export type CreateMockThesisInput = {
  ticker?: string;
  companyName?: string;
  theme?: string;
  mbsScore: number;
  notes?: string;
  riskScore?: number;
  createdAt: string;
};

export const MOCK_TODAY = '2026-05-25';

export const mockTheses: MockThesis[] = [
  {
    id: 'thesis-nvda',
    ticker: 'NVDA',
    companyName: 'NVIDIA',
    theme: 'AI Infrastructure',
    ideaStatus: 'Active',
    thesisStatus: 'Strong',
    mbsScore: 86,
    previousMbsScore: 82,
    conviction: 'High',
    riskLevel: 'Medium',
    thesisSummary:
      'AI accelerator demand and platform depth support premium returns.',
    bullCase:
      'Data center demand, CUDA ecosystem strength, and networking scale compound together.',
    bearCase:
      'Customer concentration and supply constraints could compress expectations.',
    keyRisks:
      'Export controls, hyperscaler capex cyclicality, and valuation sensitivity.',
    catalysts:
      'Earnings updates, Blackwell ramp, and data center capex commentary.',
    lastReviewedDate: '2026-05-20',
    nextReviewDate: '2026-06-12',
    decisionLog: [
      {
        id: 'decision-nvda-1',
        title: 'Score updated',
        note: 'Business quality and moat assumptions refreshed.',
        createdAt: '2026-05-20T09:00:00.000Z'
      }
    ],
    reviewTriggers: [
      'Blackwell supply update',
      'Data center growth commentary',
      'Gross margin change'
    ]
  },
  {
    id: 'thesis-msft',
    ticker: 'MSFT',
    companyName: 'Microsoft',
    theme: 'Cloud Platforms',
    ideaStatus: 'Active',
    thesisStatus: 'Stable',
    mbsScore: 83,
    previousMbsScore: 81,
    conviction: 'High',
    riskLevel: 'Low',
    thesisSummary:
      'Cloud scale, software durability, and AI distribution support quality growth.',
    bullCase:
      'Azure, Office, security, and AI copilots reinforce the enterprise platform.',
    bearCase:
      'Cloud growth normalization and AI infrastructure spend could pressure margins.',
    keyRisks:
      'Regulatory scrutiny, capex intensity, and enterprise budget cycles.',
    catalysts: 'Azure growth, Copilot adoption, and margin commentary.',
    lastReviewedDate: '2026-05-18',
    nextReviewDate: '2026-06-20',
    decisionLog: [
      {
        id: 'decision-msft-1',
        title: 'Moved to active',
        note: 'Cloud platform thesis moved to active.',
        createdAt: '2026-05-18T09:00:00.000Z'
      }
    ],
    reviewTriggers: [
      'Azure growth',
      'Copilot adoption',
      'AI infrastructure margin impact'
    ]
  },
  {
    id: 'thesis-crwd',
    ticker: 'CRWD',
    companyName: 'CrowdStrike',
    theme: 'Cybersecurity',
    ideaStatus: 'Watchlist',
    thesisStatus: 'Weakening',
    mbsScore: 65,
    previousMbsScore: 72,
    conviction: 'Medium',
    riskLevel: 'Medium',
    thesisSummary:
      'Endpoint leadership remains strong, but growth durability needs review.',
    bullCase:
      'Platform consolidation and security demand can support long-term expansion.',
    bearCase:
      'Competitive pressure or slower seat expansion could reduce the premium.',
    keyRisks: 'Valuation, incident risk, and enterprise spending pauses.',
    catalysts: 'Retention trends, module adoption, and next earnings call.',
    lastReviewedDate: '2026-05-15',
    nextReviewDate: '2026-05-31',
    decisionLog: [
      {
        id: 'decision-crwd-1',
        title: 'Moved to Watchlist',
        note: 'Retention and growth durability need another pass.',
        createdAt: '2026-05-15T09:00:00.000Z'
      }
    ],
    reviewTriggers: [
      'Net retention trend',
      'Module adoption',
      'Incident response commentary'
    ]
  },
  {
    id: 'thesis-tsla',
    ticker: 'TSLA',
    companyName: 'Tesla',
    theme: 'Energy Transition',
    ideaStatus: 'Caution',
    thesisStatus: 'Weakening',
    mbsScore: 58,
    previousMbsScore: 68,
    conviction: 'Low',
    riskLevel: 'High',
    thesisSummary:
      'Margin pressure and execution variance challenge the prior growth thesis.',
    bullCase:
      'Software, autonomy, energy storage, and scale could restore upside.',
    bearCase:
      'Auto margins and demand elasticity may keep returns under pressure.',
    keyRisks: 'Competition, pricing pressure, execution risk, and valuation.',
    catalysts: 'Delivery trends, gross margin, autonomy updates, and energy growth.',
    lastReviewedDate: '2026-05-10',
    nextReviewDate: '2026-06-05',
    decisionLog: [
      {
        id: 'decision-tsla-1',
        title: 'Flagged as Caution',
        note: 'Bear case expanded after margin pressure.',
        createdAt: '2026-05-10T09:00:00.000Z'
      }
    ],
    reviewTriggers: [
      'Gross margin trend',
      'Delivery growth',
      'Autonomy update'
    ]
  },
  {
    id: 'thesis-avgo',
    ticker: 'AVGO',
    companyName: 'Broadcom',
    theme: 'AI Infrastructure',
    ideaStatus: 'Active',
    thesisStatus: 'Improving',
    mbsScore: 80,
    previousMbsScore: 77,
    conviction: 'High',
    riskLevel: 'Medium',
    thesisSummary:
      'Custom silicon and infrastructure software provide durable cash generation.',
    bullCase:
      'AI networking, custom ASIC demand, and software integration expand cash flow.',
    bearCase:
      'Semiconductor cyclicality and integration risk could slow momentum.',
    keyRisks: 'Customer concentration, cyclicality, and acquisition execution.',
    catalysts: 'AI revenue updates, VMware integration, and capital return.',
    lastReviewedDate: '2026-05-16',
    nextReviewDate: '2026-06-18',
    decisionLog: [
      {
        id: 'decision-avgo-1',
        title: 'Thesis improving',
        note: 'AI networking demand lifted the score.',
        createdAt: '2026-05-16T09:00:00.000Z'
      }
    ],
    reviewTriggers: [
      'AI revenue mix',
      'VMware integration',
      'Free cash flow margin'
    ]
  },
  {
    id: 'thesis-sofi',
    ticker: 'SOFI',
    companyName: 'SoFi Technologies',
    theme: 'Digital Finance',
    ideaStatus: 'Needs Review',
    thesisStatus: 'Stable',
    mbsScore: 61,
    previousMbsScore: 64,
    conviction: 'Medium',
    riskLevel: 'High',
    thesisSummary:
      'Member growth is attractive, but credit and funding risks need review.',
    bullCase:
      'Product expansion and banking charter economics can improve profitability.',
    bearCase: 'Credit losses or funding costs could weaken the thesis.',
    keyRisks: 'Credit cycle, regulation, funding costs, and profitability execution.',
    catalysts: 'Deposit growth, credit metrics, and contribution profit trends.',
    lastReviewedDate: '2026-05-12',
    nextReviewDate: '2026-05-29',
    decisionLog: [
      {
        id: 'decision-sofi-1',
        title: 'Needs review',
        note: 'Marked needs review before the next credit update.',
        createdAt: '2026-05-12T09:00:00.000Z'
      }
    ],
    reviewTriggers: [
      'Credit metrics',
      'Deposit growth',
      'Funding cost movement'
    ]
  },
  {
    id: 'thesis-pltr',
    ticker: 'PLTR',
    companyName: 'Palantir',
    theme: 'AI Software',
    ideaStatus: 'Researching',
    thesisStatus: 'Improving',
    mbsScore: 74,
    previousMbsScore: 70,
    conviction: 'Medium',
    riskLevel: 'Medium',
    thesisSummary:
      'Commercial AI adoption supports growth, while valuation requires discipline.',
    bullCase: 'AIP adoption and government durability can compound revenue.',
    bearCase:
      'Valuation and customer concentration may limit forward returns.',
    keyRisks:
      'Valuation, sales cycle volatility, and public sector concentration.',
    catalysts: 'Commercial customer growth, AIP conversion, and margin expansion.',
    lastReviewedDate: '2026-05-17',
    nextReviewDate: '2026-06-10',
    decisionLog: [
      {
        id: 'decision-pltr-1',
        title: 'Researching AIP adoption',
        note: 'Added to research queue for AIP conversion follow-up.',
        createdAt: '2026-05-17T09:00:00.000Z'
      }
    ],
    reviewTriggers: [
      'AIP customer conversion',
      'Commercial revenue growth',
      'Government contract durability'
    ]
  },
  {
    id: 'thesis-amd',
    ticker: 'AMD',
    companyName: 'Advanced Micro Devices',
    theme: 'Semiconductors',
    ideaStatus: 'Needs Review',
    thesisStatus: 'Stable',
    mbsScore: 69,
    previousMbsScore: 73,
    conviction: 'Medium',
    riskLevel: 'Medium',
    thesisSummary:
      'AI accelerator opportunity is real, but competitive proof points matter.',
    bullCase:
      'Data center CPU strength and AI GPU traction can expand earnings power.',
    bearCase: 'NVIDIA competition and execution gaps could cap share gains.',
    keyRisks: 'Competitive intensity, gross margin, and AI roadmap execution.',
    catalysts: 'MI300 adoption, data center growth, and margin updates.',
    lastReviewedDate: '2026-05-14',
    nextReviewDate: '2026-06-03',
    decisionLog: [
      {
        id: 'decision-amd-1',
        title: 'Needs review',
        note: 'AI accelerator assumptions changed and need follow-up.',
        createdAt: '2026-05-14T09:00:00.000Z'
      }
    ],
    reviewTriggers: [
      'MI300 adoption',
      'Data center GPU revenue',
      'Gross margin update'
    ]
  }
];

export function cloneMockTheses(): MockThesis[] {
  return mockTheses.map(cloneMockThesis);
}

export function cloneMockThesis(thesis: MockThesis): MockThesis {
  return {
    ...thesis,
    decisionLog: thesis.decisionLog.map((entry) => ({ ...entry })),
    reviewTriggers: [...thesis.reviewTriggers]
  };
}

export function getScoreChange(thesis: MockThesis): number {
  return thesis.mbsScore - thesis.previousMbsScore;
}

export function formatScoreChange(thesis: MockThesis): string {
  const change = getScoreChange(thesis);

  if (change > 0) {
    return `+${change}`;
  }

  return String(change);
}

export function isReviewDueSoon(
  thesis: MockThesis,
  referenceDate = MOCK_TODAY,
  horizonDays = 14
): boolean {
  const reviewDate = Date.parse(`${thesis.nextReviewDate}T00:00:00.000Z`);
  const reference = Date.parse(`${referenceDate}T00:00:00.000Z`);
  const horizon = reference + horizonDays * 24 * 60 * 60 * 1000;

  return reviewDate <= horizon;
}

export function isNeedsReviewThesis(thesis: MockThesis): boolean {
  return thesis.ideaStatus === 'Needs Review' || isReviewDueSoon(thesis);
}

export function getWeakestThesis(theses: readonly MockThesis[]): MockThesis {
  return [...theses].sort(
    (first, second) => first.mbsScore - second.mbsScore
  )[0];
}

export function getLargestScoreDropThesis(
  theses: readonly MockThesis[]
): MockThesis {
  return [...theses].sort(
    (first, second) => getScoreChange(first) - getScoreChange(second)
  )[0];
}

export function getTopImprovingThesis(theses: readonly MockThesis[]): MockThesis {
  return [...theses].sort(
    (first, second) => getScoreChange(second) - getScoreChange(first)
  )[0];
}

export function getNextReviewThesis(theses: readonly MockThesis[]): MockThesis {
  return [...theses].sort((first, second) =>
    first.nextReviewDate.localeCompare(second.nextReviewDate)
  )[0];
}

export function getWatchlistTheses(
  theses: readonly MockThesis[] = mockTheses
): MockThesis[] {
  return theses.filter(
    (thesis) =>
      thesis.ideaStatus === 'Watchlist' || thesis.ideaStatus === 'Researching'
  );
}

export function saveMockMbsScoreToThesis(
  theses: MockThesis[],
  thesisId: string,
  nextScore: number,
  updatedAt: string
): MockThesis[] {
  return theses.map((thesis) => {
    if (thesis.id !== thesisId) {
      return thesis;
    }

    const previousScore = thesis.mbsScore;

    return {
      ...thesis,
      mbsScore: nextScore,
      previousMbsScore: previousScore,
      decisionLog: [
        ...thesis.decisionLog,
        {
          id: `decision-${thesis.id}-${thesis.decisionLog.length + 1}`,
          title: 'MBS score updated',
          note: `MBS score updated from ${previousScore} to ${nextScore}.`,
          createdAt: updatedAt
        }
      ]
    };
  });
}

export function createMockThesisFromMbsScore(
  theses: MockThesis[],
  input: CreateMockThesisInput
): MockThesis {
  const ticker = input.ticker?.trim().toUpperCase() || `NEW${theses.length + 1}`;
  const companyName = input.companyName?.trim() || 'New thesis';
  const theme = input.theme?.trim() || 'Uncategorized';
  const riskLevel = scoreToRiskLevel(input.riskScore);

  return {
    id: `thesis-${ticker.toLowerCase()}-${theses.length + 1}`,
    ticker,
    companyName,
    theme,
    ideaStatus: 'Researching',
    thesisStatus: 'Stable',
    mbsScore: input.mbsScore,
    previousMbsScore: input.mbsScore,
    conviction: 'Unrated',
    riskLevel,
    thesisSummary: input.notes?.trim() || 'Created from MBS Scorer.',
    bullCase: input.notes?.trim() || 'Add bull case notes.',
    bearCase: 'Add bear case notes.',
    keyRisks: 'Add key risks.',
    catalysts: 'Add catalysts.',
    lastReviewedDate: input.createdAt.slice(0, 10),
    nextReviewDate: '',
    decisionLog: [
      {
        id: `decision-${ticker.toLowerCase()}-created`,
        title: 'Created thesis',
        note: 'Thesis created from MBS Scorer.',
        createdAt: input.createdAt
      }
    ],
    reviewTriggers: ['Add review triggers.']
  };
}

function scoreToRiskLevel(score: number | undefined): MockThesisRiskLevel {
  if (typeof score !== 'number') {
    return 'Medium';
  }

  if (score <= 3) {
    return 'High';
  }

  if (score >= 8) {
    return 'Low';
  }

  return 'Medium';
}
