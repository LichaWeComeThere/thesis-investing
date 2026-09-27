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
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ReviewSessionLauncher } from './ReviewSessionLauncher';
import { ReviewSessionScreen } from './ReviewSessionScreen';
import { getDefaultReviewSessionsStorageClient } from './reviewSessionsStorageClient';
import type { ResumedReviewSession, ReviewSessionsStorageApi } from '../../shared/reviewSessionsStorage';
import type { DecisionsStorageApi } from '../../shared/decisionsStorage';
import { DecisionLogPanel, type DecisionNavigationRequest } from './DecisionLogPanel';
import { getDefaultDecisionsStorageClient } from './decisionsStorageClient';
import type { ThesisHistoryStorageApi } from '../../shared/thesisHistoryStorage';
import { getDefaultThesisHistoryStorageClient } from './thesisHistoryStorageClient';
import { ThesisHistoryPanel } from './ThesisHistoryPanel';
import './thesis-workspace.css';

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

/** One navigation request, consumed when this workspace mounts. */
export type ThesisOpenTarget = { thesisId: string; reviewSessionId?: string; view?: 'history' };

type ThesisBoardScreenProps = {
  initialTarget?: ThesisOpenTarget;
  initialCreate?: boolean;
  onBrowseLibrary?: () => void;
  onSelectedThesisChange?: (thesisId: string) => void;
  historyClient?: ThesisHistoryStorageApi | null;
  decisionClient?: DecisionsStorageApi | null;
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
  decisionClient = getDefaultDecisionsStorageClient(),
  historyClient = getDefaultThesisHistoryStorageClient(),
  initialFeedback = null,
  initialLoadState,
  initialTheses,
  initialTarget,
  initialCreate = false,
  onBrowseLibrary,
  onSelectedThesisChange,
  navigationRequest
}: ThesisBoardScreenProps): JSX.Element {
  const [review, setReview] = useState<ResumedReviewSession | null>(null);
  const [theses, setTheses] = useState<LivingThesis[]>(initialTheses ?? []);
  const [loadState, setLoadState] = useState<BoardLoadState>(
    initialLoadState ?? (initialTheses ? 'loaded' : 'loading')
  );
  const [selectedId, setSelectedId] = useState(initialCreate ? '' : initialTheses?.[0]?.id ?? '');
  const [draft, setDraft] = useState<BoardDraft>(() =>
    !initialCreate && initialTheses?.[0] ? thesisToDraft(initialTheses[0]) : emptyDraft
  );
  const [isCreating, setIsCreating] = useState(initialCreate);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [decisionGuarded, setDecisionGuarded] = useState(false);
  const [reviewOpening, setReviewOpening] = useState(false);
  const [decisionNavigation, setDecisionNavigation] = useState<DecisionNavigationRequest>();
  const [feedback, setFeedback] = useState<BoardFeedback | null>(initialFeedback);
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<BoardSort>('recently-updated');
  const editorFormRef = useRef<HTMLFormElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const identityHeadingRef = useRef<HTMLHeadingElement>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement>(null);
  const newThesisActionRef = useRef<HTMLSpanElement>(null);
  const historyHeadingId = useId();
  const [focusTarget, setFocusTarget] = useState<'company' | 'identity' | 'history' | 'new' | null>(null);
  const entryTargetRef = useRef(initialTarget);
  const entryCreateRef = useRef(initialCreate);
  const loadSequence = useRef(0);

  useEffect(() => {
    if (selectedId) onSelectedThesisChange?.(selectedId);
  }, [selectedId, onSelectedThesisChange]);

  useEffect(() => {
    if (!focusTarget || review) return;
    const target = focusTarget === 'company' ? companyInputRef.current
      : focusTarget === 'identity' ? identityHeadingRef.current
      : focusTarget === 'history' ? historyHeadingRef.current : newThesisActionRef.current?.querySelector('button');
    target?.focus();
    if (focusTarget === 'identity' || focusTarget === 'history') {
      target?.scrollIntoView?.({ block: 'start' });
    }
    setFocusTarget(null);
  }, [focusTarget, review]);

  useEffect(() => {
    if (navigationRequest && !review && !isDirty && !isSaving && !decisionGuarded && !reviewOpening) {
      navigationRequest.onLeave();
    }
  }, [isDirty, isSaving, navigationRequest, review, decisionGuarded, reviewOpening]);

  useEffect(() => {
    if (decisionNavigation && !decisionGuarded && !review) {
      setDecisionNavigation(undefined);
      decisionNavigation.onLeave();
    }
  }, [decisionNavigation, decisionGuarded, review]);

  const loadTheses = useCallback(async (preferredId = ''): Promise<void> => {
    const sequence = ++loadSequence.current;
    const isCurrent = () => sequence === loadSequence.current;
    if (!client) {
      setLoadState('error');
      setFeedback({
        messages: ['Living Thesis storage is unavailable in this window.'],
        type: 'error'
      });
      return;
    }

    setLoadState('loading');
    try {
      const result = await client.list();
      if (!isCurrent()) return;
      if (!result.ok) {
        setLoadState('error');
        setFeedback({ messages: result.errors, type: 'error' });
        return;
      }
      setTheses(result.value);
      setLoadState('loaded');
      setFeedback(null);
      if (entryCreateRef.current) {
        entryCreateRef.current = false;
        setSelectedId('');
        setDraft(emptyDraft);
        setIsCreating(true);
        setFocusTarget('company');
        return;
      }
      const target = entryTargetRef.current;
      const nextSelected = target
        ? result.value.find((thesis) => thesis.id === target.thesisId)
        : result.value.find((thesis) => thesis.id === preferredId) ?? result.value[0];
      entryTargetRef.current = undefined;
      setSelectedId(nextSelected?.id ?? '');
      setDraft(nextSelected ? thesisToDraft(nextSelected) : emptyDraft);
      if (!target) return;
      if (!nextSelected) {
        setFeedback({ type: 'warning', message: 'That thesis is no longer available. Choose a saved thesis, or return to the list and refresh it.' });
        return;
      }
      setFocusTarget(target.view === 'history' ? 'history' : 'identity');
      if (!target.reviewSessionId) return;
      if (!reviewClient || nextSelected.lifecycle === 'archived' || nextSelected.lifecycle === 'paused') {
        setFeedback({ type: 'warning', message: 'This review could not be opened from Overview. Check the current thesis and its saved review below.' });
        return;
      }
      setReviewOpening(true);
      try {
        const resumed = await reviewClient.resume(target.reviewSessionId);
        if (!isCurrent()) return;
        if (!resumed.ok) {
          setFeedback({ type: 'error', messages: resumed.errors.length ? resumed.errors : ['The saved review could not be opened. Check the review below.'] });
          return;
        }
        const value = resumed.value;
        if (value.session.id !== target.reviewSessionId || value.session.thesisId !== target.thesisId ||
            value.currentThesis.id !== target.thesisId || value.session.workflow.status !== 'in_progress' ||
            value.currentThesis.lifecycle === 'archived' || value.currentThesis.lifecycle === 'paused') {
          setFeedback({ type: 'warning', message: 'The saved review has changed. Check the current thesis and its review before continuing.' });
          return;
        }
        setTheses((current) => upsertThesis(current, value.currentThesis));
        setDraft(thesisToDraft(value.currentThesis));
        setFocusTarget(null);
        setReview(value);
      } catch {
        if (isCurrent()) setFeedback({ type: 'error', messages: ['The saved review could not be opened. Check the review below and try again.'] });
      } finally {
        if (isCurrent()) setReviewOpening(false);
      }
    } catch {
      if (isCurrent()) {
        setLoadState('error');
        setFeedback({ type: 'error', messages: ['Your saved theses could not be loaded. Try again.'] });
      }
    }
  }, [client, reviewClient]);

  useEffect(() => {
    if (initialTheses !== undefined || initialLoadState !== undefined) {
      return;
    }

    void loadTheses();
    return () => { loadSequence.current += 1; };
  }, [initialLoadState, initialTheses, loadTheses]);

  const visibleTheses = useMemo(
    () => {
      const query = search.trim().toLocaleLowerCase();
      const matching = filterTheses(theses, filter).filter((thesis) =>
        !query || [thesis.entityName, thesis.ticker, thesis.title, thesis.theme].some((value) => value?.toLocaleLowerCase().includes(query))
      );
      return sortTheses(matching, sort);
    },
    [filter, search, sort, theses]
  );
  const selectedThesis = theses.find((thesis) => thesis.id === selectedId);

  function selectThesis(thesis: LivingThesis): void {
    if (isSaving || reviewOpening) return;
    if (thesis.id === selectedId && !isCreating) { setFocusTarget('identity'); return; }
    if (decisionGuarded) {
      setDecisionNavigation({ destination: thesis.entityName, onStay: () => setDecisionNavigation(undefined), onLeave: () => {
        setDecisionNavigation(undefined); setDecisionGuarded(false);
        setSelectedId(thesis.id); setDraft(thesisToDraft(thesis)); setIsCreating(false); setFeedback(null);
        setFocusTarget('identity');
      } });
      return;
    }
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
    setFocusTarget('identity');
  }

  function beginCreate(): void {
    if (isSaving || reviewOpening || loadState !== 'loaded') return;
    if (decisionGuarded) {
      setDecisionNavigation({ destination: 'a new thesis', onStay: () => setDecisionNavigation(undefined), onLeave: () => {
        setDecisionNavigation(undefined); setDecisionGuarded(false);
        setDraft(emptyDraft); setIsCreating(true); setSelectedId(''); setFeedback(null); setSearch(''); setFilter('all');
        setFocusTarget('company');
      } });
      return;
    }
    if (isDirty) {
      setFeedback({
        message: 'Save or cancel the current changes before creating a thesis.',
        type: 'warning'
      });
      return;
    }

    setSearch('');
    setFilter('all');
    setDraft(emptyDraft);
    setIsCreating(true);
    setSelectedId('');
    setFeedback(null);
    setFocusTarget('company');
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
        setFocusTarget('identity');
      } else {
        setSelectedId('');
        setDraft(emptyDraft);
        setFocusTarget('new');
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
      if (isCreating) setFocusTarget('identity');
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
      navigationRequest={navigationRequest} onReturn={() => { setReview(null); setFocusTarget('identity'); }} onComplete={(completed) => {
        setTheses((current) => upsertThesis(current, completed.thesis));
        setDraft(thesisToDraft(completed.thesis));
        setSelectedId(completed.thesis.id);
        setIsCreating(false); setIsDirty(false);
        setFeedback({ type: 'saved', message: `Review completed. Your thesis and review history are saved.${completed.scoreSnapshot ? ' The new business score is saved too.' : ''}` });
        navigationRequest?.onStay();
        setReview(null);
        setFocusTarget('history');
      }} />;
  }

  return (
    <div className="thesis-board-screen living-thesis-board thesis-workspace">
      <PageHeader
        description="Build your investment case. Revisit it as the evidence changes."
        title="Theses"
        actions={<>
          {onBrowseLibrary ? <Button disabled={isSaving || reviewOpening} onClick={onBrowseLibrary} type="button" variant="secondary">Browse library</Button> : null}
          <span ref={newThesisActionRef}><Button disabled={isSaving || reviewOpening || loadState !== 'loaded'} onClick={beginCreate} type="button">New thesis</Button></span>
        </>}
      />

      {feedback ? (
        <BoardFeedbackPanel
          feedback={feedback}
          onReload={feedback.type === 'conflict' ? reloadAfterConflict : undefined}
        />
      ) : null}

      <div className="living-thesis-board-layout">
        <Card className="living-thesis-list-card" title="Your theses">
          <label className="thesis-workspace-search">
            <span>Search theses</span>
            <input type="search" placeholder="Company, ticker, or idea" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
          </label>
          <div className="living-thesis-list-toolbar">
            <label>
              <span>Status</span>
              <select
                aria-label="Filter by lifecycle"
                onChange={(event) => setFilter(event.currentTarget.value as BoardFilter)}
                value={filter}
              >
                <option value="all">All statuses</option>
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
                <option value="entity">Company name</option>
                <option value="next-review">Next review</option>
              </select>
            </label>
          </div>
          {loadState === 'loaded' && theses.length > 0 ? <p className="thesis-workspace-list-count">{visibleTheses.length} of {theses.length} {theses.length === 1 ? 'thesis' : 'theses'}</p> : null}

          {loadState === 'loading' ? (
            <BoardState title="Loading saved theses...">
              Reading your saved research.
            </BoardState>
          ) : null}

          {loadState === 'error' ? (
            <BoardState alert title="Your theses could not be loaded.">
              <span>Your saved data was not changed.</span>
              <Button onClick={() => void loadTheses(selectedId)} size="sm" type="button" variant="secondary">
                Try again
              </Button>
            </BoardState>
          ) : null}

          {loadState === 'loaded' && theses.length === 0 ? (
            <BoardState empty title="Your first thesis starts here">
              <span>Write down an investment idea, the evidence behind it, and what could change your mind.</span>
              <Button disabled={isSaving} onClick={beginCreate} size="sm" type="button">
                Create first thesis
              </Button>
            </BoardState>
          ) : null}

          {loadState === 'loaded' && theses.length > 0 ? (
            <div className="living-thesis-list" role="group" aria-label="Saved theses">
              {visibleTheses.map((thesis) => (
                <button
                  aria-pressed={thesis.id === selectedId}
                  className={`living-thesis-list-item${thesis.id === selectedId ? ' living-thesis-list-item--selected' : ''}`}
                  disabled={isSaving || reviewOpening}
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
                    <small>{thesis.nextReviewAt ? `Review ${thesis.nextReviewAt}` : 'No review scheduled'}</small>
                  </span>
                </button>
              ))}

              {visibleTheses.length === 0 ? (
                <BoardState title="No matching theses.">
                  Try another search or status filter.
                </BoardState>
              ) : null}
            </div>
          ) : null}
        </Card>

        {(isCreating || selectedThesis) && loadState === 'loaded' ? (
          <div className="living-thesis-detail-column">
          <header className="thesis-workspace-identity">
            <div className="thesis-workspace-identity-top">
              <span>{isCreating ? 'New thesis' : selectedThesis?.ticker || 'Investment thesis'}</span>
              {!isCreating && selectedThesis ? <Badge variant={getLifecycleBadge(selectedThesis.lifecycle)}>{lifecycleLabels[selectedThesis.lifecycle]}</Badge> : null}
            </div>
            <h2 className="thesis-workspace-focus-target" ref={identityHeadingRef} tabIndex={-1}>{isCreating ? 'What is your investment idea?' : selectedThesis?.entityName}</h2>
            <p>{isCreating ? 'Start with the essentials. Add more detail as your research grows.' : selectedThesis?.title}</p>
            <div className="thesis-workspace-identity-actions">
              <small>Your research is saved on this device.</small>
              {selectedThesis && !isCreating && loadState === 'loaded' ? <Button type="button" variant="ghost" size="sm" aria-controls={historyHeadingId} onClick={() => setFocusTarget('history')}>View history</Button> : null}
            </div>
          </header>
          {selectedThesis && !isCreating && loadState === 'loaded' ? <ReviewSessionLauncher
            key={`review-${selectedThesis.id}`} thesis={selectedThesis} client={reviewClient} disabled={isDirty || isSaving || decisionGuarded || reviewOpening} onOpen={(opened) => { setFeedback(null); setReview(opened); }} onOpeningChange={setReviewOpening}
          /> : null}
          <LivingThesisEditor
            draft={draft}
            formRef={editorFormRef}
            companyInputRef={companyInputRef}
            isCreating={isCreating}
            isDirty={isDirty}
            isSaving={isSaving}
            disabled={decisionGuarded || reviewOpening}
            onCancel={cancelEditing}
            onChange={updateDraft}
            onSubmit={saveDraft}
          />
          {selectedThesis && !isCreating && loadState === 'loaded' ? historyClient ? <ThesisHistoryPanel key={`history-${selectedThesis.id}`}
            thesisId={selectedThesis.id} thesisVersion={selectedThesis.version} entityName={selectedThesis.entityName}
            client={historyClient} decisionClient={decisionClient} disabled={isDirty || isSaving || reviewOpening}
            headingRef={historyHeadingRef} headingId={historyHeadingId}
            onGuardChange={setDecisionGuarded} navigationRequest={navigationRequest ?? decisionNavigation}
          /> : <DecisionLogPanel key={`decisions-${selectedThesis.id}`}
            thesisId={selectedThesis.id} entityName={selectedThesis.entityName} client={decisionClient}
            disabled={isDirty || isSaving || reviewOpening} onGuardChange={setDecisionGuarded}
            heading={<div><h2 className="thesis-workspace-focus-target" ref={historyHeadingRef} id={historyHeadingId} tabIndex={-1}>Decision Log</h2><p>What you decided about {selectedThesis.entityName}, and why.</p></div>}
            navigationRequest={navigationRequest ?? decisionNavigation}
          /> : null}
          </div>
        ) : (
          <Card className="living-thesis-editor-card" title="Thesis details">
            <BoardState title="Choose a thesis to get started.">
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

function LivingThesisEditor({ draft, formRef, companyInputRef, isCreating, isDirty, isSaving, disabled = false, onCancel, onChange, onSubmit }: {
  draft: BoardDraft;
  formRef: RefObject<HTMLFormElement>;
  companyInputRef: RefObject<HTMLInputElement>;
  isCreating: boolean;
  isDirty: boolean;
  isSaving: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onChange: <K extends keyof BoardDraft>(field: K, value: BoardDraft[K]) => void;
  onSubmit: () => Promise<void>;
}): JSX.Element {
  return (
    <Card className="living-thesis-editor-card" title={isCreating ? 'The essentials' : 'Your investment case'}>
      <form ref={formRef} onInvalidCapture={(event) => {
        // Reveal invalid optional fields before the browser attempts to focus them.
        const section = (event.target as HTMLElement).closest('details');
        if (section) section.open = true;
      }} onSubmit={(event) => { event.preventDefault(); void onSubmit(); }}>
        <fieldset className="living-thesis-form" disabled={isSaving || disabled}>
          <div className="thesis-workspace-form-status">
            <p>Capture the idea in your own words. Fields marked required are the starting point.</p>
            {isDirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
          </div>

          <div className="living-thesis-field-grid">
            <TextField label="Company or asset" inputRef={companyInputRef} onChange={(value) => onChange('entityName', value)} required value={draft.entityName} />
            <TextField label="Ticker (optional)" onChange={(value) => onChange('ticker', value)} value={draft.ticker} />
          </div>
          <TextField label="Thesis title" onChange={(value) => onChange('title', value)} required value={draft.title} />
          <TextAreaField label="Thesis summary" onChange={(value) => onChange('summary', value)} required value={draft.summary} />

          <details className="thesis-workspace-section">
            <summary><span>Assessment & review dates</span><small>Status, conviction, and your next check-in</small></summary>
            <div className="living-thesis-field-grid thesis-workspace-section-body">
              <SelectField label="Thesis status" onChange={(value) => onChange('lifecycle', value as LivingThesisLifecycle)} options={LIVING_THESIS_LIFECYCLES.map((value) => ({ label: lifecycleLabels[value], value }))} value={draft.lifecycle} />
              <TextField label="Theme (optional)" onChange={(value) => onChange('theme', value)} value={draft.theme} />
              <SelectField label="Conviction" onChange={(value) => onChange('conviction', value as LivingThesisConviction)} options={LIVING_THESIS_CONVICTIONS.map((value) => ({ label: convictionLabels[value], value }))} value={draft.conviction} />
              <SelectField label="Risk level" onChange={(value) => onChange('riskLevel', value as LivingThesisRiskLevel)} options={LIVING_THESIS_RISK_LEVELS.map((value) => ({ label: riskLevelLabels[value], value }))} value={draft.riskLevel} />
              <TextField label="Review cadence (days)" min="1" onChange={(value) => onChange('reviewCadenceDays', value)} type="number" value={draft.reviewCadenceDays} />
              <TextField label="Next review" onChange={(value) => onChange('nextReviewAt', value)} type="date" value={draft.nextReviewAt} />
            </div>
          </details>

          <details className="thesis-workspace-section">
            <summary><span>Supporting research</span><small>Bull case, bear case, risks, and catalysts</small></summary>
            <div className="thesis-workspace-section-body">
              <div className="living-thesis-case-grid">
                <TextAreaField label="Bull case (optional)" onChange={(value) => onChange('bullCase', value)} value={draft.bullCase} />
                <TextAreaField label="Bear case (optional)" onChange={(value) => onChange('bearCase', value)} value={draft.bearCase} />
              </div>
              <RiskEditor onChange={(risks) => onChange('risks', risks)} risks={draft.risks} />
              <CatalystEditor catalysts={draft.catalysts} onChange={(catalysts) => onChange('catalysts', catalysts)} />
            </div>
          </details>

          <div className="living-thesis-form-actions">
            <Button disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : isCreating ? 'Create thesis' : 'Save changes'}
            </Button>
            <Button onClick={onCancel} type="button" variant="secondary">Cancel</Button>
            {!isCreating ? <small>Version {draft.version}</small> : null}
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
      {risks.length === 0 ? <p className="living-thesis-child-empty">Add a risk when you identify something that could weaken your case.</p> : risks.map((risk, index) => (
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
      {catalysts.length === 0 ? <p className="living-thesis-child-empty">Add a catalyst when an event could help your thesis develop.</p> : catalysts.map((catalyst, index) => (
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
      <div><h3>{label}</h3></div>
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

function TextField({ label, inputRef, onChange, required = false, type = 'text', value, ...inputProps }: { label: string; inputRef?: RefObject<HTMLInputElement>; onChange: (value: string) => void; required?: boolean; type?: 'date' | 'number' | 'text'; value: string; min?: string }): JSX.Element {
  return <label className="living-thesis-field"><span>{label}{required ? <small className="thesis-workspace-required">Required</small> : null}</span><input {...inputProps} ref={inputRef} aria-label={label} onChange={(event) => onChange(event.currentTarget.value)} required={required} type={type} value={value} /></label>;
}

function TextAreaField({ label, onChange, required = false, value }: { label: string; onChange: (value: string) => void; required?: boolean; value: string }): JSX.Element {
  return <label className="living-thesis-field living-thesis-field--wide"><span>{label}{required ? <small className="thesis-workspace-required">Required</small> : null}</span><textarea aria-label={label} onChange={(event) => onChange(event.currentTarget.value)} required={required} rows={4} value={value} /></label>;
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
