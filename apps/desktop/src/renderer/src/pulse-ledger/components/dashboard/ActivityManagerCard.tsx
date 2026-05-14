import { activityItems } from '../../data/fakeData';
import { Card } from '../ui/Card';

export function ActivityManagerCard(): JSX.Element {
  return (
    <Card variant="premium" className="p-6 sm:p-7 lg:col-span-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Activity</p>
      <p className="mt-2 text-lg font-semibold text-pl-ink">Report manager</p>
      <ul className="mt-4 space-y-3">
        {activityItems.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-4 rounded-2xl border border-pl-border-muted/80 bg-pl-muted/25 px-4 py-3.5 shadow-sm ring-1 ring-transparent transition-all duration-200 hover:border-pl-border-strong hover:bg-pl-muted/45 hover:ring-pl-border-muted"
          >
            <div>
              <p className="text-sm font-medium text-pl-ink">{item.label}</p>
              <p className="mt-1 text-xs text-pl-mist">{item.tone === 'done' ? 'Completed' : 'In progress'}</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-pl-slate">{item.time}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
