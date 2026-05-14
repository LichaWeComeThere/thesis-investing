import { emailPreview } from '../../data/fakeData';
import { Card } from '../ui/Card';

export function EmailPreviewCard(): JSX.Element {
  return (
    <Card
      variant="premium"
      className="bg-gradient-to-br from-pl-email-from via-pl-email-via to-pl-email-to p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Email preview</p>
          <p className="mt-2 text-lg font-semibold text-pl-ink">{emailPreview.subject}</p>
        </div>
        <span className="pl-badge-chip rounded-full bg-pl-chip-email px-3 py-1.5 text-xs font-semibold text-pl-slate ring-1 ring-pl-chip-email-ring">
          {emailPreview.lastSent}
        </span>
      </div>
      <p className="mt-4 max-w-4xl text-sm leading-relaxed text-pl-slate">{emailPreview.snippet}</p>
    </Card>
  );
}
