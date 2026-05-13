import type {
  ManualPortfolioRankedItem,
  ManualPortfolioRankerItemInput
} from './domain';
import { isValidTickerSymbol, normalizeTickerSymbol } from './validation';

export const PORTFOLIO_RANKER_MIN_SCORE = 0;
export const PORTFOLIO_RANKER_MAX_SCORE = 100;

type SortableRankedItem = ManualPortfolioRankedItem & {
  originalIndex: number;
};

export function rankManualPortfolioItems(
  items: ManualPortfolioRankerItemInput[]
): ManualPortfolioRankedItem[] {
  const preparedItems = items.map(toSortableRankedItem);
  const rankedItems = preparedItems
    .filter((item) => item.status === 'ranked')
    .sort((firstItem, secondItem) => {
      const scoreDifference =
        (secondItem.manualScore ?? 0) - (firstItem.manualScore ?? 0);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return firstItem.originalIndex - secondItem.originalIndex;
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));

  const incompleteOrInvalidItems = preparedItems.filter(
    (item) => item.status !== 'ranked'
  );

  return [...rankedItems, ...incompleteOrInvalidItems].map(toRankedItem);
}

function toSortableRankedItem(
  item: ManualPortfolioRankerItemInput,
  originalIndex: number
): SortableRankedItem {
  const normalizedTicker = normalizeTickerSymbol(item.ticker);
  const errors: string[] = [];

  if (!isValidTickerSymbol(normalizedTicker)) {
    errors.push('Ticker must be a valid ticker symbol.');
  }

  if (item.manualScore === undefined) {
    return {
      ...item,
      normalizedTicker,
      rank: null,
      status: errors.length > 0 ? 'invalid' : 'incomplete',
      errors,
      originalIndex
    };
  }

  if (!isValidManualScore(item.manualScore)) {
    errors.push('Manual score must be a finite number from 0 to 100.');
  }

  return {
    ...item,
    normalizedTicker,
    rank: null,
    status: errors.length > 0 ? 'invalid' : 'ranked',
    errors,
    originalIndex
  };
}

function isValidManualScore(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= PORTFOLIO_RANKER_MIN_SCORE &&
    value <= PORTFOLIO_RANKER_MAX_SCORE
  );
}

function toRankedItem(item: SortableRankedItem): ManualPortfolioRankedItem {
  return {
    companyName: item.companyName,
    errors: item.errors,
    id: item.id,
    manualScore: item.manualScore,
    normalizedTicker: item.normalizedTicker,
    notes: item.notes,
    rank: item.rank,
    status: item.status,
    ticker: item.ticker
  };
}
