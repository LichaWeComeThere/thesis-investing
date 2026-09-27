import type { LivingThesisReviewQueue } from '@thesis-investing/core';
import { Button } from '@thesis-investing/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReviewQueueStorageApi } from '../../shared/reviewQueueStorage';
import { getDefaultReviewQueueStorageClient } from './reviewQueueStorageClient';
import './reviewQueue.css';

type QueueItem = LivingThesisReviewQueue['items'][number];
export type ReviewQueueTarget = { thesisId: string; reviewSessionId?: string };

type ReviewQueuePanelProps = {
  onOpenThesis?: (target: ReviewQueueTarget) => void;
  storageClient?: ReviewQueueStorageApi | null;
  clock?: () => Date;
};

const currentDate = () => new Date();
const groups: { id: QueueItem['group']; label: string }[] = [
  { id: 'in_progress', label: 'Continue a review' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due_soon', label: 'Due soon' },
  { id: 'research_concerns', label: 'Research concerns' }
];

export function ReviewQueuePanel({ onOpenThesis, storageClient, clock = currentDate }: ReviewQueuePanelProps): JSX.Element {
  const client = storageClient === undefined ? getDefaultReviewQueueStorageClient() : storageClient;
  const [queue, setQueue] = useState<LivingThesisReviewQueue | null>(null);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(Boolean(client));
  const mounted = useRef(false);
  const requestId = useRef(0);
  const requestedDay = useRef<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!client || !mounted.current) return;
    const request = ++requestId.current;
    setLoading(true);
    try {
      const today = localDay(clock());
      requestedDay.current = today;
      const result = await client.get(today);
      if (!mounted.current || request !== requestId.current) return;
      if (result.ok) {
        setQueue(result.value);
        setErrors([]);
      } else {
        setErrors(result.errors.length ? result.errors : ['Please try again.']);
      }
    } catch (error: unknown) {
      if (mounted.current && request === requestId.current) {
        setErrors([error instanceof Error ? error.message : 'Please try again.']);
      }
    } finally {
      if (mounted.current && request === requestId.current) setLoading(false);
    }
  }, [client, clock]);

  useEffect(() => {
    mounted.current = true;
    if (!client) {
      setLoading(false);
      return () => { mounted.current = false; requestId.current += 1; };
    }
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(() => {
      try {
        if (localDay(clock()) !== requestedDay.current) void refresh();
      } catch { void refresh(); }
    }, 60_000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mounted.current = false;
      requestId.current += 1;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client, clock, refresh]);

  const stale = errors.length > 0;

  return <section className="review-queue" aria-labelledby="review-queue-heading" aria-busy={loading}>
    <div className="review-queue-header">
      <div>
        <h2 id="review-queue-heading">Needs review</h2>
        <p>Continue a draft or revisit your saved research.</p>
      </div>
      {client ? <Button size="sm" variant="secondary" type="button" disabled={loading} onClick={() => { void refresh(); }}>Refresh</Button> : null}
    </div>

    {!client ? <p className="review-queue-state">Your review queue is unavailable in this preview. Open Theses to explore the workspace.</p> : <>
      {loading ? <p className="review-queue-loading" role="status">{queue ? 'Refreshing review queue…' : 'Loading your review queue…'}</p> : null}
      {stale ? <div className="review-queue-error" role="alert">
        <strong>{queue ? 'We couldn’t refresh your review queue.' : 'We couldn’t load your review queue.'}</strong>
        <ul>{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
        {queue ? <p>The entries below may be out of date. Refresh the queue before opening them.</p> : null}
        <Button size="sm" variant="secondary" type="button" disabled={loading} onClick={() => { void refresh(); }}>Try again</Button>
      </div> : null}

      {queue ? <>
        {queue.items.length ? <div className={`review-queue-entries${stale ? ' review-queue-entries-stale' : ''}`}>
          {groups.flatMap((group) => {
            const items = queue.items.filter((item) => item.group === group.id);
            if (!items.length) return [];
            // Keep rows as keyed siblings so a date-driven group change preserves focus.
            return [<h3 className="review-queue-group-heading" key={`group-${group.id}`}>{group.label}</h3>, ...items.map((item) => <article className="review-queue-row" key={`thesis-${item.thesisId}`} aria-label={`${item.entityName}: ${item.title}`}>
              <div className="review-queue-row-copy">
                <h4>{item.entityName}{item.ticker ? <span className="review-queue-ticker">{item.ticker}</span> : null}</h4>
                <p className="review-queue-title">{item.title}</p>
                <p className="review-queue-timing"><span>Review timing</span>{timingText(item.reviewTiming)}</p>
                {item.researchReasons.length ? <div className="review-queue-concerns">
                  <p>Research concerns</p>
                  <ul>{item.researchReasons.map((reason) => <li key={reason.code}>{reason.message}</li>)}</ul>
                </div> : null}
                {item.review?.baselineStatus === 'changed' ? <p className="review-queue-baseline">Thesis changed since this draft began. Check it before continuing.</p> : null}
              </div>
              <Button className="review-queue-open" size="sm" variant="secondary" type="button" disabled={!onOpenThesis || stale} onClick={() => onOpenThesis?.({ thesisId: item.thesisId, ...(item.review ? { reviewSessionId: item.review.sessionId } : {}) })}>
                {item.review ? 'Resume review' : 'Open thesis'}
              </Button>
            </article>)];
          })}
        </div> : !stale ? <div className="review-queue-state">
          <strong>{queue.eligibleThesisCount + queue.excludedThesisCount === 0 ? 'No saved theses yet.' : 'Nothing is queued for review today.'}</strong>
          <p>{queue.eligibleThesisCount + queue.excludedThesisCount === 0 ? 'Open Theses to begin your first thesis.' : 'You can open any saved thesis from Theses.'}</p>
        </div> : null}
        <p className="review-queue-scope">Paused and archived theses are excluded. Reviews scheduled more than seven days away are not listed for timing alone.</p>
      </> : null}
    </>}
  </section>;
}

function localDay(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new Error('The current local date could not be read.');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timingText(timing: QueueItem['reviewTiming']): string {
  const date = timing.dueDate ? new Date(`${timing.dueDate}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' }) : null;
  const days = Math.abs(timing.daysUntilDue ?? 0);
  if (timing.status === 'overdue') return `${days} ${days === 1 ? 'day' : 'days'} overdue${date ? ` · Due ${date}` : ''}`;
  if (timing.status === 'due_today') return `Due today${date ? ` · ${date}` : ''}`;
  if (timing.status === 'due_soon' || timing.status === 'scheduled') return `Due ${date ?? `in ${days} days`}`;
  if (timing.status === 'paused') return 'Reviews paused';
  if (timing.status === 'archived') return 'Thesis archived';
  return 'No review date set';
}
