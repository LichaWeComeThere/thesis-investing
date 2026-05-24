import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import { useMemo, useState } from 'react';
import {
  buildReminderFromForm,
  createEmptyReminderForm,
  hasReminderFormContent,
  reminderToForm,
  removeLocalReminder,
  REMINDER_TYPE_LABELS,
  REMINDER_TYPE_OPTIONS,
  toggleLocalReminderCompletion,
  upsertLocalReminder,
  type LocalReminder,
  type ReminderFormState
} from './reminderInput';
import './reminders.css';

type RemindersScreenProps = {
  initialForm?: ReminderFormState;
  initialReminders?: LocalReminder[];
  initialSelectedReminderId?: string;
};

export function RemindersScreen({
  initialForm,
  initialReminders = [],
  initialSelectedReminderId
}: RemindersScreenProps): JSX.Element {
  const [reminders, setReminders] = useState<LocalReminder[]>(() =>
    initialReminders.map((reminder) => ({ ...reminder }))
  );
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    initialSelectedReminderId ?? initialReminders[0]?.id ?? null
  );
  const [nextReminderNumber, setNextReminderNumber] = useState(
    initialReminders.length + 1
  );
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [form, setForm] = useState<ReminderFormState>(() =>
    initialForm
      ? { ...initialForm }
      : createEmptyReminderForm(initialReminders.length + 1)
  );

  const formResult = useMemo(() => buildReminderFromForm(form), [form]);
  const selectedReminder = useMemo(
    () =>
      reminders.find((reminder) => reminder.id === selectedReminderId) ?? null,
    [reminders, selectedReminderId]
  );
  const shouldShowValidation =
    saveAttempted ||
    (hasReminderFormContent(form) && !formResult.validation.valid);
  const visibleValidationErrors = shouldShowValidation
    ? formResult.validation.errors
    : [];

  function updateForm<Field extends keyof Omit<ReminderFormState, 'id'>>(
    field: Field,
    value: ReminderFormState[Field]
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function saveReminder(): void {
    setSaveAttempted(true);

    if (!formResult.validation.valid) {
      return;
    }

    const nextReminder = formResult.reminder;
    const isNewReminder = !reminders.some(
      (reminder) => reminder.id === nextReminder.id
    );

    setReminders((currentReminders) =>
      upsertLocalReminder(currentReminders, nextReminder)
    );
    setSelectedReminderId(nextReminder.id);
    setForm(reminderToForm(nextReminder));
    setSaveAttempted(false);

    if (isNewReminder) {
      setNextReminderNumber((currentNumber) => currentNumber + 1);
    }
  }

  function startNewReminder(): void {
    setForm(createEmptyReminderForm(nextReminderNumber));
    setSelectedReminderId(null);
    setSaveAttempted(false);
  }

  function selectReminder(reminder: LocalReminder): void {
    setSelectedReminderId(reminder.id);
    setForm(reminderToForm(reminder));
    setSaveAttempted(false);
  }

  function removeReminder(reminderId: string): void {
    setReminders((currentReminders) =>
      removeLocalReminder(currentReminders, reminderId)
    );

    if (selectedReminderId === reminderId) {
      setSelectedReminderId(null);
      setForm(createEmptyReminderForm(nextReminderNumber));
      setSaveAttempted(false);
    }
  }

  function toggleReminderCompletion(reminderId: string): void {
    setReminders((currentReminders) =>
      toggleLocalReminderCompletion(currentReminders, reminderId)
    );

    setForm((currentForm) =>
      currentForm.id === reminderId
        ? { ...currentForm, completed: !currentForm.completed }
        : currentForm
    );
  }

  return (
    <div className="reminders-screen">
      <PageHeader
        badge={<Badge variant="accent">Review Dates</Badge>}
        description="Track thesis reviews, earnings follow-ups, and custom research dates in one local calendar list."
        eyebrow="Research Calendar"
        title="Reminders"
      />

      <Card title="Add or edit reminder">
        <div className="reminders-form-grid">
          <label className="reminders-field">
            <span>Title</span>
            <input
              aria-label="Reminder title"
              onChange={(event) => updateForm('title', event.currentTarget.value)}
              placeholder="Review original thesis"
              type="text"
              value={form.title}
            />
          </label>

          <label className="reminders-field">
            <span>Reminder type</span>
            <select
              aria-label="Reminder type"
              onChange={(event) => updateForm('type', event.currentTarget.value)}
              value={form.type}
            >
              {REMINDER_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {REMINDER_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="reminders-field">
            <span>Ticker</span>
            <input
              aria-label="Reminder ticker"
              onChange={(event) => updateForm('ticker', event.currentTarget.value)}
              placeholder="Optional"
              type="text"
              value={form.ticker}
            />
          </label>

          <label className="reminders-field">
            <span>Due date</span>
            <input
              aria-label="Reminder due date"
              onChange={(event) => updateForm('dueDate', event.currentTarget.value)}
              placeholder="YYYY-MM-DD"
              type="text"
              value={form.dueDate}
            />
          </label>
        </div>

        <label className="reminders-field reminders-note-field">
          <span>Optional note</span>
          <textarea
            aria-label="Reminder note"
            onChange={(event) => updateForm('note', event.currentTarget.value)}
            placeholder="Context for what to review."
            rows={4}
            value={form.note}
          />
        </label>

        <label className="reminders-completed-field">
          <input
            aria-label="Reminder completed"
            checked={form.completed}
            onChange={(event) =>
              updateForm('completed', event.currentTarget.checked)
            }
            type="checkbox"
          />
          <span>Mark this reminder completed</span>
        </label>

        {visibleValidationErrors.length > 0 ? (
          <div className="reminders-validation" role="alert">
            <h3>Validation</h3>
            <ul>
              {visibleValidationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="reminders-actions">
          <Button onClick={saveReminder} type="button">
            Save reminder
          </Button>
          <Button onClick={startNewReminder} type="button" variant="secondary">
            New reminder
          </Button>
        </div>
      </Card>

      <div className="reminders-layout">
        <Card title="Local reminders">
          {reminders.length > 0 ? (
            <div className="reminders-table-wrap">
              <table className="reminders-table">
                <thead>
                  <tr>
                    <th scope="col">Due date</th>
                    <th scope="col">Title</th>
                    <th scope="col">Type</th>
                    <th scope="col">Ticker</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map((reminder) => (
                    <tr key={reminder.id}>
                      <td>{reminder.dueDate}</td>
                      <td>{reminder.title}</td>
                      <td>{formatReminderType(reminder.type)}</td>
                      <td>{reminder.ticker ?? 'No ticker'}</td>
                      <td>
                        <Badge
                          variant={reminder.completed ? 'neutral' : 'accent'}
                        >
                          {reminder.completed ? 'Completed' : 'Open'}
                        </Badge>
                      </td>
                      <td>
                        <div className="reminders-row-actions">
                          <Button
                            onClick={() => selectReminder(reminder)}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() =>
                              toggleReminderCompletion(reminder.id)
                            }
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            {reminder.completed ? 'Reopen' : 'Complete'}
                          </Button>
                          <Button
                            onClick={() => removeReminder(reminder.id)}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No local reminders yet.</p>
          )}
        </Card>

        <Card title="Selected reminder details">
          {selectedReminder ? (
            <article className="reminders-details">
              <div className="reminders-details-header">
                <div>
                  <p className="reminders-details-eyebrow">
                    {formatReminderType(selectedReminder.type)}
                  </p>
                  <h3>{selectedReminder.title}</h3>
                </div>
                <Badge variant={selectedReminder.completed ? 'neutral' : 'accent'}>
                  {selectedReminder.completed ? 'Completed' : 'Open'}
                </Badge>
              </div>

              <dl className="reminders-meta-grid">
                <div>
                  <dt>Due date</dt>
                  <dd>{selectedReminder.dueDate}</dd>
                </div>
                <div>
                  <dt>Ticker</dt>
                  <dd>{selectedReminder.ticker ?? 'No ticker'}</dd>
                </div>
              </dl>

              <div className="reminders-detail-section">
                <h4>Note</h4>
                <p>{selectedReminder.note ?? 'No note provided.'}</p>
              </div>
            </article>
          ) : (
            <p>Select or save a local reminder to review details.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatReminderType(type: LocalReminder['type']): string {
  return REMINDER_TYPE_LABELS[type] ?? type;
}
