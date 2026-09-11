import {
  LIVING_THESIS_CATALYST_STATUSES,
  LIVING_THESIS_CONVICTIONS,
  LIVING_THESIS_LIFECYCLES,
  LIVING_THESIS_RISK_LEVELS,
  LIVING_THESIS_RISK_STATUSES,
  type LivingThesis,
  type LivingThesisCatalystStatus,
  type LivingThesisConviction,
  type LivingThesisLifecycle,
  type LivingThesisRiskLevel,
  type LivingThesisRiskStatus
} from '@thesis-investing/core';
import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReviewSessionLauncher } from './ReviewSessionLauncher';
import { ReviewSessionScreen } from './ReviewSessionScreen';
import { getDefaultReviewSessionsStorageClient } from './reviewSessionsStorageClient';
import type { ResumedReviewSession, ReviewSessionsStorageApi } from '../../shared/reviewSessionsStorage';

import type {
  LivingThesisCatalystWriteInput,
  LivingThesisRiskWriteInput
} from '../../shared/livingThesesStorage';
import {
  saveLivingThesisDraft,
  thesisToDraft,
  type LivingThesisBoardDraft
} from './livingThesisBoardModel';
import {
  getDefaultLivingThesesStorageClient,
  type LivingThesesStorageClient
} from './livingThesesStorageClient';

type ThesisBoardScreenProps = {
  reviewClient?: ReviewSessionsStorageApi | null;
  client?: LivingThesesStorageClient | null;
  initialFeedback?: BoardFeedback | null;
  initialLoadState?: BoardLoadState;
  initialTheses?: LivingThesis[];
  navigationRequest?: {
    destination: string;
    onLeave: () => void;
    onStay: () => void;
  };
};

type BoardLoadState = 'error' | 'loaded' | 'loading';

type BoardFeedback =
  | { type: 'conflict'; messages: readonly string[] }
  | { type: 'error'; messages: readonly string[] }
  | { type: 'saved'; message: string }
  | { type: 'warning'; message: string };

type BoardDraft = LivingThesisBoardDraft;

type BoardFilter = 'all' | LivingThesisLifecycle;
type BoardSort = 'entity' | 'next-review' | 'recently-updated';

const lifecycleLabels: Record<LivingThesisLifecycle, string> = {
  active: 'Active',
  archived: 'Archived',
  draft: 'Draft',
  monitoring: 'Monitoring',
  paused: 'Paused'
};

const convictionLabels: Record<LivingThesisConviction, string> = {
  high: 'High',
  low: 'Low',
  medium: 'Medium',
  unrated: 'Unrated'
};

const riskLevelLabels: Record<LivingThesisRiskLevel, string> = {
  high: 'High',
  low: 'Low',
  medium: 'Medium',
  unrated: 'Unrated'
};

const riskStatusLabels: Record<LivingThesisRiskStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
  retired: 'Retired'
};

const catalystStatusLabels: Record<LivingThesisCatalystStatus, string> = {
  observed: 'Observed',
  open: 'Open',
  retired: 'Retired'
};

const emptyDraft: BoardDraft = {
  bearCase: '',
  bullCase: '',
  catalysts: [],
  conviction: 'unrated',
  entityName: '',
  lifecycle: 'draft',
  nextReviewAt: '',
  reviewCadenceDays: '',
  riskLevel: 'unrated',
  risks: [],
  summary: '',
  theme: '',
  ticker: '',
  title: ''
};

