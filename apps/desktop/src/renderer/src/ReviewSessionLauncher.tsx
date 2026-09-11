import type { LivingThesis } from '@thesis-investing/core';
import { Button } from '@thesis-investing/ui';
import { useEffect, useRef, useState } from 'react';
import type { ResumedReviewSession, ReviewSessionsStorageApi } from '../../shared/reviewSessionsStorage';

export function ReviewSessionLauncher({ thesis, client, disabled, onOpen }: {
  thesis: LivingThesis;
  client: ReviewSessionsStorageApi | null;
  disabled: boolean;
  onOpen: (review: ResumedReviewSession) => void;
}): JSX.Element {
  const [active, setActive] = useState<ResumedReviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [reload, setReload] = useState(0);
  const opening = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setErrors([]);
    if (!client) { setLoading(false); return; }
    void client.getActive(thesis.id).then((result) => {
      if (disposed) return;
      if (result.ok) setActive(result.value);
      else setErrors(result.errors);
    }).catch(() => {
      if (!disposed) setErrors(['Your review could not be loaded. Try again.']);
    }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [client, thesis.id, thesis.version, reload]);

  async function open(): Promise<void> {
    if (!client || opening.current || disabled) return;
    opening.current = true;
    setLoading(true);
    setErrors([]);
    try {
      if (active) {
        const result = await client.resume(active.session.id);
        if (result.ok) { if (mounted.current) onOpen(result.value); }
        else if (mounted.current) setErrors(result.errors);
      } else {
        const result = await client.start(thesis.id);
        if (result.ok) { if (mounted.current) onOpen({ session: result.value, currentThesis: result.value.workflow.baseline, baselineStatus: 'current' }); }
        else if (mounted.current) setErrors(result.errors);
      }
    } catch { setErrors(['Your review could not be opened. Try again.']); }
    finally { opening.current = false; setLoading(false); }
  }

  return (
    <section className="review-launcher" aria-label="Review this thesis">
      <div><strong>{active ? 'You have a review in progress' : 'Take a fresh look at your thesis'}</strong>
        <p>{disabled ? 'Save or cancel your thesis edits before opening a review.' : 'Review one section at a time. Save a draft and continue later.'}</p>
        {!client ? <p>Open the desktop app to start or resume a saved review.</p> : null}
        {thesis.lifecycle === 'archived' && !active ? <p>Unarchive this thesis before starting a review.</p> : null}
        {errors.length > 0 ? <div role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      </div>
      {errors.length > 0 ? <Button type="button" variant="secondary" disabled={loading} onClick={() => setReload((value) => value + 1)}>Try again</Button> :
        <Button type="button" disabled={!client || disabled || loading || (thesis.lifecycle === 'archived' && !active)} onClick={() => void open()}>
          {loading ? 'Loading review…' : active ? 'Resume review' : 'Start review'}
        </Button>}
    </section>
  );
}
