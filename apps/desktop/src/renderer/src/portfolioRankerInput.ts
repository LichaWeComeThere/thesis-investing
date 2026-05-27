import type {
  ManualPortfolioRankerItemInput,
  PortfolioRankerItem
} from '@thesis-investing/core';

export type PortfolioRankerRowState = {
  id: string;
  ticker: string;
  companyName: string;
  manualScore: string;
  notes: string;
};

export function createEmptyPortfolioRankerRow(
  id: string
): PortfolioRankerRowState {
  return {
    id,
    ticker: '',
    companyName: '',
    manualScore: '',
    notes: ''
  };
}

export function buildPortfolioRankerInput(
  rows: PortfolioRankerRowState[]
): ManualPortfolioRankerItemInput[] {
  return rows
    .filter((row) =>
      [row.ticker, row.companyName, row.manualScore, row.notes].some((value) =>
        value.trim()
      )
    )
    .map((row) => {
      const item: ManualPortfolioRankerItemInput = {
        id: row.id,
        ticker: row.ticker
      };

      if (row.companyName.trim()) {
        item.companyName = row.companyName.trim();
      }

      if (row.manualScore.trim()) {
        item.manualScore = Number(row.manualScore);
      }

      if (row.notes.trim()) {
        item.notes = row.notes.trim();
      }

      return item;
    });
}

export function portfolioRankerItemToRow(
  item: PortfolioRankerItem
): PortfolioRankerRowState {
  return {
    id: item.id,
    ticker: item.ticker,
    companyName: item.companyName ?? '',
    manualScore:
      item.manualScore === undefined ? '' : String(item.manualScore),
    notes: item.notes ?? ''
  };
}

export function buildPersistedPortfolioRankerItem(
  row: PortfolioRankerRowState
): PortfolioRankerItem {
  const item: PortfolioRankerItem = {
    id: row.id,
    ticker: row.ticker.trim()
  };

  const companyName = row.companyName.trim();
  if (companyName) {
    item.companyName = companyName;
  }

  const trimmedScore = row.manualScore.trim();
  if (trimmedScore) {
    const parsed = Number(trimmedScore);
    if (Number.isFinite(parsed)) {
      item.manualScore = parsed;
    }
  }

  const notes = row.notes.trim();
  if (notes) {
    item.notes = notes;
  }

  return item;
}

export function isPortfolioRankerRowSaveable(
  row: PortfolioRankerRowState
): boolean {
  return row.ticker.trim().length > 0;
}

export function getNextPortfolioRankerRowNumber(
  rows: PortfolioRankerRowState[],
  startAt = 1
): number {
  const usedNumbers = new Set<number>();
  for (const row of rows) {
    const match = /^idea-(\d+)$/.exec(row.id);
    if (match) {
      usedNumbers.add(Number(match[1]));
    }
  }
  let candidate = startAt;
  while (usedNumbers.has(candidate)) {
    candidate += 1;
  }
  return candidate;
}
