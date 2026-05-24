import type {
  EntityId,
  InvestmentIdea,
  InvestmentIdeaDecisionLogEntry,
  IsoDateString,
  ManualBusinessScoreInput,
  ManualPortfolioRankerItemInput,
  ThesisNote
} from './domain';
import { createId } from './ids';
import { isValidIsoDate, isValidTickerSymbol, normalizeTickerSymbol } from './validation';

export type InvestmentIdeaRequiredField =
  | 'id'
  | 'ticker'
  | 'watchlistStatus'
  | 'thesisStatus'
  | 'decisionLog';

export type InvestmentIdeaMissingFieldResult = {
  valid: boolean;
  missingFields: InvestmentIdeaRequiredField[];
  errors: string[];
};

export type InvestmentIdeaDecisionLogInput = {
  id?: EntityId;
  decision: string;
  note?: string;
  createdAt?: IsoDateString;
};

export function createBlankInvestmentIdea(
  seed: string | number | readonly (string | number)[] = 'draft',
  overrides: Partial<InvestmentIdea> = {}
): InvestmentIdea {
  return {
    id: createId('idea', seed),
    ticker: '',
    watchlistStatus: 'none',
    thesisStatus: 'draft',
    decisionLog: [],
    ...overrides
  };
}

export function mapMbsScoreToInvestmentIdea(
  mbsScore: ManualBusinessScoreInput,
  idea: InvestmentIdea = createBlankInvestmentIdea('mbs-score')
): InvestmentIdea {
  return {
    ...idea,
    mbsScore: { ...mbsScore },
    notes: mbsScore.notes ?? idea.notes
  };
}

export function mapPortfolioRankerItemToInvestmentIdea(
  item: ManualPortfolioRankerItemInput,
  idea: InvestmentIdea = createBlankInvestmentIdea([
    'portfolio-ranker',
    item.id
  ])
): InvestmentIdea {
  return {
    ...idea,
    adjustedScore: item.manualScore ?? idea.adjustedScore,
    companyName: item.companyName ?? idea.companyName,
    notes: item.notes ?? idea.notes,
    ticker: normalizeTickerSymbol(item.ticker)
  };
}

export function mapThesisNoteToInvestmentIdea(
  note: ThesisNote,
  idea: InvestmentIdea = createBlankInvestmentIdea(['thesis', note.id])
): InvestmentIdea {
  return {
    ...idea,
    bullCase: note.body,
    conviction: note.conviction ?? idea.conviction,
    notes: note.title,
    reviewDate: note.reviewDueAt ?? idea.reviewDate,
    thesisStatus: note.status,
    ticker: note.ticker ? normalizeTickerSymbol(note.ticker) : idea.ticker,
    updatedAt: note.updatedAt ?? idea.updatedAt
  };
}

export function validateInvestmentIdeaMissingFields(
  idea: InvestmentIdea
): InvestmentIdeaMissingFieldResult {
  const missingFields: InvestmentIdeaRequiredField[] = [];
  const errors: string[] = [];

  if (!idea.id.trim()) {
    missingFields.push('id');
    errors.push('Investment idea id is required.');
  }

  if (!idea.ticker.trim()) {
    missingFields.push('ticker');
    errors.push('Investment idea ticker is required.');
  } else if (!isValidTickerSymbol(idea.ticker)) {
    errors.push('Investment idea ticker must be a valid ticker symbol.');
  }

  if (!idea.watchlistStatus) {
    missingFields.push('watchlistStatus');
    errors.push('Investment idea watchlist status is required.');
  }

  if (!idea.thesisStatus) {
    missingFields.push('thesisStatus');
    errors.push('Investment idea thesis status is required.');
  }

  if (!Array.isArray(idea.decisionLog)) {
    missingFields.push('decisionLog');
    errors.push('Investment idea decision log is required.');
  }

  if (idea.reviewDate !== undefined && !isValidIsoDate(idea.reviewDate)) {
    errors.push('Investment idea review date must use YYYY-MM-DD format.');
  }

  if (idea.createdAt !== undefined && !isValidIsoDate(idea.createdAt)) {
    errors.push('Investment idea created date must use YYYY-MM-DD format.');
  }

  if (idea.updatedAt !== undefined && !isValidIsoDate(idea.updatedAt)) {
    errors.push('Investment idea updated date must use YYYY-MM-DD format.');
  }

  return {
    valid: errors.length === 0,
    missingFields,
    errors
  };
}

export function updateInvestmentIdeaDecisionLog(
  idea: InvestmentIdea,
  entry: InvestmentIdeaDecisionLogInput
): InvestmentIdea {
  const normalizedEntry: InvestmentIdeaDecisionLogEntry = {
    id:
      entry.id ??
      createId('decision', [
        idea.id,
        idea.decisionLog.length + 1,
        entry.decision,
        entry.createdAt ?? ''
      ]),
    decision: entry.decision.trim(),
    ...(entry.note?.trim() ? { note: entry.note.trim() } : {}),
    ...(entry.createdAt ? { createdAt: entry.createdAt } : {})
  };

  return {
    ...idea,
    decisionLog: [...idea.decisionLog, normalizedEntry],
    updatedAt: entry.createdAt ?? idea.updatedAt
  };
}
