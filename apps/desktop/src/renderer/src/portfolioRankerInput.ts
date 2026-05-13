import type { ManualPortfolioRankerItemInput } from '@thesis-investing/core';

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
