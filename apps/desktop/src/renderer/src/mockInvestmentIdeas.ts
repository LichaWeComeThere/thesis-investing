export type MockInvestmentIdeaStatus =
  | 'Active'
  | 'Watch'
  | 'Needs Review'
  | 'Caution'
  | 'Draft'
  | 'Archived';

export type MockInvestmentIdeaConviction =
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Unrated';

export type MockDecisionLogEntry = {
  id: string;
  message: string;
  createdAt: string;
};

export type MockInvestmentIdea = {
  id: string;
  ticker: string;
  companyName: string;
  theme: string;
  status: MockInvestmentIdeaStatus;
  mbsScore: number;
  previousMbsScore: number | null;
  conviction: MockInvestmentIdeaConviction;
  risk: string;
  thesisSummary: string;
  bullCase: string;
  bearCase: string;
  keyRisks: string;
  catalysts: string;
  nextReviewDate: string;
  decisionLog: MockDecisionLogEntry[];
  createdAt: string;
  updatedAt: string;
};

export type CreateMockInvestmentIdeaInput = {
  ticker?: string;
  companyName?: string;
  theme?: string;
  mbsScore: number;
  notes?: string;
  riskScore?: number;
  createdAt: string;
};

export const mockInvestmentIdeas: MockInvestmentIdea[] = [
  {
    id: 'idea-nvda',
    ticker: 'NVDA',
    companyName: 'NVIDIA',
    theme: 'AI Infrastructure',
    status: 'Active',
    mbsScore: 86,
    previousMbsScore: 82,
    conviction: 'High',
    risk: 'Medium',
    thesisSummary: 'AI accelerator demand and platform depth support premium returns.',
    bullCase: 'Data center demand, CUDA ecosystem strength, and networking scale compound together.',
    bearCase: 'Customer concentration and supply constraints could compress expectations.',
    keyRisks: 'Export controls, hyperscaler capex cyclicality, and valuation sensitivity.',
    catalysts: 'Earnings updates, Blackwell ramp, and data center capex commentary.',
    nextReviewDate: '2026-06-12',
    decisionLog: [
      {
        id: 'decision-nvda-1',
        message: 'Initial AI infrastructure thesis reviewed.',
        createdAt: '2026-05-01T09:00:00.000Z'
      }
    ],
    createdAt: '2026-04-15T09:00:00.000Z',
    updatedAt: '2026-05-20T09:00:00.000Z'
  },
  {
    id: 'idea-msft',
    ticker: 'MSFT',
    companyName: 'Microsoft',
    theme: 'Cloud Platforms',
    status: 'Active',
    mbsScore: 83,
    previousMbsScore: 81,
    conviction: 'High',
    risk: 'Low',
    thesisSummary: 'Cloud scale, software durability, and AI distribution support quality growth.',
    bullCase: 'Azure, Office, security, and AI copilots reinforce the enterprise platform.',
    bearCase: 'Cloud growth normalization and AI infrastructure spend could pressure margins.',
    keyRisks: 'Regulatory scrutiny, capex intensity, and enterprise budget cycles.',
    catalysts: 'Azure growth, Copilot adoption, and margin commentary.',
    nextReviewDate: '2026-06-20',
    decisionLog: [
      {
        id: 'decision-msft-1',
        message: 'Cloud platform thesis moved to active.',
        createdAt: '2026-04-20T09:00:00.000Z'
      }
    ],
    createdAt: '2026-04-18T09:00:00.000Z',
    updatedAt: '2026-05-18T09:00:00.000Z'
  },
  {
    id: 'idea-crwd',
    ticker: 'CRWD',
    companyName: 'CrowdStrike',
    theme: 'Cybersecurity',
    status: 'Watch',
    mbsScore: 65,
    previousMbsScore: 72,
    conviction: 'Medium',
    risk: 'Medium',
    thesisSummary: 'Endpoint leadership remains strong, but growth durability needs review.',
    bullCase: 'Platform consolidation and security demand can support long-term expansion.',
    bearCase: 'Competitive pressure or slower seat expansion could reduce the premium.',
    keyRisks: 'Valuation, incident risk, and enterprise spending pauses.',
    catalysts: 'Retention trends, module adoption, and next earnings call.',
    nextReviewDate: '2026-05-31',
    decisionLog: [
      {
        id: 'decision-crwd-1',
        message: 'Moved to watch after growth assumptions softened.',
        createdAt: '2026-05-15T09:00:00.000Z'
      }
    ],
    createdAt: '2026-04-22T09:00:00.000Z',
    updatedAt: '2026-05-15T09:00:00.000Z'
  },
  {
    id: 'idea-tsla',
    ticker: 'TSLA',
    companyName: 'Tesla',
    theme: 'Energy Transition',
    status: 'Caution',
    mbsScore: 58,
    previousMbsScore: 68,
    conviction: 'Low',
    risk: 'High',
    thesisSummary: 'Margin pressure and execution variance challenge the prior growth thesis.',
    bullCase: 'Software, autonomy, energy storage, and scale could restore upside.',
    bearCase: 'Auto margins and demand elasticity may keep returns under pressure.',
    keyRisks: 'Competition, pricing pressure, execution risk, and valuation.',
    catalysts: 'Delivery trends, gross margin, autonomy updates, and energy growth.',
    nextReviewDate: '2026-06-05',
    decisionLog: [
      {
        id: 'decision-tsla-1',
        message: 'Flagged as caution after margin pressure.',
        createdAt: '2026-05-10T09:00:00.000Z'
      }
    ],
    createdAt: '2026-04-24T09:00:00.000Z',
    updatedAt: '2026-05-10T09:00:00.000Z'
  },
  {
    id: 'idea-avgo',
    ticker: 'AVGO',
    companyName: 'Broadcom',
    theme: 'AI Infrastructure',
    status: 'Active',
    mbsScore: 80,
    previousMbsScore: 77,
    conviction: 'High',
    risk: 'Medium',
    thesisSummary: 'Custom silicon and infrastructure software provide durable cash generation.',
    bullCase: 'AI networking, custom ASIC demand, and software integration expand cash flow.',
    bearCase: 'Semiconductor cyclicality and integration risk could slow momentum.',
    keyRisks: 'Customer concentration, cyclicality, and acquisition execution.',
    catalysts: 'AI revenue updates, VMware integration, and capital return.',
    nextReviewDate: '2026-06-18',
    decisionLog: [
      {
        id: 'decision-avgo-1',
        message: 'AI infrastructure thesis added to active queue.',
        createdAt: '2026-05-02T09:00:00.000Z'
      }
    ],
    createdAt: '2026-04-28T09:00:00.000Z',
    updatedAt: '2026-05-16T09:00:00.000Z'
  },
  {
    id: 'idea-sofi',
    ticker: 'SOFI',
    companyName: 'SoFi Technologies',
    theme: 'Digital Finance',
    status: 'Needs Review',
    mbsScore: 61,
    previousMbsScore: 64,
    conviction: 'Medium',
    risk: 'High',
    thesisSummary: 'Member growth is attractive, but credit and funding risks need review.',
    bullCase: 'Product expansion and banking charter economics can improve profitability.',
    bearCase: 'Credit losses or funding costs could weaken the thesis.',
    keyRisks: 'Credit cycle, regulation, funding costs, and profitability execution.',
    catalysts: 'Deposit growth, credit metrics, and contribution profit trends.',
    nextReviewDate: '2026-05-29',
    decisionLog: [
      {
        id: 'decision-sofi-1',
        message: 'Marked needs review before next credit update.',
        createdAt: '2026-05-12T09:00:00.000Z'
      }
    ],
    createdAt: '2026-04-30T09:00:00.000Z',
    updatedAt: '2026-05-12T09:00:00.000Z'
  },
  {
    id: 'idea-pltr',
    ticker: 'PLTR',
    companyName: 'Palantir',
    theme: 'AI Software',
    status: 'Watch',
    mbsScore: 74,
    previousMbsScore: 70,
    conviction: 'Medium',
    risk: 'Medium',
    thesisSummary: 'Commercial AI adoption supports growth, while valuation requires discipline.',
    bullCase: 'AIP adoption and government durability can compound revenue.',
    bearCase: 'Valuation and customer concentration may limit forward returns.',
    keyRisks: 'Valuation, sales cycle volatility, and public sector concentration.',
    catalysts: 'Commercial customer growth, AIP conversion, and margin expansion.',
    nextReviewDate: '2026-06-10',
    decisionLog: [
      {
        id: 'decision-pltr-1',
        message: 'Added to watch for AIP adoption follow-up.',
        createdAt: '2026-05-05T09:00:00.000Z'
      }
    ],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-17T09:00:00.000Z'
  },
  {
    id: 'idea-amd',
    ticker: 'AMD',
    companyName: 'Advanced Micro Devices',
    theme: 'Semiconductors',
    status: 'Needs Review',
    mbsScore: 69,
    previousMbsScore: 73,
    conviction: 'Medium',
    risk: 'Medium',
    thesisSummary: 'AI accelerator opportunity is real, but competitive proof points matter.',
    bullCase: 'Data center CPU strength and AI GPU traction can expand earnings power.',
    bearCase: 'NVIDIA competition and execution gaps could cap share gains.',
    keyRisks: 'Competitive intensity, gross margin, and AI roadmap execution.',
    catalysts: 'MI300 adoption, data center growth, and margin updates.',
    nextReviewDate: '2026-06-03',
    decisionLog: [
      {
        id: 'decision-amd-1',
        message: 'Needs review after AI accelerator assumptions changed.',
        createdAt: '2026-05-14T09:00:00.000Z'
      }
    ],
    createdAt: '2026-05-03T09:00:00.000Z',
    updatedAt: '2026-05-14T09:00:00.000Z'
  }
];

