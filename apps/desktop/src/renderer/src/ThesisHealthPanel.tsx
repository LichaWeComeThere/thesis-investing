import { evaluateLivingThesisHealth, type LivingThesisHealth, type LivingThesisHistory } from '@thesis-investing/core';
import { Badge, Button, Card } from '@thesis-investing/ui';
import { useEffect, useMemo, useState } from 'react';

type HealthClock = { referenceTime: string; today: string } | null;
const currentDate = () => new Date();

/** Research condition and review timing share saved data, but remain separate assessments. */
export function ThesisHealthPanel({ history, entityName, loading = false, unavailable = false, clock = currentDate, onRetry }: {
  history: LivingThesisHistory | null;
  entityName: string;
  loading?: boolean;
  unavailable?: boolean;
  clock?: () => Date;
  onRetry?: () => void;
}): JSX.Element {
  const [clockTick, setClockTick] = useState(0);
  // A newly loaded snapshot must be assessed against a fresh clock immediately.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Snapshot changes and clock ticks intentionally refresh the reference time.
  const reference = useMemo(() => readClock(clock), [clock, history, clockTick]);

  useEffect(() => {
    const refresh = () => setClockTick((value) => value + 1);
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [clock]);

  const assessment = useMemo(() => {
    if (loading || unavailable || !history || !reference) return null;
    try {
      const result = evaluateLivingThesisHealth({ history, ...reference });
      return result.ok ? result.value : null;
    } catch { return null; }
  }, [history, loading, unavailable, reference]);

  return <Card className="living-thesis-health-card" aria-label={`Thesis health for ${entityName}`} title="Thesis Health">
    <p className="living-thesis-health-intro">Based on saved research. Unsaved edits are not included.</p>
    {loading ? <p role="status">Checking saved thesis health…</p> : !assessment ? <div><p role="status">Thesis health is unavailable. {reference ? 'The saved research could not be assessed.' : 'The current date could not be read.'}</p><Button type="button" size="sm" variant="secondary" onClick={() => { setClockTick((value) => value + 1); onRetry?.(); }}>Check again</Button></div> : <>
      <div className="living-thesis-health-sections">
        <section aria-label="Saved research" className="living-thesis-health-section">
          <h3>Saved research</h3>
          <Badge variant={assessment.research.status === 'needs_attention' ? 'warning' : 'neutral'}>{researchLabel(assessment.research.status)}</Badge>
          <ul className="living-thesis-health-reasons">{assessment.research.reasons.map((reason) => <li key={reason.code}>{reason.message}</li>)}</ul>
        </section>
        <section aria-label="Review timing" className="living-thesis-health-section">
          <h3>Review timing</h3>
          <Badge variant={['overdue', 'due_today'].includes(assessment.reviewTiming.status) ? 'warning' : 'neutral'}>{timingLabel(assessment.reviewTiming.status)}</Badge>
          <p>{timingDescription(assessment.reviewTiming)}</p>
          {assessment.reviewTiming.dueDate ? <p className="living-thesis-health-date">Saved review date: <time dateTime={assessment.reviewTiming.dueDate}>{formatDay(assessment.reviewTiming.dueDate)}</time></p> : null}
          <p className="living-thesis-health-date">{assessment.reviewTiming.lastCompletedAt ? <>Last completed review: <time dateTime={assessment.reviewTiming.lastCompletedAt}>{new Date(assessment.reviewTiming.lastCompletedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time></> : 'No completed review yet.'}</p>
        </section>
      </div>
      <details className="living-thesis-health-explanation">
        <summary>How this is assessed</summary>
        <p>Research checks use the saved risk level, open risks and changes between recorded review scores. They do not verify the evidence behind your research.</p>
        <p>Review timing uses your saved next review date and this device’s local date. An overdue review changes the timing status only.</p>
        {assessment.research.limitations.length > 0 ? <ul>{assessment.research.limitations.map((limitation) => <li key={limitation.code}>{limitation.message}</li>)}</ul> : null}
        <p className="living-thesis-health-date">Checked <time dateTime={assessment.assessedAt}>{new Date(assessment.assessedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time></p>
        <p className="living-thesis-health-date">Assessment rules, version {assessment.algorithmVersion}</p>
      </details>
    </>}
  </Card>;
}

function readClock(clock: () => Date): HealthClock {
  try {
    const date = clock();
    return { referenceTime: date.toISOString(), today: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` };
  } catch { return null; }
}

function researchLabel(status: LivingThesisHealth['research']['status']): string {
  return { needs_attention: 'Needs attention', no_flagged_concerns: 'No flagged concerns', insufficient_information: 'Not enough information' }[status];
}

function timingLabel(status: LivingThesisHealth['reviewTiming']['status']): string {
  return { overdue: 'Review overdue', due_today: 'Review due today', due_soon: 'Review due soon', scheduled: 'Review scheduled', not_scheduled: 'No review date', paused: 'Reviews paused', archived: 'Thesis archived' }[status];
}

function timingDescription(timing: LivingThesisHealth['reviewTiming']): string {
  const days = Math.abs(timing.daysUntilDue ?? 0);
  if (timing.status === 'overdue') return `Overdue by ${days} ${days === 1 ? 'day' : 'days'}.`;
  if (timing.status === 'due_today') return 'Your next review is due today.';
  if (timing.status === 'due_soon' || timing.status === 'scheduled') return `Due in ${days} ${days === 1 ? 'day' : 'days'}.`;
  if (timing.status === 'paused') return 'This thesis is paused. Review timing alerts are paused too.';
  if (timing.status === 'archived') return 'Review timing alerts are off for archived theses.';
  return 'Set a next review date in thesis details when you are ready.';
}

function formatDay(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
