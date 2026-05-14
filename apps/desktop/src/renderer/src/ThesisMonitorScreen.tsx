import { Badge, Button, Card, PageHeader, type BadgeVariant } from '@thesis-investing/ui';
import { useMemo, useState } from 'react';
import {
  buildThesisNoteFromForm,
  createEmptyThesisNoteForm,
  hasThesisFormContent,
  thesisNoteToForm,
  THESIS_CONVICTION_OPTIONS,
  THESIS_STATUS_OPTIONS,
  type LocalThesisNote,
  type ThesisNoteFormState
} from './thesisMonitorInput';

type ThesisMonitorScreenProps = {
  initialForm?: ThesisNoteFormState;
  initialNotes?: LocalThesisNote[];
  initialSelectedNoteId?: string;
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

function thesisHeaderBadgeVariant(status: LocalThesisNote['status']): BadgeVariant {
  if (status === 'broken') {
    return 'risk';
  }
  if (status === 'active') {
    return 'success';
  }
  if (status === 'challenged') {
    return 'warning';
  }
  return 'neutral';
}

export function ThesisMonitorScreen({
  initialForm,
  initialNotes = [],
  initialSelectedNoteId
}: ThesisMonitorScreenProps): JSX.Element {
  const [notes, setNotes] = useState<LocalThesisNote[]>(() =>
    initialNotes.map((note) => ({ ...note }))
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    initialSelectedNoteId ?? initialNotes[0]?.id ?? null
  );
  const [nextNoteNumber, setNextNoteNumber] = useState(initialNotes.length + 1);
  const [saveAttempted, setSaveAttempted] = useState(false);
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
  const shouldShowValidation =
    saveAttempted || (hasThesisFormContent(form) && !formResult.validation.valid);
  const visibleValidationErrors = shouldShowValidation
    ? formResult.validation.errors
    : [];

  function updateForm<Field extends keyof Omit<ThesisNoteFormState, 'id'>>(
    field: Field,
    value: ThesisNoteFormState[Field]
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function saveNote(): void {
    setSaveAttempted(true);

    if (!formResult.validation.valid) {
      return;
    }

    const nextNote = formResult.note;
    setNotes((currentNotes) => {
      const existingNoteIndex = currentNotes.findIndex(
        (note) => note.id === nextNote.id
      );

      if (existingNoteIndex === -1) {
        return [...currentNotes, nextNote];
      }

      return currentNotes.map((note) =>
        note.id === nextNote.id ? nextNote : note
      );
    });
    setSelectedNoteId(nextNote.id);
    setForm(thesisNoteToForm(nextNote));
    setSaveAttempted(false);

    if (!notes.some((note) => note.id === nextNote.id)) {
      setNextNoteNumber((currentNumber) => currentNumber + 1);
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

      <Card title="Create or edit thesis note">
        <div className="thesis-monitor-disclaimer">
          Notes are manually authored by the user. No live data, automated news
          monitoring, AI commentary, brokerage connection, sync, or trading
          execution is used.
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

        <div className="thesis-actions">
          <Button onClick={saveNote} type="button">
            Save note
          </Button>
          <Button onClick={startNewNote} type="button" variant="secondary">
            New note
          </Button>
        </div>
      </Card>

      <div className="thesis-monitor-layout">
        <Card title="Local thesis notes">
          {notes.length > 0 ? (
            <div className="thesis-note-list">
              {notes.map((note) => {
                const isSelected = note.id === selectedNoteId;

                return (
                  <button
                    aria-current={isSelected ? 'true' : undefined}
                    className="thesis-note-list-item"
                    key={note.id}
                    onClick={() => selectNote(note)}
                    type="button"
                  >
                    <span>{note.title}</span>
                    <small>
                      {note.ticker ?? 'No ticker'} - {statusLabels[note.status]}
                    </small>
                  </button>
                );
              })}
            </div>
          ) : (
            <p>No local thesis notes yet.</p>
          )}
        </Card>

        <Card title="Selected thesis details">
          {selectedNote ? (
            <article className="thesis-details">
              <div className="thesis-details-header">
                <div>
                  <p className="thesis-details-eyebrow">
                    {selectedNote.ticker ?? 'No ticker'}
                  </p>
                  <h3>{selectedNote.title}</h3>
                </div>
                <Badge variant={thesisHeaderBadgeVariant(selectedNote.status)}>
                  {statusLabels[selectedNote.status]}
                </Badge>
              </div>

              <dl className="thesis-meta-grid">
                <div>
                  <dt>Conviction</dt>
                  <dd>
                    {selectedNote.conviction
                      ? convictionLabels[selectedNote.conviction]
                      : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt>Review due</dt>
                  <dd>{selectedNote.reviewDueAt ?? 'Not set'}</dd>
                </div>
              </dl>

              <div className="thesis-detail-section">
                <h4>Thesis</h4>
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
            <p>Select or save a local thesis note to review its details.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