export function cloneMockInvestmentIdeas(): MockInvestmentIdea[] {
  return mockInvestmentIdeas.map((idea) => ({
    ...idea,
    decisionLog: idea.decisionLog.map((entry) => ({ ...entry }))
  }));
}

export function saveMockMbsScoreToInvestmentIdea(
  ideas: MockInvestmentIdea[],
  ideaId: string,
  nextScore: number,
  updatedAt: string
): MockInvestmentIdea[] {
  return ideas.map((idea) => {
    if (idea.id !== ideaId) {
      return idea;
    }

    const previousScore = idea.mbsScore;

    return {
      ...idea,
      mbsScore: nextScore,
      previousMbsScore: previousScore,
      updatedAt,
      decisionLog: [
        ...idea.decisionLog,
        {
          id: `decision-${idea.id}-${idea.decisionLog.length + 1}`,
          message: `MBS score updated from ${formatScore(previousScore)} to ${formatScore(nextScore)}.`,
          createdAt: updatedAt
        }
      ]
    };
  });
}

export function createMockInvestmentIdeaFromMbsScore(
  ideas: MockInvestmentIdea[],
  input: CreateMockInvestmentIdeaInput
): MockInvestmentIdea {
  const ticker = input.ticker?.trim().toUpperCase() || `NEW${ideas.length + 1}`;
  const companyName = input.companyName?.trim() || 'New thesis';
  const theme = input.theme?.trim() || 'Uncategorized';
  const risk =
    typeof input.riskScore === 'number'
      ? `Risk score ${formatScore(input.riskScore)} / 10`
      : 'Not assessed';

  return {
    id: `idea-${ticker.toLowerCase()}-${ideas.length + 1}`,
    ticker,
    companyName,
    theme,
    status: 'Draft',
    mbsScore: input.mbsScore,
    previousMbsScore: null,
    conviction: 'Unrated',
    risk,
    thesisSummary: input.notes?.trim() || 'Created from MBS Scorer.',
    bullCase: input.notes?.trim() || 'Add bull case notes.',
    bearCase: 'Add bear case notes.',
    keyRisks: risk,
    catalysts: 'Add catalysts.',
    nextReviewDate: '',
    decisionLog: [
      {
        id: `decision-${ticker.toLowerCase()}-created`,
        message: 'Thesis created from MBS Scorer.',
        createdAt: input.createdAt
      }
    ],
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  };
}

function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}
