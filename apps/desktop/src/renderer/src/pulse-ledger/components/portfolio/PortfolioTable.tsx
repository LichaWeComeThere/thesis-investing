import { useMemo, useState } from 'react';
import type { HoldingRow } from '../../data/fakeData';
import { holdings } from '../../data/fakeData';
import { PageHeader } from '../layout/PageHeader';
import { DataTable } from '../table/DataTable';
import { TableToolbar } from '../table/TableToolbar';
import { SavedPositionCard } from './SavedPositionCard';

type Pill = 'all' | 'gainers' | 'risk';

export function PortfolioTable(): JSX.Element {
  const [query, setQuery] = useState('');
  const [pill, setPill] = useState<Pill>('all');
  const [portfolioFilter, setPortfolioFilter] = useState<string>('all');

  const portfolios = useMemo(() => {
    const s = new Set(holdings.map((h) => h.portfolio));
    return ['all', ...Array.from(s)];
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return holdings.filter((h) => {
      if (portfolioFilter !== 'all' && h.portfolio !== portfolioFilter) return false;
      if (pill === 'gainers' && h.dailyChangePct <= 0) return false;
      if (pill === 'risk' && h.riskLevel !== 'High') return false;
      if (!q) return true;
      return (
        h.ticker.toLowerCase().includes(q) ||
        h.company.toLowerCase().includes(q) ||
        h.aiSignal.toLowerCase().includes(q)
      );
    });
  }, [pill, portfolioFilter, query]);

  return (
    <section
      id="section-portfolio"
      className="pl-premium-card scroll-mt-28 rounded-[24px] border border-pl-border bg-pl-card p-5 sm:rounded-[28px] sm:p-8"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Holdings & reports"
          title={"Positions referenced in today's AI brief"}
        />
        <TableToolbar
          query={query}
          onQueryChange={setQuery}
          pill={pill}
          onPillChange={setPill}
          portfolioFilter={portfolioFilter}
          onPortfolioFilterChange={setPortfolioFilter}
          portfolioOptions={portfolios}
        />
      </div>

      <DataTable rows={rows} />

      <div className="mt-5 flex flex-col gap-3.5 md:hidden">
        {rows.map((h: HoldingRow) => (
          <SavedPositionCard key={`m-${h.ticker}`} holding={h} />
        ))}
      </div>
    </section>
  );
}

/** @deprecated Use `PortfolioTable`; kept for existing imports. */
export const HoldingsTable = PortfolioTable;
