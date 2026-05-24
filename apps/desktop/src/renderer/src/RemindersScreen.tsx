import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  buildReminderFromForm,
  createEmptyReminderForm,
  ensureReminderFormHasAvailableId,
  getNextReminderNumber,
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
import {
  getDefaultRemindersStorageClient,
  toLocalReminder,
  toPersistedReminder,
  type RemindersStorageClient
} from './remindersStorageClient';
import './reminders.css';

type RemindersScreenProps = {
  initialForm?: ReminderFormState;
  initialReminders?: LocalReminder[];
  initialStorageErrors?: string[];
  initialSelectedReminderId?: string;
  storageClient?: RemindersStorageClient | null;
};

export function RemindersScreen({
  initialForm,
  initialReminders = [],
  initialStorageErrors = [],
  storageClient,
  initialSelectedReminderId
}: RemindersScreenProps): JSX.Element {
  const resolvedStorageClient =
    storageClient === undefined
      ? getDefaultRemindersStorageClient()
      : storageClient;
  const [reminders, setReminders] = useState<LocalReminder[]>(() =>
    initialReminders.map((reminder) => ({ ...reminder }))
  );
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    initialSelectedReminderId ?? initialReminders[0]?.id ?? null
  );
  const [nextReminderNumber, setNextReminderNumber] = useState(() =>
    getNextReminderNumber(initialReminders)
  );
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [storageErrors, setStorageErrors] = useState(initialStorageErrors);
  const [isLoading, setIsLoading] = useState(Boolean(resolvedStorageClient));
  const [isWriting, setIsWriting] = useState(false);
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

  useEffect(() => {
    const client = resolvedStorageClient;

    if (!client) {
      setIsLoading(false);
      return;
    }

    const activeClient = client;
    let isMounted = true;

    async function loadPersistedReminders(): Promise<void> {
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

        const persistedReminders = result.value.map(toLocalReminder);
        const nextAvailableReminderNumber =
          getNextReminderNumber(persistedReminders);

        setReminders(persistedReminders);
        setSelectedReminderId((currentSelectedReminderId) => {
          if (
            currentSelectedReminderId &&
            persistedReminders.some(
              (reminder) => reminder.id === currentSelectedReminderId
            )
          ) {
            return currentSelectedReminderId;
          }

          return persistedReminders[0]?.id ?? null;
        });
        setNextReminderNumber(nextAvailableReminderNumber);

        if (!initialForm) {
          setForm((currentForm) =>
            ensureReminderFormHasAvailableId(
              currentForm,
              persistedReminders,
              nextAvailableReminderNumber
            )
          );
        }
      } catch (error) {
        if (isMounted) {
          setStorageErrors([
            error instanceof Error
              ? error.message
              : 'Unable to load persisted reminders.'
          ]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPersistedReminders();

    return () => {
      isMounted = false;
    };
  }, [initialForm, resolvedStorageClient]);

  function updateForm<Field extends keyof Omit<ReminderFormState, 'id'>>(
    field: Field,
    value: ReminderFormState[Field]
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  async function saveReminder(): Promise<void> {
    setSaveAttempted(true);
    setStorageErrors([]);

    if (!formResult.validation.valid) {
      return;
    }

    const nextReminder = formResult.reminder;
    const isNewReminder = !reminders.some(
      (reminder) => reminder.id === nextReminder.id
    );

    const existingReminder = reminders.find(
      (reminder) => reminder.id === nextReminder.id
    );

    if (nextReminder.completed && existingReminder?.completedAt) {
      nextReminder.completedAt = existingReminder.completedAt;
    }

    if (resolvedStorageClient) {
      setIsWriting(true);

      try {
        const result = await resolvedStorageClient.save(
          toPersistedReminder(nextReminder)
        );

        if (!result.ok) {
          setStorageErrors(result.errors);
          return;
        }

        const savedReminder = toLocalReminder(result.value);
        nextReminder.completed = savedReminder.completed;
        nextReminder.completedAt = savedReminder.completedAt;
        nextReminder.createdAt = savedReminder.createdAt;
        nextReminder.dueDate = savedReminder.dueDate;
        nextReminder.note = savedReminder.note;
        nextReminder.ticker = savedReminder.ticker;
        nextReminder.title = savedReminder.title;
        nextReminder.type = savedReminder.type;
      } catch (error) {
        setStorageErrors([
          error instanceof Error ? error.message : 'Unable to save reminder.'
        ]);
        return;
      } finally {
        setIsWriting(false);
      }
    }

    const updatedReminders = upsertLocalReminder(reminders, nextReminder);

    setReminders(updatedReminders);
    setSelectedReminderId(nextReminder.id);
    setForm(reminderToForm(nextReminder));
    setSaveAttempted(false);

    if (isNewReminder) {
      setNextReminderNumber(
        getNextReminderNumber(updatedReminders, nextReminderNumber + 1)
      );
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

  async function removeReminder(reminderId: string): Promise<void> {
    setStorageErrors([]);

    if (resolvedStorageClient) {
      setIsWriting(true);

      try {
        const result = await resolvedStorageClient.remove(reminderId);

        if (!result.ok) {
          setStorageErrors(result.errors);
          return;
        }
      } catch (error) {
        setStorageErrors([
          error instanceof Error ? error.message : 'Unable to remove reminder.'
        ]);
        return;
      } finally {
        setIsWriting(false);
      }
    }

    const updatedReminders = removeLocalReminder(reminders, reminderId);

    setReminders(updatedReminders);

    if (selectedReminderId === reminderId) {
      setSelectedReminderId(null);
      setForm(createEmptyReminderForm(getNextReminderNumber(updatedReminders)));
      setSaveAttempted(false);
    }

    setNextReminderNumber(
      getNextReminderNumber(updatedReminders, nextReminderNumber)
    );
  }

  async function toggleReminderCompletion(reminderId: string): Promise<void> {
    setStorageErrors([]);

    const reminder = reminders.find(
      (currentReminder) => currentReminder.id === reminderId
    );

    if (!reminder) {
      return;
    }

    const toggledReminder = {
      ...reminder,
      completed: !reminder.completed,
      completedAt: reminder.completed ? undefined : reminder.completedAt
    };

    if (resolvedStorageClient) {
      setIsWriting(true);

      try {
        const result = await resolvedStorageClient.save(
          toPersistedReminder(toggledReminder)
        );

        if (!result.ok) {
          setStorageErrors(result.errors);
          return;
        }

        const savedReminder = toLocalReminder(result.value);
        const updatedReminders = upsertLocalReminder(reminders, savedReminder);

        setReminders(updatedReminders);
        setForm((currentForm) =>
          currentForm.id === reminderId
            ? reminderToForm(savedReminder)
            : currentForm
        );
      } catch (error) {
        setStorageErrors([
          error instanceof Error ? error.message : 'Unable to update reminder.'
        ]);
      } finally {
        setIsWriting(false);
      }

      return;
    }

    const updatedReminders = toggleLocalReminderCompletion(reminders, reminderId);

    setReminders(updatedReminders);
    setForm((currentForm) =>
      currentForm.id === reminderId
        ? { ...currentForm, completed: !currentForm.completed }
        : currentForm
    );
  }

  return (
    <div className="reminders-screen">
      <PageHeader
        badge={<Badge variant="accent">Manual dates only</Badge>}
        description="Track user-entered thesis review, earnings, and custom dates locally. Reminders are educational and non-advisory, with no system notifications, scheduling, APIs, calendars, brokerage, trading execution, AI, or sync."
        eyebrow="Phase 1 Reminders"
        title="Reminders"
      />

      <Card title="Add or edit reminder">
        <div className="reminders-disclaimer">
          Reminders are manually entered by the user. No system notifications,
          background scheduling, live APIs, earnings feeds, calendar
          integrations, brokerage connection, trading execution, AI analysis, or
          cloud sync is used. Title, type, ticker, due date, note, and
          completion status are stored locally on this device.
        </div>

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
            placeholder="Manual context for what to review."
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

        {storageErrors.length > 0 ? (
          <div className="reminders-validation" role="alert">
            <h3>Storage</h3>
            <ul>
              {storageErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="reminders-actions">
          <Button disabled={isWriting || isLoading} onClick={saveReminder} type="button">
            {isWriting ? 'Saving...' : 'Save reminder'}
          </Button>
          <Button
            disabled={isWriting || isLoading}
            onClick={startNewReminder}
            type="button"
            variant="secondary"
          >
            New reminder
          </Button>
        </div>
      </Card>

      <div className="reminders-layout">
        <Card title="Local reminders">
          {isLoading ? (
            <p>Loading persisted reminders...</p>
          ) : reminders.length > 0 ? (
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
                            disabled={isWriting}
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
                            disabled={isWriting}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            {reminder.completed ? 'Reopen' : 'Complete'}
                          </Button>
                          <Button
                            onClick={() => removeReminder(reminder.id)}
                            disabled={isWriting}
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
