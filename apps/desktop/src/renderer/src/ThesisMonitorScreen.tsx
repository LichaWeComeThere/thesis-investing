import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  buildThesisNoteFromForm,
  createEmptyThesisNoteForm,
  ensureThesisNoteFormHasAvailableId,
  getNextThesisNoteNumber,
  hasThesisFormContent,
  thesisNoteToForm,
  THESIS_CONVICTION_OPTIONS,
  THESIS_STATUS_OPTIONS,
  upsertLocalThesisNote,
  type LocalThesisNote,
  type ThesisNoteFormState
} from './thesisMonitorInput';
import {
  getDefaultThesisNotesStorageClient,
  toPersistedThesisNote,
  type ThesisNotesStorageClient
} from './thesisNotesStorageClient';

type ThesisMonitorScreenProps = {
  initialForm?: ThesisNoteFormState;
  initialNotes?: LocalThesisNote[];
  initialStorageErrors?: string[];
  initialSelectedNoteId?: string;
  storageClient?: ThesisNotesStorageClient | null;
};

const statusLabels: Record<LocalThesisNote['status'], string> = {
  active: 'Active',
  broken: 'Broken',
  challenged: 'Challenged',
  closed: 'Closed',
  draft: 'Draft',
  watch: 'Watch'
};

const convictionLabels: Record<
  NonNullable<LocalThesisNote['conviction']>,
  string
> = {
  high: 'High',
  low: 'Low',
  medium: 'Medium'
};

type DemoThesisQueueItem = {
  id: string;
  ticker: string;
  title: string;
  status: LocalThesisNote['status'];
  statusLabel?: string;
  score: number;
  reviewLabel: string;
};

const demoThesisQueueItems: DemoThesisQueueItem[] = [
  {
    id: 'demo-nvda',
    ticker: 'NVDA',
    title: 'AI infrastructure leadership',
    status: 'active',
    score: 79,
    reviewLabel: 'Due soon'
  },
  {
    id: 'demo-crwd',
    ticker: 'CRWD',
    title: 'Cybersecurity resilience',
    status: 'watch',
    score: 68,
    reviewLabel: 'Draft'
  },
  {
    id: 'demo-msft',
    ticker: 'MSFT',
    title: 'Cloud and AI platform strength',
    status: 'active',
    score: 82,
    reviewLabel: 'Reviewed'
  },
  {
    id: 'demo-tsla',
    ticker: 'TSLA',
    title: 'Margin pressure thesis',
    status: 'challenged',
    statusLabel: 'Caution',
    score: 52,
    reviewLabel: 'Needs review'
  }
];

function statusBadgeVariant(
  status: LocalThesisNote['status']
): 'accent' | 'neutral' | 'success' | 'warning' | 'risk' {
  switch (status) {
    case 'active':
      return 'success';
    case 'watch':
      return 'accent';
    case 'draft':
    case 'challenged':
      return 'warning';
    case 'broken':
      return 'risk';
    case 'closed':
      return 'neutral';
  }
}

function scoreForNote(note: LocalThesisNote): number | null {
  if (note.conviction === 'high') {
    return 82;
  }

  if (note.conviction === 'medium') {
    return 68;
  }

  if (note.conviction === 'low') {
    return 54;
  }

  return null;
}

function reviewLabelForNote(note: LocalThesisNote): string {
  if (note.reviewDueAt) {
    return `Review ${note.reviewDueAt}`;
  }

  if (note.status === 'draft') {
    return 'Draft';
  }

  return 'No review date';
}

