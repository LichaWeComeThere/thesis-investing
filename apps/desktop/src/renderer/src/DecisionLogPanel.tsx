import type { LivingThesisDecision } from '@thesis-investing/core';
import { Badge, Button, Card, DraftLeaveDialog } from '@thesis-investing/ui';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CompletedDecisionReview, DecisionsStorageApi, DecisionWriteInput } from '../../shared/decisionsStorage';

export type DecisionNavigationRequest = {
  destination: string;
  onLeave: () => void;
  onStay: () => void;
};

/** Append-only research notes; the containing Board owns the selected thesis. */
export function DecisionLogPanel({ thesisId, entityName, client, disabled = false, navigationRequest, onGuardChange, embedded = false, showEntries = true, heading, onDecisionSaved }: {
  thesisId: string;
  entityName: string;
  client: DecisionsStorageApi | null;
  disabled?: boolean;
  navigationRequest?: DecisionNavigationRequest;
  onGuardChange: (guarded: boolean) => void;
  embedded?: boolean;
  showEntries?: boolean;
  heading?: ReactNode;
  onDecisionSaved?: () => void;
}): JSX.Element {
  const [decisions, setDecisions] = useState<LivingThesisDecision[]>([]);
  const [reviews, setReviews] = useState<CompletedDecisionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<readonly string[]>([]);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [reviewSessionId, setReviewSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [showAll, setShowAll] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const requestId = useRef('');
  const submitted = useRef<DecisionWriteInput | null>(null);
  const saving = useRef(false);
  const dirty = title.length > 0 || rationale.length > 0 || reviewSessionId.length > 0;
  const guarded = isOpen || busy || uncertain;

  const load = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!client) { setLoading(false); setLoadErrors(['Decision storage is unavailable in this window.']); return; }
    setLoading(true); setLoadErrors([]);
    try {
      const [entries, completed] = await Promise.all([showEntries ? client.list(thesisId) : Promise.resolve({ ok: true as const, value: [] }), client.listCompletedReviews(thesisId)]);
      if (!isCurrent()) return;
      const nextErrors = [...(!entries.ok ? entries.errors : []), ...(!completed.ok ? completed.errors : [])];
      setLoadErrors(nextErrors);
      if (entries.ok) setDecisions(entries.value);
      if (completed.ok) setReviews(completed.value);
    } catch {
      if (isCurrent()) setLoadErrors(['The decision log could not be loaded. Try again.']);
    } finally { if (isCurrent()) setLoading(false); }
  }, [client, thesisId, showEntries]);

  useEffect(() => { let current = true; void load(() => current); return () => { current = false; }; }, [load]);
  useEffect(() => { onGuardChange(guarded); }, [guarded, onGuardChange]);
  useEffect(() => () => onGuardChange(false), [onGuardChange]);
  useEffect(() => {
    if (isOpen) titleRef.current?.focus();
    else if (wasOpen.current) headingRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    if (!dirty && !busy && !uncertain) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty, busy, uncertain]);

  function resetForm(): void {
    setIsOpen(false); setTitle(''); setRationale(''); setReviewSessionId('');
    setErrors([]); setUncertain(false); setConfirmCancel(false); submitted.current = null;
  }

  useEffect(() => {
    if (navigationRequest && isOpen && !dirty && !busy && !uncertain) {
      setIsOpen(false);
      navigationRequest.onLeave();
    }
  }, [navigationRequest, isOpen, dirty, busy, uncertain]);

  function begin(): void {
    if (disabled || loading || !client || isOpen || loadErrors.length > 0) return;
    requestId.current = createDecisionRequestId();
    setSavedMessage(''); setErrors([]); setIsOpen(true);
  }

  async function save(onSaved?: () => void): Promise<void> {
    if (saving.current || !client) return;
    if (!submitted.current && !formRef.current?.reportValidity()) {
      setErrors(['Enter a decision and a reason before saving.']); return;
    }
    const input = submitted.current ?? { title, rationale, ...(reviewSessionId ? { reviewSessionId } : {}) };
    submitted.current = input; saving.current = true; setBusy(true); setErrors([]);
    try {
      const result = await client.create(thesisId, input, requestId.current);
      if (!result.ok) {
        setErrors(result.errors);
        // An earlier lost reply may already have committed. Keep retrying its exact request.
        if (!uncertain) submitted.current = null;
        return;
      }
      setDecisions((current) => [result.value, ...current.filter((entry) => entry.id !== result.value.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)));
      resetForm(); setSavedMessage('Decision saved. You can find it in this thesis’s history.');
      onDecisionSaved?.();
      onSaved?.();
    } catch {
      setUncertain(true);
      setErrors(['Saving could not be confirmed. Retry the same decision to check whether it was saved. Your text is kept here.']);
    } finally { saving.current = false; setBusy(false); }
  }

  function cancel(): void {
    if (busy || uncertain) return;
    if (dirty) setConfirmCancel(true); else resetForm();
  }

  const entries = showAll ? decisions : decisions.slice(0, 5);
  const content = <>
    <div className="decision-log-heading" ref={headingRef}>
      {heading ?? <div><h2>Decision Log</h2><p>What you decided about {entityName}, and why.</p></div>}
      {!isOpen ? <Button disabled={disabled || loading || !client || loadErrors.length > 0} onClick={begin} size="sm" type="button">Add decision</Button> : null}
    </div>
    {disabled && !isOpen ? <p className="decision-log-hint">Save or cancel your thesis edits before adding a decision.</p> : null}
    {loading ? <p role="status">{showEntries ? 'Loading decisions…' : 'Loading review options…'}</p> : null}
    {loadErrors.length > 0 ? <div role="alert"><p>{loadErrors.join(' ')}</p>{client ? <Button type="button" variant="secondary" onClick={() => void load()}>Try loading again</Button> : null}</div> : null}
    {savedMessage ? <p className="decision-log-saved" role="status">{savedMessage}</p> : null}
    {isOpen ? <form className="decision-log-form" ref={formRef} onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy || uncertain}>
        <label className="living-thesis-field"><span>Decision</span><input aria-label="Decision" ref={titleRef} required maxLength={160} value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder="For example, revisit after the next results" /></label>
        <label className="living-thesis-field"><span>Reason</span><textarea aria-label="Reason" required maxLength={10000} rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder="What led you to this decision?" /></label>
        <label className="living-thesis-field"><span>Linked review (optional)</span><select aria-label="Linked review (optional)" value={reviewSessionId} onChange={(event) => setReviewSessionId(event.currentTarget.value)}><option value="">No linked review</option>{reviews.map((review) => <option key={review.id} value={review.id}>{formatDate(review.completedAt)} · {review.reviewReason.length > 90 ? `${review.reviewReason.slice(0, 90)}…` : review.reviewReason}</option>)}</select></label>
        <p className="decision-log-hint">The date is recorded when you save. Saved decisions stay in your history; add a new entry when your thinking changes.</p>
      </fieldset>
      {errors.length > 0 ? <div role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="decision-log-actions"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : uncertain ? 'Retry save' : 'Save decision'}</Button><Button type="button" variant="secondary" disabled={busy || uncertain} onClick={cancel}>Cancel</Button></div>
    </form> : null}
    {showEntries && !isOpen && !loading && loadErrors.length === 0 && decisions.length === 0 ? <p className="decision-log-empty">No decisions yet. Add a decision to remember your reasoning over time.</p> : null}
    {showEntries && decisions.length > 0 ? <ol className="decision-log-list" aria-label="Saved decisions">{entries.map((decision) => {
      const linked = reviews.find((review) => review.id === decision.reviewSessionId);
      return <li key={decision.id}><article><div className="decision-log-entry-heading"><h3>{decision.title}</h3><time dateTime={decision.createdAt}>{formatDate(decision.createdAt)}</time></div><p className="decision-log-reason">{decision.rationale}</p>{decision.reviewSessionId ? <div className="decision-log-review"><Badge variant="accent">Linked review</Badge><span>{linked ? `${formatDate(linked.completedAt)} · ${linked.reviewReason}` : 'Completed thesis review'}</span></div> : null}</article></li>;
    })}</ol> : null}
    {showEntries && decisions.length > 5 ? <Button type="button" variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show recent decisions' : `Show all ${decisions.length} decisions`}</Button> : null}
    {navigationRequest && isOpen && (dirty || busy || uncertain) ? <DraftLeaveDialog title="Unsaved decision" description={uncertain ? 'Confirm this save before leaving so your decision is recorded only once.' : `Save your decision before opening ${navigationRequest.destination}, or discard it and leave.`} errors={errors} busy={busy} onSave={() => void save(navigationRequest.onLeave)} saveLabel={uncertain ? 'Retry save and leave' : 'Save and leave'} onDiscard={uncertain ? undefined : () => { resetForm(); navigationRequest.onLeave(); }} onStay={navigationRequest.onStay} stayDisabled={uncertain} /> : null}
    {confirmCancel && !navigationRequest ? <DraftLeaveDialog title="Discard this decision?" description="This decision has not been saved. Discarding it removes the text you entered." errors={[]} busy={false} onSave={resetForm} saveLabel="Discard decision" onStay={() => setConfirmCancel(false)} stayLabel="Keep editing" /> : null}
  </>;
  return embedded ? <section className="decision-log-embedded" aria-label={`Decision log for ${entityName}`}>{content}</section>
    : <Card className="decision-log-card" aria-label={`Decision log for ${entityName}`}>{content}</Card>;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function createDecisionRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Development previews may use HTTP, where randomUUID is unavailable.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
