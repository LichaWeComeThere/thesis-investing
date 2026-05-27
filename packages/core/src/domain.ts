export type EntityId = string;
export type IsoDateString = string;
export type CurrencyCode = string;
export type TickerSymbol = string;

export type StockIdentity = {
  id: EntityId;
  ticker: TickerSymbol;
  name: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  country?: string;
  currency?: CurrencyCode;
};

export type Portfolio = {
  id: EntityId;
  name: string;
  baseCurrency: CurrencyCode;
  description?: string;
  holdings: Holding[];
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
};

export type Holding = {
  id: EntityId;
  portfolioId?: EntityId;
  stockId?: EntityId;
  ticker: TickerSymbol;
  companyName?: string;
  shares: number;
  averageCost?: number;
  currency?: CurrencyCode;
  thesisNoteId?: EntityId;
  openedAt?: IsoDateString;
};

export type WatchlistItem = {
  id: EntityId;
  ticker: TickerSymbol;
  companyName?: string;
  thesisNoteId?: EntityId;
  tags?: string[];
  note?: string;
  createdAt?: IsoDateString;
};

export type ThesisStatus =
  | 'draft'
  | 'active'
  | 'watch'
  | 'challenged'
  | 'broken'
  | 'closed';

export type ThesisNote = {
  id: EntityId;
  title: string;
  body: string;
  status: ThesisStatus;
  ticker?: TickerSymbol;
  conviction?: 'low' | 'medium' | 'high';
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
  reviewDueAt?: IsoDateString;
};

export type ManualBusinessScoreCategory =
  | 'businessQuality'
  | 'moat'
  | 'management'
  | 'balanceSheet'
  | 'growth'
  | 'valuation'
  | 'risk';

export type ManualBusinessScoreInput = Partial<
  Record<ManualBusinessScoreCategory, number>
> & {
  notes?: string;
};

export type ManualBusinessScoreCategoryWeights = Record<
  ManualBusinessScoreCategory,
  number
>;

export type ManualBusinessScoreRating =
  | 'incomplete'
  | 'weak'
  | 'mixed'
  | 'strong'
  | 'exceptional';

export type ManualBusinessScoreValidationError = {
  category: ManualBusinessScoreCategory;
  message: string;
  value: unknown;
};

export type ManualBusinessScoreWarning = {
  code: 'missing-criteria' | 'invalid-criteria-excluded';
  message: string;
  categories: ManualBusinessScoreCategory[];
};

export type ManualBusinessScoreOutput = {
  score: number;
  maxScore: number;
  percentage: number;
  rating: ManualBusinessScoreRating;
  completedCriteria: number;
  missingCriteria: ManualBusinessScoreCategory[];
  warnings: ManualBusinessScoreWarning[];
  errors: ManualBusinessScoreValidationError[];
  input: ManualBusinessScoreInput;
};

export type ManualPortfolioRankerItemInput = {
  id: EntityId;
  ticker: TickerSymbol;
  companyName?: string;
  manualScore?: number;
  notes?: string;
};

export type ManualPortfolioRankerStatus =
  | 'ranked'
  | 'incomplete'
  | 'invalid';

export type ManualPortfolioRankedItem = ManualPortfolioRankerItemInput & {
  normalizedTicker: TickerSymbol;
  rank: number | null;
  status: ManualPortfolioRankerStatus;
  errors: string[];
};

export type PortfolioRankerItem = {
  id: EntityId;
  ticker: TickerSymbol;
  companyName?: string;
  manualScore?: number;
  notes?: string;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
};

export type ThemeBasketExample = {
  ticker?: TickerSymbol;
  companyName: string;
  note?: string;
};

export type ThemeBasket = {
  id: EntityId;
  name: string;
  description: string;
  educationalRationale: string;
  examples: ThemeBasketExample[];
  tags: string[];
  tickers: TickerSymbol[];
  isStatic: boolean;
  nonAdvisoryNote: string;
};

export type ReminderType = 'earnings' | 'thesis-review' | 'custom';

export type Reminder = {
  id: EntityId;
  title: string;
  dueDate: IsoDateString;
  type: ReminderType;
  ticker?: TickerSymbol;
  note?: string;
  completedAt?: IsoDateString;
  createdAt?: IsoDateString;
};

export type InvestmentIdeaWatchlistStatus =
  | 'none'
  | 'watchlisted'
  | 'archived';

export type InvestmentIdeaDecisionLogEntry = {
  id: EntityId;
  decision: string;
  note?: string;
  createdAt?: IsoDateString;
};

export type InvestmentIdea = {
  id: EntityId;
  ticker: TickerSymbol;
  companyName?: string;
  theme?: string;
  watchlistStatus: InvestmentIdeaWatchlistStatus;
  mbsScore?: ManualBusinessScoreInput;
  adjustedScore?: number;
  conviction?: 'low' | 'medium' | 'high';
  thesisStatus: ThesisStatus;
  bullCase?: string;
  bearCase?: string;
  risks?: string;
  catalysts?: string;
  reviewDate?: IsoDateString;
  notes?: string;
  decisionLog: InvestmentIdeaDecisionLogEntry[];
  reminder?: Reminder;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
};