export function ThesisMonitorScreen({
  initialForm,
  initialNotes = [],
  initialStorageErrors = [],
  storageClient,
  initialSelectedNoteId
}: ThesisMonitorScreenProps): JSX.Element {
  const resolvedStorageClient =
    storageClient === undefined
      ? getDefaultThesisNotesStorageClient()
      : storageClient;
  const [notes, setNotes] = useState<LocalThesisNote[]>(() =>
    initialNotes.map((note) => ({ ...note }))
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    initialSelectedNoteId ?? initialNotes[0]?.id ?? null
  );
  const [selectedDemoQueueId, setSelectedDemoQueueId] = useState(
    demoThesisQueueItems[0].id
  );
  const [nextNoteNumber, setNextNoteNumber] = useState(() =>
    getNextThesisNoteNumber(initialNotes)
  );
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [storageErrors, setStorageErrors] = useState(initialStorageErrors);
  const [isLoading, setIsLoading] = useState(Boolean(resolvedStorageClient));
  const [isWriting, setIsWriting] = useState(false);
  const [form, setForm] = useState<ThesisNoteFormState>(() =>
    initialForm
      ? { ...initialForm }
      : createEmptyThesisNoteForm(initialNotes.length + 1)
  );

  const formResult = useMemo(() => buildThesisNoteFromForm(form), [form]);
  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );
  const notesWithReviewDates = notes.filter((note) => note.reviewDueAt).length;
  const activeNoteCount = notes.filter(
    (note) => note.status === 'active' || note.status === 'watch'
  ).length;
  const hasLocalNotes = notes.length > 0;
  const selectedDemoQueueItem =
    demoThesisQueueItems.find((item) => item.id === selectedDemoQueueId) ??
    demoThesisQueueItems[0];
  const selectedNoteScore = selectedNote ? scoreForNote(selectedNote) : null;
  const shouldShowValidation =
    saveAttempted || (hasThesisFormContent(form) && !formResult.validation.valid);
  const visibleValidationErrors = shouldShowValidation
    ? formResult.validation.errors
    : [];

  useEffect(() => {
    const client = resolvedStorageClient;

    if (!client) {
      setIsLoading(false);
      return;
    }

    const activeClient = client;
    let isMounted = true;

    async function loadPersistedNotes(): Promise<void> {
      setIsLoading(true);
      setStorageErrors([]);

      try {
        const result = await activeClient.list();

        if (!isMounted) {
          return;
        }

        if (!result.ok) {
          setStorageErrors(result.errors);
          return;
        }

        const persistedNotes = result.value.map((note) => ({ ...note }));
        const nextAvailableNoteNumber =
          getNextThesisNoteNumber(persistedNotes);

        setNotes(persistedNotes);
        setSelectedNoteId((currentSelectedNoteId) => {
          if (
            currentSelectedNoteId &&
            persistedNotes.some((note) => note.id === currentSelectedNoteId)
          ) {
            return currentSelectedNoteId;
          }

          return persistedNotes[0]?.id ?? null;
        });
        setNextNoteNumber(nextAvailableNoteNumber);

        if (!initialForm) {
          setForm((currentForm) =>
            ensureThesisNoteFormHasAvailableId(
              currentForm,
              persistedNotes,
              nextAvailableNoteNumber
            )
          );
        }
      } catch (error) {
        if (isMounted) {
          setStorageErrors([
            error instanceof Error
              ? error.message
              : 'Unable to load persisted thesis notes.'
          ]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPersistedNotes();

    return () => {
      isMounted = false;
    };
  }, [initialForm, resolvedStorageClient]);

  function updateForm<Field extends keyof Omit<ThesisNoteFormState, 'id'>>(
    field: Field,
    value: ThesisNoteFormState[Field]
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  async function saveNote(): Promise<void> {
    setSaveAttempted(true);
    setStorageErrors([]);

    if (!formResult.validation.valid) {
      return;
    }

    const nextNote = formResult.note;
    const isNewNote = !notes.some((note) => note.id === nextNote.id);

    if (resolvedStorageClient) {
      setIsWriting(true);

      try {
        const result = await resolvedStorageClient.save(
          toPersistedThesisNote(nextNote)
        );

        if (!result.ok) {
          setStorageErrors(result.errors);
          return;
        }

        nextNote.body = result.value.body;
        nextNote.conviction = result.value.conviction;
        nextNote.createdAt = result.value.createdAt;
        nextNote.reviewDueAt = result.value.reviewDueAt;
        nextNote.status = result.value.status;
        nextNote.ticker = result.value.ticker;
        nextNote.title = result.value.title;
        nextNote.updatedAt = result.value.updatedAt;
      } catch (error) {
        setStorageErrors([
          error instanceof Error ? error.message : 'Unable to save thesis note.'
        ]);
        return;
      } finally {
        setIsWriting(false);
      }
    }

    const updatedNotes = upsertLocalThesisNote(notes, nextNote);

    setNotes(updatedNotes);
    setSelectedNoteId(nextNote.id);
    setForm(thesisNoteToForm(nextNote));
    setSaveAttempted(false);

    if (isNewNote) {
      setNextNoteNumber(
        getNextThesisNoteNumber(updatedNotes, nextNoteNumber + 1)
      );
    }
  }

  function startNewNote(): void {
    setForm(createEmptyThesisNoteForm(nextNoteNumber));
    setSelectedNoteId(null);
    setSaveAttempted(false);
  }

  function selectNote(note: LocalThesisNote): void {
    setSelectedNoteId(note.id);
    setForm(thesisNoteToForm(note));
    setSaveAttempted(false);
  }

  return (
    <div className="thesis-monitor-screen">
      <PageHeader
        badge={<Badge variant="accent">User-authored notes</Badge>}
        description="Record the original thesis behind a holding or idea. Thesis status is controlled by the user; this screen is educational and non-advisory."
        eyebrow="Phase 1 Thesis Monitor"
        title="Thesis Monitor"
      />

      <div className="thesis-workspace-grid">
        <aside className="thesis-queue-rail" aria-label="Thesis Queue">
          <div className="thesis-queue-header">
            <div>
              <h2>Thesis Queue</h2>
              <p>Review, rank, and update stock theses</p>
            </div>
            <Button
              disabled={isWriting || isLoading}
              onClick={startNewNote}
              type="button"
              variant="secondary"
            >
              + New Thesis
            </Button>
          </div>

          <div className="thesis-queue-list" role="list">
            {isLoading ? (
              <p>Loading persisted thesis notes...</p>
            ) : hasLocalNotes
              ? notes.map((note) => {
                  const score = scoreForNote(note);
                  const isSelected = note.id === selectedNoteId;

                  return (
                    <button
                      aria-current={isSelected ? 'true' : undefined}
                      className="thesis-queue-card"
                      disabled={isWriting}
                      key={note.id}
                      onClick={() => selectNote(note)}
                      role="listitem"
                      type="button"
                    >
                      <span className="thesis-queue-card-topline">
                        <strong>{note.ticker ?? 'NOTE'}</strong>
                        <Badge variant={statusBadgeVariant(note.status)}>
                          {statusLabels[note.status]}
                        </Badge>
                      </span>
                      <span className="thesis-queue-title">{note.title}</span>
                      <span className="thesis-queue-meta">
                        <small>{reviewLabelForNote(note)}</small>
                        {score ? <small>Score {score}</small> : null}
                      </span>
                      <span className="thesis-queue-open">Open</span>
                    </button>
                  );
                })
              : demoThesisQueueItems.map((item) => {
                  const isSelected = item.id === selectedDemoQueueId;

                  return (
                    <button
                      aria-current={isSelected ? 'true' : undefined}
                      className="thesis-queue-card thesis-queue-card--demo"
                      disabled={isWriting}
                      key={item.id}
                      onClick={() => setSelectedDemoQueueId(item.id)}
                      role="listitem"
                      type="button"
                    >
                      <span className="thesis-queue-card-topline">
                        <strong>{item.ticker}</strong>
                        <Badge variant={statusBadgeVariant(item.status)}>
                          {item.statusLabel ?? statusLabels[item.status]}
                        </Badge>
                      </span>
                      <span className="thesis-queue-title">{item.title}</span>
                      <span className="thesis-queue-meta">
                        <small>{item.reviewLabel}</small>
                        <small>Score {item.score}</small>
                      </span>
                      <span className="thesis-queue-open">Preview</span>
                    </button>
                  );
                })}
          </div>

          <div className="thesis-queue-workflow">
            <h3>Review workflow</h3>
            <div>
              <span>Draft</span>
              <span>Active</span>
              <span>Watch</span>
              <span>Broken</span>
            </div>
          </div>
        </aside>

        <Card className="thesis-form-card" title="Create or edit thesis note">
          <div className="thesis-monitor-disclaimer">
            Notes are manually authored by the user. No live data, automated news
            monitoring, AI commentary, brokerage connection, sync, or trading
            execution is used. Title, ticker, body, status, conviction, and
            review due date are stored locally on this device; checklist text is
            kept only in this current app session for now.
          </div>

          <div className="thesis-form-grid">
            <label className="thesis-field">
              <span>Title</span>
              <input
                aria-label="Thesis title"
                onChange={(event) => updateForm('title', event.currentTarget.value)}
                placeholder="Why this business belongs on the research list"
                type="text"
                value={form.title}
              />
            </label>

            <label className="thesis-field">
              <span>Ticker</span>
              <input
                aria-label="Thesis ticker"
                onChange={(event) => updateForm('ticker', event.currentTarget.value)}
                placeholder="Optional"
                type="text"
                value={form.ticker}
              />
            </label>

            <label className="thesis-field">
              <span>Status</span>
              <select
                aria-label="Thesis status"
                onChange={(event) =>
                  updateForm(
                    'status',
                    event.currentTarget.value as ThesisNoteFormState['status']
                  )
                }
                value={form.status}
              >
                {THESIS_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="thesis-field">
              <span>Conviction</span>
              <select
                aria-label="Thesis conviction"
                onChange={(event) =>
                  updateForm(
                    'conviction',
                    event.currentTarget.value as ThesisNoteFormState['conviction']
                  )
                }
                value={form.conviction}
              >
                <option value="">Not set</option>
                {THESIS_CONVICTION_OPTIONS.map((conviction) => (
                  <option key={conviction} value={conviction}>
                    {convictionLabels[conviction]}
                  </option>
                ))}
              </select>
            </label>

            <label className="thesis-field">
              <span>Review due date</span>
              <input
                aria-label="Thesis review due date"
                onChange={(event) =>
                  updateForm('reviewDueAt', event.currentTarget.value)
                }
                placeholder="YYYY-MM-DD"
                type="text"
                value={form.reviewDueAt}
              />
            </label>
          </div>

          <label className="thesis-field thesis-body-field">
            <span>Thesis body</span>
            <textarea
              aria-label="Thesis body"
              onChange={(event) => updateForm('body', event.currentTarget.value)}
              placeholder="Write the user-authored thesis, key assumptions, and what would challenge it."
              rows={6}
              value={form.body}
            />
          </label>

          <label className="thesis-field thesis-body-field">
            <span>Optional review checklist</span>
            <textarea
              aria-label="Thesis checklist"
              onChange={(event) => updateForm('checklist', event.currentTarget.value)}
              placeholder="Manual checklist items to revisit later."
              rows={4}
              value={form.checklist}
            />
          </label>

          {visibleValidationErrors.length > 0 ? (
            <div className="thesis-validation" role="alert">
              <h3>Validation</h3>
              <ul>
                {visibleValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {storageErrors.length > 0 ? (
            <div className="thesis-validation" role="alert">
              <h3>Storage</h3>
              <ul>
                {storageErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="thesis-actions">
            <Button disabled={isWriting || isLoading} onClick={saveNote} type="button">
              {isWriting ? 'Saving...' : 'Save note'}
            </Button>
            <Button
              disabled={isWriting || isLoading}
              onClick={startNewNote}
              type="button"
              variant="secondary"
            >
              New note
            </Button>
          </div>
        </Card>

        <Card className="thesis-health-card" emphasis title="Thesis health">
          <div className="thesis-health-hero">
            <span>Local notes</span>
            <strong>{notes.length}</strong>
            <Badge variant={activeNoteCount > 0 ? 'accent' : 'neutral'}>
              {activeNoteCount} active/watch
            </Badge>
          </div>

          <div className="thesis-health-grid">
            <div>
              <span>With review date</span>
              <strong>{notesWithReviewDates}</strong>
            </div>
            <div>
              <span>Selected status</span>
              <strong>
                {selectedNote ? statusLabels[selectedNote.status] : 'None'}
              </strong>
            </div>
          </div>

          <div className="thesis-next-action">
            <h3>Next action</h3>
            <p>
              {selectedNote
                ? 'Review the selected thesis detail card below or update the manual checklist.'
                : 'Save or select a thesis note to populate the selected snapshot.'}
            </p>
          </div>

          <div className="thesis-selected-snapshot">
            <h3>Selected thesis snapshot</h3>
            {selectedNote ? (
              <article className="thesis-details thesis-details--compact">
                <div className="thesis-details-header">
                  <div>
                    <p className="thesis-details-eyebrow">
                      {selectedNote.ticker ?? 'No ticker'}
                    </p>
                    <h3>{selectedNote.title}</h3>
                  </div>
                  <Badge variant={statusBadgeVariant(selectedNote.status)}>
                    {statusLabels[selectedNote.status]}
                  </Badge>
                </div>

                <dl className="thesis-meta-grid">
                  <div>
                    <dt>Score</dt>
                    <dd>{selectedNoteScore ?? 'Not set'}</dd>
                  </div>
                  <div>
                    <dt>Review due</dt>
                    <dd>{selectedNote.reviewDueAt ?? 'Not set'}</dd>
                  </div>
                </dl>

                <div className="thesis-detail-section">
                  <h4>Preview</h4>
                  <p>{selectedNote.body}</p>
                </div>

                {selectedNote.checklist ? (
                  <div className="thesis-detail-section">
                    <h4>Review checklist</h4>
                    <p>{selectedNote.checklist}</p>
                  </div>
                ) : null}
              </article>
            ) : (
              <article className="thesis-details thesis-details--compact">
                <div className="thesis-details-header">
                  <div>
                    <p className="thesis-details-eyebrow">
                      {selectedDemoQueueItem.ticker}
                    </p>
                    <h3>{selectedDemoQueueItem.title}</h3>
                  </div>
                  <Badge variant={statusBadgeVariant(selectedDemoQueueItem.status)}>
                    {selectedDemoQueueItem.statusLabel ??
                      statusLabels[selectedDemoQueueItem.status]}
                  </Badge>
                </div>

                <dl className="thesis-meta-grid">
                  <div>
                    <dt>Score</dt>
                    <dd>{selectedDemoQueueItem.score}</dd>
                  </div>
                  <div>
                    <dt>Review</dt>
                    <dd>{selectedDemoQueueItem.reviewLabel}</dd>
                  </div>
                </dl>

                <div className="thesis-detail-section">
                  <h4>Preview</h4>
                  <p>Select a saved thesis to load it into the editor.</p>
                </div>
              </article>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
