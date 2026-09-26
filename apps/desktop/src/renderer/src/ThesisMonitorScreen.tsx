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
import { mockTheses, type MockThesis } from './data/mockTheses';

type ThesisMonitorScreenProps = {
  initialForm?: ThesisNoteFormState;
  initialNotes?: LocalThesisNote[];
  initialStorageErrors?: string[];
  initialSelectedNoteId?: string;
  storageClient?: ThesisNotesStorageClient | null;
  theses?: MockThesis[];
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

function mockThesisBadgeVariant(
  thesis: MockThesis
): 'accent' | 'neutral' | 'success' | 'warning' | 'risk' {
  if (thesis.thesisStatus === 'Strong' || thesis.thesisStatus === 'Improving') {
    return 'success';
  }

  if (
    thesis.ideaStatus === 'Needs Review' ||
    thesis.ideaStatus === 'Caution' ||
    thesis.thesisStatus === 'Weakening'
  ) {
    return 'warning';
  }

  if (thesis.thesisStatus === 'Broken') {
    return 'risk';
  }

  if (thesis.ideaStatus === 'Watchlist' || thesis.ideaStatus === 'Researching') {
    return 'accent';
  }

  return 'neutral';
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
  initialSelectedNoteId,
  theses = mockTheses
}: ThesisMonitorScreenProps): JSX.Element {
  const demoTheses = theses.length > 0 ? theses : mockTheses;
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
  const [selectedMockThesisId, setSelectedMockThesisId] = useState(
    demoTheses[0].id
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
  const selectedMockThesis =
    demoTheses.find((thesis) => thesis.id === selectedMockThesisId) ??
    demoTheses[0];
  const thesisCount = notes.length;
  const activeThesisCount = activeNoteCount;
  const reviewDateCount = notesWithReviewDates;
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
        description="Write down your research, assumptions, and questions to revisit."
        title="Research notes"
      />

      <div className="thesis-workspace-grid">
        <aside className="thesis-queue-rail" aria-label="Research notes list">
          <div className="thesis-queue-header">
            <div>
              <h2>Your notes</h2>
              <p>Saved on this device</p>
            </div>
            <Button
              disabled={isWriting || isLoading}
              onClick={startNewNote}
              type="button"
              variant="secondary"
            >
              + New note
            </Button>
          </div>

          <div className="thesis-queue-list" role="group" aria-label="Saved and example notes">
            {isLoading ? (
              <p>Loading notes...</p>
            ) : hasLocalNotes ? (
              notes.map((note) => {
                  const isSelected = note.id === selectedNoteId;

                  return (
                    <button
                      aria-current={isSelected ? 'true' : undefined}
                      className="thesis-queue-card"
                      disabled={isWriting}
                      key={note.id}
                      onClick={() => selectNote(note)}
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
                        {note.conviction ? (
                          <small>{convictionLabels[note.conviction]} conviction</small>
                        ) : null}
                      </span>
                      <span className="thesis-queue-open">Open</span>
                    </button>
                  );
                })
            ) : (
              <>
                <div className="thesis-empty-state">
                  <h3>Your first note starts here</h3>
                  <p>
                    Use New note to capture your research. Examples below are not saved notes.
                  </p>
                </div>
                <details className="tool-about thesis-note-examples">
                  <summary>Explore example notes</summary>
                  <p className="data-provenance-note">These examples are not saved research notes.</p>
                  {demoTheses.map((thesis) => {
                    const isSelected = thesis.id === selectedMockThesisId;

                    return (
                      <button
                        aria-current={isSelected ? 'true' : undefined}
                        className="thesis-queue-card thesis-queue-card--demo"
                        disabled={isWriting}
                        key={thesis.id}
                        onClick={() => {
                          setSelectedMockThesisId(thesis.id);
                          setSelectedNoteId(null);
                        }}
                        type="button"
                      >
                        <span className="thesis-queue-card-topline">
                          <strong>{thesis.ticker}</strong>
                          <Badge variant={mockThesisBadgeVariant(thesis)}>
                            {thesis.thesisStatus}
                          </Badge>
                        </span>
                        <span className="thesis-queue-title">
                          {thesis.thesisSummary}
                        </span>
                        <span className="thesis-queue-meta">
                          <small>{thesis.ideaStatus}</small>
                          <small>Score {thesis.mbsScore}</small>
                        </span>
                        <span className="thesis-queue-open">Preview</span>
                      </button>
                    );
                  })}
                  <article className="thesis-details thesis-details--compact">
                    <p className="data-provenance-note" role="note">
                      <Badge variant="neutral">Demo thesis data</Badge>
                      <span>This example is separate from your saved thesis notes.</span>
                    </p>
                    <div className="thesis-details-header">
                      <div>
                        <p className="thesis-details-eyebrow">
                          {selectedMockThesis.ticker}
                        </p>
                        <h3>{selectedMockThesis.companyName}</h3>
                      </div>
                      <Badge variant={mockThesisBadgeVariant(selectedMockThesis)}>
                        {selectedMockThesis.thesisStatus}
                      </Badge>
                    </div>

                    <dl className="thesis-meta-grid">
                      <div>
                        <dt>Score</dt>
                        <dd>{selectedMockThesis.mbsScore}</dd>
                      </div>
                      <div>
                        <dt>Review</dt>
                        <dd>{selectedMockThesis.nextReviewDate}</dd>
                      </div>
                    </dl>

                    <div className="thesis-detail-section">
                      <h4>Summary</h4>
                      <p>{selectedMockThesis.thesisSummary}</p>
                    </div>

                    <div className="thesis-detail-section">
                      <h4>Bull case</h4>
                      <p>{selectedMockThesis.bullCase}</p>
                    </div>

                    <div className="thesis-detail-section">
                      <h4>Bear case</h4>
                      <p>{selectedMockThesis.bearCase}</p>
                    </div>

                    <div className="thesis-detail-section">
                      <h4>Review triggers</h4>
                      <p>{selectedMockThesis.reviewTriggers.join(', ')}</p>
                    </div>
                  </article>
                </details>
              </>
            )}
          </div>

          <details className="thesis-queue-workflow tool-about">
            <summary>About this tool</summary>
            <p>Research notes are separate from your saved Theses and their review history. Use a note status to track your own research progress.</p>
            <div>
              <span>Draft</span>
              <span>Active</span>
              <span>Watch</span>
              <span>Broken</span>
            </div>
          </details>
        </aside>

        <Card className="thesis-form-card" title={selectedNote?.id === form.id ? "Edit note" : "New note"}>
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
            <span>Research notes</span>
            <textarea
              aria-label="Thesis body"
              onChange={(event) => updateForm('body', event.currentTarget.value)}
              placeholder="What have you learned? What assumptions should you check?"
              rows={6}
              value={form.body}
            />
          </label>

          <label className="thesis-field thesis-body-field">
            <span>Optional review checklist</span>
            <textarea
              aria-label="Thesis checklist"
              onChange={(event) => updateForm('checklist', event.currentTarget.value)}
              placeholder="Questions and evidence to revisit."
              rows={4}
              value={form.checklist}
            />
          </label>

          {visibleValidationErrors.length > 0 ? (
            <div className="thesis-validation" role="alert">
              <h3>Check these details</h3>
              <ul>
                {visibleValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {storageErrors.length > 0 ? (
            <div className="thesis-validation" role="alert">
              <h3>Could not update your notes</h3>
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

        <Card className="thesis-health-card" title="Note overview">
          <div className="thesis-health-hero">
            <span>Saved notes</span>
            <strong>{thesisCount}</strong>
            <Badge variant={activeThesisCount > 0 ? 'accent' : 'neutral'}>
              {activeThesisCount} active/watch
            </Badge>
          </div>

          <div className="thesis-health-grid">
            <div>
              <span>With review date</span>
              <strong>{reviewDateCount}</strong>
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
                ? 'Edit the note or update the questions you want to revisit.'
                : 'Write a new note to keep your own research. Examples below are for reference.'}
            </p>
          </div>

          <div className="thesis-selected-snapshot">
            <h3>Selected note</h3>
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
                    <dt>Conviction</dt>
                    <dd>{selectedNote.conviction ? convictionLabels[selectedNote.conviction] : 'Not set'}</dd>
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
              <p>Select a saved note to see its details, or write a new note.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
