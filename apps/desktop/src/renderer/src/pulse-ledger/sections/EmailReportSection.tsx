import { assignedRecipients, emailPreview, aiSummary } from '../data/fakeData';

export function EmailReportSection(): JSX.Element {
  return (
    <section
      id="section-delivery"
      className="scroll-mt-28 rounded-[26px] border border-pl-border bg-gradient-to-br from-pl-email-panel-from via-pl-email-panel-via to-pl-email-panel-to p-6 shadow-card ring-1 ring-pl-teal/10 sm:rounded-[28px] sm:p-9"
    >
      <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="max-w-3xl space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Email report</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-pl-ink sm:text-2xl">Delivery preview</h2>
          </div>
          <div className="pl-premium-card rounded-[24px] border border-pl-border bg-pl-card p-5 shadow-sm sm:rounded-[26px] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Subject</p>
            <p className="mt-2 text-base font-semibold text-pl-ink">{emailPreview.subject}</p>
            <p className="mt-4 text-sm leading-relaxed text-pl-slate">{aiSummary}</p>
          </div>
        </div>

        <div className="pl-premium-card w-full max-w-md space-y-4 rounded-[24px] border border-pl-border bg-pl-card p-5 shadow-sm sm:rounded-[26px] sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Assigned recipients</p>
            <ul className="mt-3 space-y-2">
              {assignedRecipients.map((r) => (
                <li
                  key={r.email}
                  className="flex flex-col rounded-2xl border border-transparent bg-pl-muted/30 px-3 py-2.5 transition-all duration-200 hover:border-pl-border-muted hover:bg-pl-muted/50"
                >
                  <span className="text-sm font-semibold text-pl-ink">{r.name}</span>
                  <span className="text-xs text-pl-slate">{r.email}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-dashed border-pl-border-strong bg-pl-table-well px-4 py-3 text-sm text-pl-slate">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">Delivery schedule</p>
            <p className="mt-2 font-medium text-pl-ink">{emailPreview.schedule}</p>
            <p className="mt-1 text-xs text-pl-mist">{emailPreview.lastSent}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-pl-border-strong bg-pl-card px-4 py-2.5 text-sm font-semibold text-pl-ink shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-pl-teal/35 hover:shadow-card active:translate-y-0"
            >
              Preview Email
            </button>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-pl-teal px-4 py-2.5 text-sm font-semibold text-pl-ink shadow-cta-email transition-all duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-cta-hero active:translate-y-0"
            >
              Send Test Report
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
