type Pill = 'all' | 'gainers' | 'risk';

type Props = {
  pill: Pill;
  onPillChange: (p: Pill) => void;
};

const items: { id: Pill; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'gainers', label: 'Gainers' },
  { id: 'risk', label: 'At risk' }
];

export function TableFilterPills({ pill, onPillChange }: Props): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {items.map(({ id, label }) => {
        const active = pill === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onPillChange(id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ease-out ${
              active
                ? 'bg-pl-pill-active-bg text-pl-pill-active-fg shadow-sm ring-1 ring-pl-teal/30'
                : 'bg-pl-pill-idle text-pl-slate ring-1 ring-transparent hover:bg-pl-pill-idle-hover hover:shadow-sm hover:ring-pl-border-muted'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
