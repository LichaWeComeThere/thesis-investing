import {
  LIVING_THESIS_CATALYST_STATUSES, LIVING_THESIS_CONVICTIONS, LIVING_THESIS_LIFECYCLES,
  LIVING_THESIS_RISK_LEVELS, LIVING_THESIS_RISK_STATUSES, MBS_CATEGORIES,
  completeLivingThesisReviewWorkflowStep, getLivingThesisReviewPreview,
  returnToLivingThesisReviewStep, updateLivingThesisReviewNotes, updateLivingThesisReviewReason,
  updateLivingThesisReviewScoreDraft, updateLivingThesisReviewSection,
  type LivingThesisReviewDraft, type LivingThesisReviewResult, type LivingThesisReviewWorkflow,
  type LivingThesisReviewWorkflowStepId, type ManualBusinessScoreCategory
} from '@thesis-investing/core';
import { Button, DraftLeaveDialog, ReviewStepNavigation } from '@thesis-investing/ui';
import { cloneElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { CompletedReviewSession, ResumedReviewSession, ReviewSessionsStorageApi } from '../../shared/reviewSessionsStorage';
import './reviewSession.css';

const steps: readonly { id: LivingThesisReviewWorkflowStepId; label: string; description: string }[] = [
  { id: 'start_review', label: 'Reason', description: 'Why review now?' },
  { id: 'review_thesis_summary', label: 'Thesis', description: 'Revisit your thinking' },
  { id: 'review_risks_and_catalysts', label: 'Risks & catalysts', description: 'What could change?' },
  { id: 'review_mbs_score', label: 'Business score', description: 'Optional rating update' },
  { id: 'review_assessment', label: 'Your assessment', description: 'Confidence and next check' },
  { id: 'preview_changes', label: 'Review draft', description: 'Read your proposed changes' }
];
const scoreLabels: Record<ManualBusinessScoreCategory, string> = {
  businessQuality: 'Business quality', moat: 'Competitive advantage', management: 'Management',
  balanceSheet: 'Balance sheet', growth: 'Growth', valuation: 'Valuation', risk: 'Risk resilience'
};
const fieldLabels: Record<keyof LivingThesisReviewDraft, string> = {
  entityName: 'Company or entity', ticker: 'Ticker', title: 'Thesis title', theme: 'Theme',
  summary: 'Summary', bullCase: 'What supports the thesis', bearCase: 'What challenges the thesis',
  risks: 'Risks', catalysts: 'Catalysts', lifecycle: 'Thesis status', conviction: 'Confidence',
  riskLevel: 'Risk level', reviewCadenceDays: 'Review frequency (days)', nextReviewAt: 'Next review date'
};
export type ReviewNavigationRequest = { destination: string; onLeave: () => void; onStay: () => void };

export function ReviewSessionScreen({ initialReview, client, onReturn, onComplete, navigationRequest }: {
  initialReview: ResumedReviewSession;
  client: ReviewSessionsStorageApi;
  onReturn: () => void;
  onComplete: (completed: CompletedReviewSession) => void;
  navigationRequest?: ReviewNavigationRequest;
}): JSX.Element {
  const [review, setReview] = useState(initialReview);
  const [workflow, setWorkflow] = useState(initialReview.session.workflow);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionFailed, setCompletionFailed] = useState(false);
  const [completionUncertain, setCompletionUncertain] = useState(false);
  const completionRequest = useRef<{ workflow: LivingThesisReviewWorkflow; version: number } | null>(null);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(workflow) !== JSON.stringify(review.session.workflow);
  const activeIndex = Math.max(0, Math.min(5, steps.findIndex((step) => step.id === workflow.activeStep) < 0 ? 5 : steps.findIndex((step) => step.id === workflow.activeStep)));
  const activeStep = steps[activeIndex];
  const draft = workflow.draft;
  const request = navigationRequest ?? (leaving ? { destination: 'the Thesis Board', onLeave: onReturn, onStay: () => setLeaving(false) } : undefined);

  useEffect(() => { headingRef.current?.focus(); }, [workflow.activeStep]);
  useEffect(() => {
    if (!navigationRequest) return;
    if (confirming || completing) { navigationRequest.onStay(); return; }
    if (!dirty && !busy) navigationRequest.onLeave();
  }, [navigationRequest, dirty, busy, confirming, completing]);
  useEffect(() => {
    if (!dirty && !busy && !completionUncertain) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty, busy, completionUncertain]);

  function apply(result: LivingThesisReviewResult<LivingThesisReviewWorkflow>): void {
    if (inFlight.current || confirming || completionUncertain) return;
    if (result.ok) { setWorkflow(result.value); setErrors([]); }
    else setErrors(result.errors);
  }
  function updateText(kind: 'reason' | 'notes', value: string): void {
    const result = kind === 'reason' ? updateLivingThesisReviewReason(workflow, value) : updateLivingThesisReviewNotes(workflow, value);
    // Keep spaces while typing; core helpers still own progress invalidation.
    apply(result.ok ? { ok: true, value: { ...result.value, [kind === 'reason' ? 'reviewReason' : 'notes']: value } } : result);
  }
  function updateFields(fields: Partial<LivingThesisReviewDraft>): void {
    const merged = { ...draft, ...fields };
    const section = activeStep.id;
    if (section === 'review_thesis_summary' || section === 'review_risks_and_catalysts' || section === 'review_assessment') {
      apply(updateLivingThesisReviewSection(workflow, section, merged));
    }
  }
  function next(): void { apply(completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep)); }
  function backTo(index: number): void { apply(returnToLivingThesisReviewStep(workflow, steps[index].id)); }
  function returnToBoard(): void {
    if (dirty || busy) setLeaving(true);
    else onReturn();
  }
  async function save(after?: () => void): Promise<void> {
    if (inFlight.current || confirming || completionUncertain) return;
    inFlight.current = true;
    setBusy(true); setErrors([]); setSaveFailed(false); setCompletionFailed(false);
    try {
      const result = await client.saveDraft(review.session.id, workflow, review.session.version);
      if (result.ok) {
        setReview((current) => ({ ...current, session: result.value }));
        setWorkflow(result.value.workflow);
        after?.();
      } else { setErrors(result.errors); setSaveFailed(true); }
    } catch { setErrors(['Your draft was not saved. Your edits are still here. Try saving again.']); setSaveFailed(true); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function complete(): Promise<void> {
    if (inFlight.current || review.baselineStatus !== 'current') return;
    const confirmed = completionUncertain && completionRequest.current
      ? { ok: true as const, value: completionRequest.current.workflow }
      : workflow.activeStep === 'complete_review'
      ? { ok: true as const, value: workflow }
      : completeLivingThesisReviewWorkflowStep(workflow, 'preview_changes');
    if (!confirmed.ok) { setErrors(confirmed.errors); return; }
    const version = completionUncertain && completionRequest.current ? completionRequest.current.version : review.session.version;
    completionRequest.current = { workflow: confirmed.value, version };
    inFlight.current = true;
    setBusy(true); setCompleting(true); setErrors([]); setCompletionFailed(false);
    try {
      const result = await client.complete(review.session.id, confirmed.value, version);
      if (result.ok) { onComplete(result.value); return; }
      setErrors(result.errors); setCompletionFailed(true); setCompletionUncertain(false);
      // Refresh the warning without replacing this window's unsaved work or version.
      try {
        const latest = await client.resume(review.session.id);
        if (latest.ok) setReview((current) => ({ ...current, baselineStatus: latest.value.baselineStatus, currentThesis: latest.value.currentThesis }));
      } catch { /* Keep the original completion error and the full local draft. */ }
    } catch {
      setErrors(['Completion could not be confirmed. Your draft is still here. Editing is paused until the result is known. Try Complete review again to safely check or finish the same review.']);
      setCompletionFailed(true); setCompletionUncertain(true);
    } finally { inFlight.current = false; setBusy(false); setCompleting(false); }
  }
  async function reloadSaved(): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setErrors([]);
    try {
      const result = await client.resume(review.session.id);
      if (result.ok) { setReview(result.value); setWorkflow(result.value.session.workflow); setReloading(false); setSaveFailed(false); setCompletionFailed(false); }
      else setErrors(result.errors);
    } catch { setErrors(['The saved draft could not be opened. Your current edits are still here.']); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function addChild(kind: 'risks' | 'catalysts'): void {
    const timestamp = new Date().toISOString();
    const id = `review-${Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, '0')).join('')}`;
    const base = { id, thesisId: review.session.thesisId, title: '', status: 'open' as const, createdAt: timestamp, updatedAt: timestamp };
    if (kind === 'risks') updateFields({ risks: [...draft.risks, { ...base, severity: 'unrated' }] });
    else updateFields({ catalysts: [...draft.catalysts, base] });
  }

  return (
    <div className="guided-review">
      <header className="review-heading">
        <div><p className="review-eyebrow">Thesis Board</p><h1>Guided review</h1><p>One section at a time. Save your progress whenever you need a break.</p></div>
        <Button type="button" variant="ghost" disabled={completing || confirming} onClick={returnToBoard}>Return to Board</Button>
      </header>
      <section className="review-context" aria-label="Review context">
        <div><strong>{workflow.baseline.entityName}{workflow.baseline.ticker ? ` (${workflow.baseline.ticker})` : ''}</strong><p>{workflow.baseline.title}</p></div>
        <div><span>Review reason</span><p>{workflow.reviewReason || 'Add a reason below'}</p></div>
        <div><span>Started</span><p>{new Date(review.session.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
        <span className="review-draft-badge">Review in progress</span>
      </section>
      {review.baselineStatus !== 'current' ? <div className="review-notice" role="status">
        <strong>{review.baselineStatus === 'archived' ? 'This thesis has been archived.' : 'The saved thesis has changed since this review began.'}</strong>
        <p>Your review uses the earlier thesis. You can keep saving or copy this draft, but it cannot be completed against the earlier thesis. The current thesis stays unchanged.</p>
      </div> : null}
      <div className="review-layout">
        <ReviewStepNavigation steps={steps} currentIndex={activeIndex} disabled={busy || confirming || completionUncertain} onSelect={backTo} />
        <section className="review-editor" aria-labelledby="review-section-heading">
          <div className="review-editor-body">
            <h2 id="review-section-heading" tabIndex={-1} ref={headingRef}>{['Why are you reviewing?', 'Update your thesis', 'What could change?', 'Update your business score', 'How do you see the thesis now?', 'Read your review draft'][activeIndex]}</h2>
            <p className="review-section-help">{[
              'A short reason will help you understand this review when you return.',
              'Capture what changed since your last review. Keep what still holds true.',
              'Risks could weaken your thesis. Catalysts are events that could change it.',
              'MBS means Manual Business Score. You can continue without a new score.',
              'Record your confidence, risks, and when you would like to check again.',
              'Check the changes below. Complete review applies them; Save draft keeps them for later.'
            ][activeIndex]}</p>
            {errors.length > 0 && !confirming ? <div className="review-notice review-error" role="alert"><strong>{completionFailed ? 'Your draft is still here' : saveFailed ? 'Your changes have not been saved' : 'Please check the following'}</strong><ul>{errors.map((error) => <li key={error}>{friendlyError(error)}</li>)}</ul>
              {saveFailed || completionFailed ? <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setReloading(true)}>Open saved draft…</Button> : null}</div> : null}
            <fieldset disabled={busy || completionUncertain} className="review-fields" aria-label={activeStep.label}>
              {activeIndex === 0 ? <>
                <Field label="Review reason" hint="For example: Quarterly check-in, new evidence, or a change in your thinking."><input value={workflow.reviewReason} onChange={(event) => updateText('reason', event.target.value)} placeholder="Why are you taking another look?" /></Field>
                <p className="review-inline-help">You can save an unfinished draft. Add a reason before moving to the next section.</p>
              </> : null}
              {activeIndex === 1 ? <>
                <Field label="Thesis title"><input value={draft.title} onChange={(event) => updateFields({ title: event.target.value })} /></Field>
                <Field label="Summary" hint="What is the main idea, and does the evidence still support it?"><textarea rows={5} value={draft.summary} onChange={(event) => updateFields({ summary: event.target.value })} /></Field>
                <Field label="Review notes (optional)"><textarea rows={3} value={workflow.notes} onChange={(event) => updateText('notes', event.target.value)} placeholder="What did you notice? Include sources you want to revisit." /></Field>
                <details className="review-details"><summary>Supporting and opposing cases · Optional</summary>
                  <Field label="What supports the thesis"><textarea rows={3} value={draft.bullCase ?? ''} onChange={(event) => updateFields({ bullCase: event.target.value })} /></Field>
                  <Field label="What challenges the thesis"><textarea rows={3} value={draft.bearCase ?? ''} onChange={(event) => updateFields({ bearCase: event.target.value })} /></Field>
                </details>
              </> : null}
              {activeIndex === 2 ? <>
                <h3>Risks</h3><p className="review-inline-help">Keep past items for context. Mark a risk resolved or retired when it no longer applies.</p>
                {draft.risks.length === 0 ? <p>No risks recorded yet. Add one if there is something to watch.</p> : null}
                {draft.risks.map((risk, index) => <div className="review-child" key={risk.id}>
                  <Field label={`Risk ${index + 1}`}><input value={risk.title} onChange={(event) => updateFields({ risks: draft.risks.map((item) => item.id === risk.id ? { ...item, title: event.target.value } : item) })} /></Field>
                  <Field label={`Risk ${index + 1} details (optional)`}><textarea rows={2} value={risk.detail ?? ''} onChange={(event) => updateFields({ risks: draft.risks.map((item) => item.id === risk.id ? { ...item, detail: event.target.value } : item) })} /></Field>
                  <div className="review-field-pair"><Choice label={`Risk ${index + 1} status`} value={risk.status} options={LIVING_THESIS_RISK_STATUSES} onChange={(status) => updateFields({ risks: draft.risks.map((item) => item.id === risk.id ? { ...item, status } : item) })} />
                    <Choice label={`Risk ${index + 1} level`} value={risk.severity} options={LIVING_THESIS_RISK_LEVELS} onChange={(severity) => updateFields({ risks: draft.risks.map((item) => item.id === risk.id ? { ...item, severity } : item) })} /></div>
                  {!workflow.baseline.risks.some((item) => item.id === risk.id) ? <Button type="button" variant="ghost" size="sm" onClick={() => updateFields({ risks: draft.risks.filter((item) => item.id !== risk.id) })}>Remove new risk {index + 1}</Button> : null}
                </div>)}
                <Button type="button" variant="secondary" size="sm" onClick={() => addChild('risks')}>Add risk</Button>
                <h3>Catalysts</h3><p className="review-inline-help">An event to check, such as a product launch or the next results report.</p>
                {draft.catalysts.length === 0 ? <p>No catalysts recorded yet. You can continue without adding one.</p> : null}
                {draft.catalysts.map((catalyst, index) => <div className="review-child" key={catalyst.id}>
                  <Field label={`Catalyst ${index + 1}`}><input value={catalyst.title} onChange={(event) => updateFields({ catalysts: draft.catalysts.map((item) => item.id === catalyst.id ? { ...item, title: event.target.value } : item) })} /></Field>
                  <Field label={`Catalyst ${index + 1} details (optional)`}><textarea rows={2} value={catalyst.detail ?? ''} onChange={(event) => updateFields({ catalysts: draft.catalysts.map((item) => item.id === catalyst.id ? { ...item, detail: event.target.value } : item) })} /></Field>
                  <Choice label={`Catalyst ${index + 1} status`} value={catalyst.status} options={LIVING_THESIS_CATALYST_STATUSES} onChange={(status) => updateFields({ catalysts: draft.catalysts.map((item) => item.id === catalyst.id ? { ...item, status } : item) })} />
                  {!workflow.baseline.catalysts.some((item) => item.id === catalyst.id) ? <Button type="button" variant="ghost" size="sm" onClick={() => updateFields({ catalysts: draft.catalysts.filter((item) => item.id !== catalyst.id) })}>Remove new catalyst {index + 1}</Button> : null}
                </div>)}
                <Button type="button" variant="secondary" size="sm" onClick={() => addChild('catalysts')}>Add catalyst</Button>
              </> : null}
              {activeIndex === 3 ? <>
                <fieldset className="review-score-choice"><legend>Would you like to add a new score?</legend>
                  <label><input type="radio" name="review-score" checked={workflow.scoreDraft.kind === 'skip'} onChange={() => apply(updateLivingThesisReviewScoreDraft(workflow, { kind: 'skip' }))} />Continue without a new score</label>
                  <label><input type="radio" name="review-score" checked={workflow.scoreDraft.kind === 'score'} onChange={() => apply(updateLivingThesisReviewScoreDraft(workflow, { kind: 'score', input: {} }))} />Enter new ratings</label>
                </fieldset>
                {workflow.scoreDraft.kind === 'score' ? <><p className="review-inline-help">Rate each factor from 0 (weak) to 10 (strong). A higher risk resilience rating means lower business risk. These ratings stay in this draft.</p>
                  <div className="review-field-pair">{MBS_CATEGORIES.map((category) => <Field key={category} label={scoreLabels[category]}><input type="number" min="0" max="10" step="0.1" value={workflow.scoreDraft.kind === 'score' ? workflow.scoreDraft.input[category] ?? '' : ''} onChange={(event) => apply(updateLivingThesisReviewScoreDraft(workflow, { kind: 'score', input: { ...(workflow.scoreDraft.kind === 'score' ? workflow.scoreDraft.input : {}), [category]: numeric(event.target.value) } }))} /></Field>)}</div>
                  <Field label="Score notes (optional)"><textarea rows={3} value={workflow.scoreDraft.input.notes ?? ''} onChange={(event) => apply(updateLivingThesisReviewScoreDraft(workflow, { kind: 'score', input: { ...(workflow.scoreDraft.kind === 'score' ? workflow.scoreDraft.input : {}), notes: event.target.value } }))} /></Field>
                </> : null}
              </> : null}
              {activeIndex === 4 ? <>
                <div className="review-field-pair"><Choice label="Your confidence" value={draft.conviction} options={LIVING_THESIS_CONVICTIONS} onChange={(conviction) => updateFields({ conviction })} />
                  <Choice label="Risk level" value={draft.riskLevel} options={LIVING_THESIS_RISK_LEVELS} onChange={(riskLevel) => updateFields({ riskLevel })} /></div>
                <Choice label="Thesis status" value={draft.lifecycle} options={LIVING_THESIS_LIFECYCLES} onChange={(lifecycle) => updateFields({ lifecycle })} />
                <div className="review-field-pair"><Field label="Next review date (optional)"><input type="date" value={draft.nextReviewAt ?? ''} onChange={(event) => updateFields({ nextReviewAt: event.target.value || undefined })} /></Field>
                  <Field label="Review every (days, optional)"><input type="number" min="1" step="1" value={draft.reviewCadenceDays ?? ''} onChange={(event) => updateFields({ reviewCadenceDays: numeric(event.target.value) })} /></Field></div>
                <p className="review-inline-help">This records your own assessment. Dates and status changes remain proposed while this review is a draft.</p>
              </> : null}
              {activeIndex === 5 ? <ReviewPreview workflow={workflow} /> : null}
            </fieldset>
          </div>
          <footer className="review-actions">
            <div role="status" aria-live="polite"><strong className={dirty || saveFailed || completionFailed ? 'review-unsaved' : 'review-saved'}>{busy ? (completing ? 'Completing review…' : reloading ? 'Opening saved draft…' : 'Saving draft…') : completionFailed ? 'Completion not confirmed' : saveFailed ? 'Not saved' : dirty ? 'Unsaved changes' : 'Draft saved locally'}</strong><small>Saving keeps this review in progress.</small></div>
            <div className="review-action-buttons"><Button type="button" variant={activeIndex === 5 ? "secondary" : "primary"} disabled={busy || confirming || completionUncertain || !dirty} onClick={() => void save()}>{busy && !completing ? 'Saving…' : 'Save draft'}</Button>
              {activeIndex < 5 ? <Button type="button" variant="ghost" disabled={busy} onClick={next}>Next: {steps[activeIndex + 1].label}</Button> : <Button type="button" disabled={busy || review.baselineStatus !== 'current'} onClick={() => { setErrors([]); setConfirming(true); }}>{completing ? 'Completing review…' : 'Complete review'}</Button>}
            </div>
          </footer>
        </section>
      </div>
      {request && !confirming && !completing && (dirty || busy) ? <DraftLeaveDialog title="Save your review before leaving?" description={`Save your progress before opening ${request.destination}. Discarding removes only edits made since your last draft save.`} errors={errors} busy={busy} onSave={() => void save(request.onLeave)} onDiscard={request.onLeave} onStay={request.onStay} /> : null}
      {confirming ? <DraftLeaveDialog title="Complete this review?"
        description={review.baselineStatus !== 'current'
          ? 'The saved thesis changed or was archived. Keep editing to save or copy your draft; completion is blocked so newer research is preserved.'
          : `This applies the changes you just reviewed to your saved thesis and records the review in its history.${workflow.scoreDraft.kind === 'score' ? ' Your new business score is saved with this review.' : ' No new business score will be added.'} Everything is saved together. Your draft will no longer be in progress.`}
        errors={errors.map(friendlyError)} busy={busy} onSave={() => void complete()} onStay={() => setConfirming(false)}
        saveLabel="Complete review" busyLabel="Completing review…" stayLabel="Keep editing" stayDisabled={completionUncertain} saveDisabled={review.baselineStatus !== 'current'} /> : null}
      {reloading ? <DraftLeaveDialog title="Open the saved draft?" description="This replaces your unsaved edits with the latest saved draft. Continue editing if you want to keep or copy your current text first." errors={errors} busy={busy} onSave={() => void reloadSaved()} onStay={() => setReloading(false)} saveLabel="Open saved draft" /> : null}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): JSX.Element {
  const id = useId();
  return <div className="review-field"><label htmlFor={id}>{label}</label>{hint ? <small id={`${id}-hint`}>{hint}</small> : null}{cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, { id, 'aria-describedby': hint ? `${id}-hint` : undefined })}</div>;
}
function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }): JSX.Element {
  return <Field label={label}><select value={value} onChange={(event) => onChange(event.target.value as T)}>{options.map((option) => <option key={option} value={option}>{option === 'unrated' ? 'Not assessed yet' : option[0].toUpperCase() + option.slice(1)}</option>)}</select></Field>;
}
function numeric(value: string): number | undefined {
  return value === '' || !Number.isFinite(Number(value)) ? undefined : Number(value);
}
function friendlyError(error: string): string {
  return MBS_CATEGORIES.reduce((message, category) => message.replaceAll(category, scoreLabels[category]), error);
}
function display(value: unknown): string {
  if (value === undefined || value === '') return 'Not set';
  if (Array.isArray(value)) return value.length === 0 ? 'None recorded' : value.map((item) => `${item.title || 'Untitled'} · ${item.status}${item.severity ? ` · ${item.severity}` : ''}${item.detail ? ` — ${item.detail}` : ''}`).join('\n');
  return String(value);
}
function ReviewPreview({ workflow }: { workflow: LivingThesisReviewWorkflow }): JSX.Element {
  const preview = getLivingThesisReviewPreview(workflow);
  return <div className="review-preview">
    <div><h3>Review reason</h3><p>{workflow.reviewReason}</p></div>
    {workflow.notes ? <div><h3>Your notes</h3><p>{workflow.notes}</p></div> : null}
    <h3>Proposed thesis changes</h3>
    {preview.changedFields.length === 0 ? <p>No thesis fields changed. Completing still records your review reason, notes, and review date in history.</p> : null}
    {preview.changedFields.map((field) => <section className="review-comparison" key={field} aria-label={fieldLabels[field]}><h4>{fieldLabels[field]}</h4><div><span>Saved thesis</span><p>{display(preview.before[field])}</p></div><div><span>Review draft</span><p>{display(preview.after[field])}</p></div></section>)}
    <h3>Business score</h3>
    {workflow.scoreDraft.kind === 'score' ? <><dl>{MBS_CATEGORIES.map((category) => <div key={category}><dt>{scoreLabels[category]}</dt><dd>{workflow.scoreDraft.kind === 'score' ? workflow.scoreDraft.input[category] ?? 'Not rated' : ''} / 10</dd></div>)}</dl>{workflow.scoreDraft.input.notes ? <p>{workflow.scoreDraft.input.notes}</p> : null}</> : <p>{workflow.scoreDraft.kind === 'skip' ? 'Continue without a new score.' : 'No score choice made yet.'}</p>}
    <p className="review-inline-help">Save draft keeps this work for later. Complete review applies these changes and records the finished review in your thesis history.</p>
  </div>;
}
