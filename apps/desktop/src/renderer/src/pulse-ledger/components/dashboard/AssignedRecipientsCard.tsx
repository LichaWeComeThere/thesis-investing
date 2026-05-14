import { assignedRecipients } from '../../data/fakeData';
import { Card } from '../ui/Card';

export function AssignedRecipientsCard(): JSX.Element {
  return (
    <Card variant="premium" className="p-6 sm:p-7 lg:col-span-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Assigned recipients</p>
      <p className="mt-2 text-lg font-semibold text-pl-ink">Distribution list</p>
      <ul className="mt-4 space-y-3">
        {assignedRecipients.map((r) => (
          <li
            key={r.email}
            className="flex items-center justify-between gap-3 rounded-2xl border border-transparent bg-pl-muted/35 px-4 py-3.5 shadow-sm transition-all duration-200 hover:border-pl-border-muted hover:bg-pl-muted/55"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-pl-ink">{r.name}</p>
              <p className="truncate text-xs text-pl-slate">{r.role}</p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-pl-chip-email px-2.5 py-1 text-[11px] font-medium text-pl-slate ring-1 ring-pl-chip-email-ring sm:inline">
              {r.email.split('@')[0]}…
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
