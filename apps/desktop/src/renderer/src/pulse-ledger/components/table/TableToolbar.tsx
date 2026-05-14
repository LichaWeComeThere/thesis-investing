import type { ReactNode } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { SelectInput } from '../ui/SelectInput';
import { TableFilterPills } from './TableFilterPills';

type Pill = 'all' | 'gainers' | 'risk';

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  pill: Pill;
  onPillChange: (p: Pill) => void;
  portfolioFilter: string;
  onPortfolioFilterChange: (v: string) => void;
  portfolioOptions: string[];
  searchPlaceholder?: string;
  trailing?: ReactNode;
};

export function TableToolbar({
  query,
  onQueryChange,
  pill,
  onPillChange,
  portfolioFilter,
  onPortfolioFilterChange,
  portfolioOptions,
  searchPlaceholder = 'Filter by ticker, company, or signal…',
  trailing
}: Props): JSX.Element {
  return (
    <div className="flex w-full flex-col gap-3 sm:max-w-md lg:max-w-lg">
      <SearchInput
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label="Filter table"
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <TableFilterPills pill={pill} onPillChange={onPillChange} />
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-pl-slate">
          <span className="hidden sm:inline">Portfolio</span>
          <SelectInput
            value={portfolioFilter}
            onChange={(e) => onPortfolioFilterChange(e.target.value)}
            aria-label="Filter by portfolio"
          >
            {portfolioOptions.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? 'All portfolios' : p}
              </option>
            ))}
          </SelectInput>
        </label>
        {trailing}
      </div>
    </div>
  );
}