export function ThesisBoardScreen({
  client = getDefaultLivingThesesStorageClient(),
  reviewClient = getDefaultReviewSessionsStorageClient(),
  initialFeedback = null,
  initialLoadState,
  initialTheses,
  navigationRequest
}: ThesisBoardScreenProps): JSX.Element {
  const [review, setReview] = useState<ResumedReviewSession | null>(null);
  const [theses, setTheses] = useState<LivingThesis[]>(initialTheses ?? []);
  const [loadState, setLoadState] = useState<BoardLoadState>(
    initialLoadState ?? (initialTheses ? 'loaded' : 'loading')
  );
  const [selectedId, setSelectedId] = useState(initialTheses?.[0]?.id ?? '');
  const [draft, setDraft] = useState<BoardDraft>(() =>
    initialTheses?.[0] ? thesisToDraft(initialTheses[0]) : emptyDraft
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<BoardFeedback | null>(initialFeedback);
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [sort, setSort] = useState<BoardSort>('recently-updated');
  const editorFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (navigationRequest && !review && !isDirty && !isSaving) {
      navigationRequest.onLeave();
    }
  }, [isDirty, isSaving, navigationRequest, review]);

  const loadTheses = useCallback(async (preferredId = ''): Promise<void> => {
    if (!client) {
      setLoadState('error');
      setFeedback({
        messages: ['Living Thesis storage is unavailable in this window.'],
        type: 'error'
      });
      return;
    }

    setLoadState('loading');
    const result = await client.list();

    if (!result.ok) {
      setLoadState('error');
      setFeedback({ messages: result.errors, type: 'error' });
      return;
    }

    setTheses(result.value);
    setLoadState('loaded');
    setFeedback(null);

    const nextSelected =
      result.value.find((thesis) => thesis.id === preferredId) ?? result.value[0];

    if (nextSelected) {
      setSelectedId(nextSelected.id);
      setDraft(thesisToDraft(nextSelected));
    } else {
      setSelectedId('');
      setDraft(emptyDraft);
    }
  }, [client]);

  useEffect(() => {
    if (initialTheses !== undefined || initialLoadState !== undefined) {
      return;
    }

    void loadTheses();
  }, [initialLoadState, initialTheses, loadTheses]);

  const visibleTheses = useMemo(
    () => sortTheses(filterTheses(theses, filter), sort),
    [filter, sort, theses]
  );
  const selectedThesis = theses.find((thesis) => thesis.id === selectedId);

  function selectThesis(thesis: LivingThesis): void {
    if (isSaving) return;
    if (isDirty) {
      setFeedback({
        message: 'Save or cancel the current changes before opening another thesis.',
        type: 'warning'
      });
      return;
    }

    setSelectedId(thesis.id);
    setDraft(thesisToDraft(thesis));
    setIsCreating(false);
    setFeedback(null);
  }

  function beginCreate(): void {
    if (isSaving) return;
    if (isDirty) {
      setFeedback({
        message: 'Save or cancel the current changes before creating a thesis.',
        type: 'warning'
      });
      return;
    }

    setDraft(emptyDraft);
    setIsCreating(true);
    setSelectedId('');
    setFeedback(null);
  }

  function updateDraft<K extends keyof BoardDraft>(
    field: K,
    value: BoardDraft[K]
  ): void {
    setDraft((current) => ({ ...current, [field]: value }));
    setIsDirty(true);
    setFeedback(null);
  }

  function cancelEditing(): void {
    if (isSaving) return;
    if (isCreating) {
      const firstThesis = theses[0];
      setIsCreating(false);
      setIsDirty(false);
      setFeedback(null);

      if (firstThesis) {
        setSelectedId(firstThesis.id);
        setDraft(thesisToDraft(firstThesis));
      } else {
        setSelectedId('');
        setDraft(emptyDraft);
      }
      return;
    }

    if (selectedThesis) {
      setDraft(thesisToDraft(selectedThesis));
    }
    setIsDirty(false);
    setFeedback(null);
  }

  async function saveDraft(): Promise<void> {
    if (isSaving) return;

    if (!editorFormRef.current?.checkValidity()) {
      setFeedback({
        messages: ['Complete the required fields and correct any invalid values before saving. Choose Continue editing to review them.'],
        type: 'error'
      });
      return;
    }

    if (!client) {
      setFeedback({
        messages: ['Living Thesis storage is unavailable in this window.'],
        type: 'error'
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await saveLivingThesisDraft(client, draft, isCreating);

      if (!result.ok) {
        setFeedback({
          messages: result.errors,
          type: result.code === 'conflict' ? 'conflict' : 'error'
        });
        return;
      }

      setTheses((current) => upsertThesis(current, result.value));
      setSelectedId(result.value.id);
      setDraft(thesisToDraft(result.value));
      setIsCreating(false);
      setIsDirty(false);
      setFeedback({
        message: isCreating
          ? 'Living Thesis created and saved locally.'
          : `Changes saved locally. Version ${result.value.version} is current.`,
        type: 'saved'
      });
    } catch {
      setFeedback({
        messages: ['The thesis could not be saved. Your edits are still open; try again.'],
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function reloadAfterConflict(): Promise<void> {
    if (!client || !draft.id) {
      return;
    }

    const result = await client.getById(draft.id);

    if (!result.ok) {
      setFeedback({ messages: result.errors, type: 'error' });
      return;
    }

    setTheses((current) => upsertThesis(current, result.value));
    setDraft(thesisToDraft(result.value));
    setSelectedId(result.value.id);
    setIsDirty(false);
    setFeedback({
      message: `Reloaded saved version ${result.value.version}.`,
      type: 'saved'
    });
  }

  if (review && reviewClient) {
    return <ReviewSessionScreen key={review.session.id} initialReview={review} client={reviewClient}
      navigationRequest={navigationRequest} onReturn={() => setReview(null)} onComplete={(completed) => {
        setTheses((current) => upsertThesis(current, completed.thesis));
        setDraft(thesisToDraft(completed.thesis));
        setSelectedId(completed.thesis.id);
        setIsCreating(false); setIsDirty(false);
        setFeedback({ type: 'saved', message: `Review completed. Your thesis and review history are saved.${completed.scoreSnapshot ? ' The new business score is saved too.' : ''}` });
        navigationRequest?.onStay();
        setReview(null);
      }} />;
  }

  return (
    <div className="thesis-board-screen living-thesis-board">
      <PageHeader
        badge={<Badge variant="accent">Saved locally</Badge>}
        description="Create and maintain durable Living Thesis records in one focused workspace."
        eyebrow="Living Thesis workspace"
        title="Thesis Board"
      />

      <p className="living-thesis-provenance" role="note">
        Your theses and saved review drafts stay on this device. Start a review to revisit your research one section at a time.
      </p>

      {feedback ? (
        <BoardFeedbackPanel
          feedback={feedback}
          onReload={feedback.type === 'conflict' ? reloadAfterConflict : undefined}
        />
      ) : null}

      {selectedThesis && !isCreating && loadState === 'loaded' ? <ReviewSessionLauncher
        key={selectedThesis.id} thesis={selectedThesis} client={reviewClient} disabled={isDirty || isSaving} onOpen={setReview}
      /> : null}

      <div className="living-thesis-board-layout">
        <Card className="living-thesis-list-card" title="Living Thesis records">
          <div className="living-thesis-list-toolbar">
            <label>
              <span>Lifecycle</span>
              <select
                aria-label="Filter by lifecycle"
                onChange={(event) => setFilter(event.currentTarget.value as BoardFilter)}
                value={filter}
              >
                <option value="all">All records</option>
                {LIVING_THESIS_LIFECYCLES.map((lifecycle) => (
                  <option key={lifecycle} value={lifecycle}>
                    {lifecycleLabels[lifecycle]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select
                aria-label="Sort Living Thesis records"
                onChange={(event) => setSort(event.currentTarget.value as BoardSort)}
                value={sort}
              >
                <option value="recently-updated">Recently updated</option>
                <option value="entity">Entity name</option>
                <option value="next-review">Next review</option>
              </select>
            </label>
            <Button disabled={isSaving} onClick={beginCreate} size="sm" type="button">
              New thesis
            </Button>
          </div>

          {loadState === 'loading' ? (
            <BoardState title="Loading saved theses...">
              Reading local Living Thesis records.
            </BoardState>
          ) : null}

          {loadState === 'error' ? (
            <BoardState alert title="Living Thesis records could not be loaded.">
              <span>Your saved data was not changed.</span>
              <Button onClick={() => void loadTheses(selectedId)} size="sm" type="button" variant="secondary">
                Try again
              </Button>
            </BoardState>
          ) : null}

          {loadState === 'loaded' && theses.length === 0 ? (
            <BoardState empty title="No Living Thesis records yet">
              <span>Create a thesis when you are ready to save your research locally.</span>
              <Button disabled={isSaving} onClick={beginCreate} size="sm" type="button">
                Create first thesis
              </Button>
            </BoardState>
          ) : null}

          {loadState === 'loaded' && theses.length > 0 ? (
            <div className="living-thesis-list" role="list">
              {visibleTheses.map((thesis) => (
                <button
                  aria-pressed={thesis.id === selectedId}
                  className={`living-thesis-list-item${thesis.id === selectedId ? ' living-thesis-list-item--selected' : ''}`}
                  disabled={isSaving}
                  key={thesis.id}
                  onClick={() => selectThesis(thesis)}
                  type="button"
                >
                  <span className="living-thesis-list-heading">
                    <strong>{thesis.entityName}</strong>
                    <Badge variant={getLifecycleBadge(thesis.lifecycle)}>
                      {lifecycleLabels[thesis.lifecycle]}
                    </Badge>
                  </span>
                  <span>{thesis.title}</span>
                  <small>
                    {thesis.ticker ?? 'No ticker'}{thesis.theme ? ` / ${thesis.theme}` : ''}
                  </small>
                  <span className="living-thesis-list-meta">
                    <small>Version {thesis.version}</small>
                    <small>Next review {thesis.nextReviewAt ?? 'not scheduled'}</small>
                  </span>
                </button>
              ))}

              {visibleTheses.length === 0 ? (
                <BoardState title="No records match this lifecycle.">
                  Choose another lifecycle filter.
                </BoardState>
              ) : null}
            </div>
          ) : null}
        </Card>

        {(isCreating || selectedThesis) && loadState !== 'error' ? (
          <LivingThesisEditor
            draft={draft}
            formRef={editorFormRef}
            isCreating={isCreating}
            isDirty={isDirty}
            isSaving={isSaving}
            onCancel={cancelEditing}
            onChange={updateDraft}
            onSubmit={saveDraft}
          />
        ) : (
          <Card className="living-thesis-editor-card" title="Thesis details">
            <BoardState title="Select or create a Living Thesis.">
              Saved research details will appear here.
            </BoardState>
          </Card>
        )}
      </div>

      {navigationRequest && (isDirty || isSaving) ? (
        <UnsavedThesisDialog
          destination={navigationRequest.destination}
          feedback={feedback}
          isSaving={isSaving}
          onDiscard={navigationRequest.onLeave}
          onSave={saveDraft}
          onStay={navigationRequest.onStay}
        />
      ) : null}
    </div>
  );
}

function UnsavedThesisDialog({ destination, feedback, isSaving, onDiscard, onSave, onStay }: {
  destination: string;
  feedback: BoardFeedback | null;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => Promise<void>;
  onStay: () => void;
}): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    continueRef.current?.focus();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  const errors = feedback && 'messages' in feedback ? feedback.messages : [];

  return (
    <dialog
      aria-describedby="unsaved-thesis-description"
      aria-labelledby="unsaved-thesis-title"
      className="living-thesis-leave-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onStay();
      }}
      ref={dialogRef}
    >
      <h2 id="unsaved-thesis-title">Unsaved thesis changes</h2>
      <p id="unsaved-thesis-description">
        Save your changes before opening {destination}, or discard them and leave.
      </p>
      {isSaving ? <p role="status">Saving your thesis. Please wait...</p> : null}
      {errors.length > 0 ? (
        <div className="living-thesis-feedback living-thesis-feedback--error" role="alert">
          {errors.map((message) => <span key={message}>{message}</span>)}
        </div>
      ) : null}
      <div className="living-thesis-leave-actions">
        <Button disabled={isSaving} onClick={() => void onSave()} type="button">
          {isSaving ? 'Saving...' : 'Save and leave'}
        </Button>
        <Button disabled={isSaving} onClick={onDiscard} type="button" variant="secondary">
          Discard and leave
        </Button>
        <button className="living-thesis-continue" disabled={isSaving} onClick={onStay} ref={continueRef} type="button">
          Continue editing
        </button>
      </div>
    </dialog>
  );
}

function LivingThesisEditor({ draft, formRef, isCreating, isDirty, isSaving, onCancel, onChange, onSubmit }: {
  draft: BoardDraft;
  formRef: RefObject<HTMLFormElement>;
  isCreating: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: <K extends keyof BoardDraft>(field: K, value: BoardDraft[K]) => void;
  onSubmit: () => Promise<void>;
}): JSX.Element {
  return (
    <Card className="living-thesis-editor-card" title={isCreating ? 'Create Living Thesis' : 'Thesis details'}>
      <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void onSubmit(); }}>
        <fieldset className="living-thesis-form" disabled={isSaving}>
          <div className="living-thesis-form-heading">
            <div>
              <span>{isCreating ? 'New local record' : `Version ${draft.version}`}</span>
              <strong>{draft.entityName || 'Untitled entity'}</strong>
            </div>
            {isDirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
          </div>

          <div className="living-thesis-field-grid">
            <TextField label="Entity name" onChange={(value) => onChange('entityName', value)} required value={draft.entityName} />
            <TextField label="Ticker (optional)" onChange={(value) => onChange('ticker', value)} value={draft.ticker} />
            <TextField label="Thesis title" onChange={(value) => onChange('title', value)} required value={draft.title} />
            <TextField label="Theme (optional)" onChange={(value) => onChange('theme', value)} value={draft.theme} />
            <SelectField label="Lifecycle" onChange={(value) => onChange('lifecycle', value as LivingThesisLifecycle)} options={LIVING_THESIS_LIFECYCLES.map((value) => ({ label: lifecycleLabels[value], value }))} value={draft.lifecycle} />
            <SelectField label="Conviction" onChange={(value) => onChange('conviction', value as LivingThesisConviction)} options={LIVING_THESIS_CONVICTIONS.map((value) => ({ label: convictionLabels[value], value }))} value={draft.conviction} />
            <SelectField label="Risk level" onChange={(value) => onChange('riskLevel', value as LivingThesisRiskLevel)} options={LIVING_THESIS_RISK_LEVELS.map((value) => ({ label: riskLevelLabels[value], value }))} value={draft.riskLevel} />
            <TextField label="Review cadence (days)" min="1" onChange={(value) => onChange('reviewCadenceDays', value)} type="number" value={draft.reviewCadenceDays} />
            <TextField label="Next review" onChange={(value) => onChange('nextReviewAt', value)} type="date" value={draft.nextReviewAt} />
          </div>

          <TextAreaField label="Thesis summary" onChange={(value) => onChange('summary', value)} required value={draft.summary} />
          <div className="living-thesis-case-grid">
            <TextAreaField label="Bull case (optional)" onChange={(value) => onChange('bullCase', value)} value={draft.bullCase} />
            <TextAreaField label="Bear case (optional)" onChange={(value) => onChange('bearCase', value)} value={draft.bearCase} />
          </div>

          <RiskEditor onChange={(risks) => onChange('risks', risks)} risks={draft.risks} />
          <CatalystEditor catalysts={draft.catalysts} onChange={(catalysts) => onChange('catalysts', catalysts)} />

          <div className="living-thesis-form-actions">
            <Button disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : isCreating ? 'Create thesis' : 'Save changes'}
            </Button>
            <Button onClick={onCancel} type="button" variant="secondary">Cancel</Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}

function RiskEditor({ onChange, risks }: {
  onChange: (risks: LivingThesisRiskWriteInput[]) => void;
  risks: LivingThesisRiskWriteInput[];
}): JSX.Element {
  return (
    <section className="living-thesis-children">
      <SectionHeading label="Risks" onAdd={() => onChange([...risks, { severity: 'unrated', status: 'open', title: '' }])} />
      {risks.length === 0 ? <p className="living-thesis-child-empty">No structured risks recorded.</p> : risks.map((risk, index) => (
        <div className="living-thesis-child-row" key={risk.id ?? `new-risk-${index}`}>
          <TextField label={`Risk ${index + 1}`} onChange={(value) => onChange(updateAt(risks, index, { ...risk, title: value }))} required value={risk.title} />
          <TextField label="Detail (optional)" onChange={(value) => onChange(updateAt(risks, index, { ...risk, detail: value }))} value={risk.detail ?? ''} />
          <SelectField label="Severity" onChange={(value) => onChange(updateAt(risks, index, { ...risk, severity: value as LivingThesisRiskLevel }))} options={LIVING_THESIS_RISK_LEVELS.map((value) => ({ label: riskLevelLabels[value], value }))} value={risk.severity} />
          <SelectField label="Status" onChange={(value) => onChange(updateAt(risks, index, { ...risk, status: value as LivingThesisRiskStatus }))} options={LIVING_THESIS_RISK_STATUSES.map((value) => ({ label: riskStatusLabels[value], value }))} value={risk.status} />
          {risk.status !== 'retired' ? <Button onClick={() => onChange(updateAt(risks, index, { ...risk, status: 'retired' }))} size="sm" type="button" variant="ghost">Retire</Button> : null}
        </div>
      ))}
    </section>
  );
}

function CatalystEditor({ catalysts, onChange }: {
  catalysts: LivingThesisCatalystWriteInput[];
  onChange: (catalysts: LivingThesisCatalystWriteInput[]) => void;
}): JSX.Element {
  return (
    <section className="living-thesis-children">
      <SectionHeading label="Catalysts" onAdd={() => onChange([...catalysts, { status: 'open', title: '' }])} />
      {catalysts.length === 0 ? <p className="living-thesis-child-empty">No structured catalysts recorded.</p> : catalysts.map((catalyst, index) => (
        <div className="living-thesis-child-row living-thesis-child-row--catalyst" key={catalyst.id ?? `new-catalyst-${index}`}>
          <TextField label={`Catalyst ${index + 1}`} onChange={(value) => onChange(updateAt(catalysts, index, { ...catalyst, title: value }))} required value={catalyst.title} />
          <TextField label="Detail (optional)" onChange={(value) => onChange(updateAt(catalysts, index, { ...catalyst, detail: value }))} value={catalyst.detail ?? ''} />
          <SelectField label="Status" onChange={(value) => onChange(updateAt(catalysts, index, { ...catalyst, status: value as LivingThesisCatalystStatus }))} options={LIVING_THESIS_CATALYST_STATUSES.map((value) => ({ label: catalystStatusLabels[value], value }))} value={catalyst.status} />
          {catalyst.status !== 'retired' ? <Button onClick={() => onChange(updateAt(catalysts, index, { ...catalyst, status: 'retired' }))} size="sm" type="button" variant="ghost">Retire</Button> : null}
        </div>
      ))}
    </section>
  );
}

function SectionHeading({ label, onAdd }: { label: string; onAdd: () => void }): JSX.Element {
  return (
    <div className="living-thesis-section-heading">
      <div><span>Structured research</span><h3>{label}</h3></div>
      <Button onClick={onAdd} size="sm" type="button" variant="secondary">Add {label.slice(0, -1).toLowerCase()}</Button>
    </div>
  );
}

function BoardFeedbackPanel({ feedback, onReload }: { feedback: BoardFeedback; onReload?: () => Promise<void> }): JSX.Element {
  const isError = feedback.type === 'conflict' || feedback.type === 'error';
  return (
    <div className={`living-thesis-feedback living-thesis-feedback--${feedback.type}`} role={isError ? 'alert' : 'status'}>
      <strong>{feedback.type === 'conflict' ? 'This thesis changed in another window.' : feedback.type === 'error' ? 'The Living Thesis action could not be completed.' : feedback.type === 'warning' ? 'Unsaved changes are still open.' : 'Saved locally'}</strong>
      {'messages' in feedback ? feedback.messages.map((message) => <span key={message}>{message}</span>) : <span>{feedback.message}</span>}
      {feedback.type === 'conflict' ? <span>Reloading will replace the unsaved edits shown here.</span> : null}
      {feedback.type === 'conflict' && onReload ? <Button onClick={() => void onReload()} size="sm" type="button" variant="secondary">Reload saved version</Button> : null}
    </div>
  );
}

function BoardState({ alert = false, children, empty = false, title }: { alert?: boolean; children: ReactNode; empty?: boolean; title: string }): JSX.Element {
  return <div className={`living-thesis-state${empty ? ' living-thesis-state--empty' : ''}`} role={alert ? 'alert' : 'status'}><strong>{title}</strong><div className="living-thesis-state-copy">{children}</div></div>;
}

function TextField({ label, onChange, required = false, type = 'text', value, ...inputProps }: { label: string; onChange: (value: string) => void; required?: boolean; type?: 'date' | 'number' | 'text'; value: string; min?: string }): JSX.Element {
  return <label className="living-thesis-field"><span>{label}</span><input {...inputProps} aria-label={label} onChange={(event) => onChange(event.currentTarget.value)} required={required} type={type} value={value} /></label>;
}

function TextAreaField({ label, onChange, required = false, value }: { label: string; onChange: (value: string) => void; required?: boolean; value: string }): JSX.Element {
  return <label className="living-thesis-field living-thesis-field--wide"><span>{label}</span><textarea aria-label={label} onChange={(event) => onChange(event.currentTarget.value)} required={required} rows={4} value={value} /></label>;
}

function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: readonly { label: string; value: string }[]; value: string }): JSX.Element {
  return <label className="living-thesis-field"><span>{label}</span><select aria-label={label} onChange={(event) => onChange(event.currentTarget.value)} value={value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function filterTheses(theses: readonly LivingThesis[], filter: BoardFilter): LivingThesis[] {
  return filter === 'all' ? [...theses] : theses.filter((thesis) => thesis.lifecycle === filter);
}

function sortTheses(theses: readonly LivingThesis[], sort: BoardSort): LivingThesis[] {
  return [...theses].sort((first, second) => {
    if (sort === 'entity') return first.entityName.localeCompare(second.entityName) || first.id.localeCompare(second.id);
    if (sort === 'next-review') return (first.nextReviewAt ?? '9999-12-31').localeCompare(second.nextReviewAt ?? '9999-12-31') || first.id.localeCompare(second.id);
    return second.updatedAt.localeCompare(first.updatedAt) || first.id.localeCompare(second.id);
  });
}

function upsertThesis(theses: readonly LivingThesis[], saved: LivingThesis): LivingThesis[] {
  return theses.some((thesis) => thesis.id === saved.id) ? theses.map((thesis) => thesis.id === saved.id ? saved : thesis) : [saved, ...theses];
}

function updateAt<T>(items: readonly T[], index: number, value: T): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? value : item);
}

function getLifecycleBadge(lifecycle: LivingThesisLifecycle): 'accent' | 'neutral' | 'success' | 'warning' {
  if (lifecycle === 'active') return 'success';
  if (lifecycle === 'monitoring') return 'accent';
  if (lifecycle === 'paused') return 'warning';
  return 'neutral';
}
