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

export type ManualBusinessScoreInput = {
  businessQuality?: number;
  moat?: number;
  management?: number;
  balanceSheet?: number;
  growth?: number;
  valuation?: number;
  risk?: number;
  notes?: string;
};

export type ManualBusinessScoreRating = 'not-scored';

export type ManualBusinessScoreOutput = {
  score: number;
  maxScore: number;
  rating: ManualBusinessScoreRating;
  completedCriteria: number;
  input: ManualBusinessScoreInput;
};

export type ThemeBasket = {
  id: EntityId;
  name: string;
  description: string;
  tickers: TickerSymbol[];
  isStatic: boolean;
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
