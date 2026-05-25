import {
  createId,
  normalizeTickerSymbol,
  validateReminder,
  type Reminder,
  type ReminderType,
  type ValidationResult
} from '@thesis-investing/core';

export type LocalReminder = Reminder & {
  completed: boolean;
};

export type ReminderFormState = {
  id: string;
  title: string;
  type: ReminderType | string;
  ticker: string;
  dueDate: string;
  note: string;
  completed: boolean;
};

export type ReminderFormResult = {
  reminder: LocalReminder;
  validation: ValidationResult;
};

export const REMINDER_TYPE_OPTIONS: ReminderType[] = [
  'earnings',
  'thesis-review',
  'custom'
];

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  custom: 'Custom',
  earnings: 'Earnings',
  'thesis-review': 'Thesis review'
};

export function createEmptyReminderForm(
  seed: string | number = 'draft'
): ReminderFormState {
  return {
    completed: false,
    dueDate: '',
    id: createId('reminder', ['local', seed]),
    note: '',
    ticker: '',
    title: '',
    type: 'thesis-review'
  };
}

export function getNextReminderNumber(
  reminders: readonly LocalReminder[],
  startAt = reminders.length + 1
): number {
  const reminderIds = new Set(reminders.map((reminder) => reminder.id));
  let nextNumber = startAt;

  while (reminderIds.has(createId('reminder', ['local', nextNumber]))) {
    nextNumber += 1;
  }

  return nextNumber;
}

export function ensureReminderFormHasAvailableId(
  form: ReminderFormState,
  reminders: readonly LocalReminder[],
  startAt = reminders.length + 1
): ReminderFormState {
  const isCurrentIdAvailable = !reminders.some(
    (reminder) => reminder.id === form.id
  );

  if (isCurrentIdAvailable) {
    return form;
  }

  return {
    ...form,
    id: createId('reminder', [
      'local',
      String(getNextReminderNumber(reminders, startAt))
    ])
  };
}

export function reminderToForm(
  reminder: LocalReminder
): ReminderFormState {
  return {
    completed: reminder.completed,
    dueDate: reminder.dueDate,
    id: reminder.id,
    note: reminder.note ?? '',
    ticker: reminder.ticker ?? '',
    title: reminder.title,
    type: reminder.type
  };
}

export function buildReminderFromForm(
  form: ReminderFormState
): ReminderFormResult {
  const reminder: LocalReminder = {
    completed: form.completed,
    dueDate: form.dueDate.trim(),
    id: form.id,
    title: form.title.trim(),
    type: form.type as ReminderType
  };

  if (form.ticker.trim()) {
    reminder.ticker = normalizeTickerSymbol(form.ticker);
  }

  if (form.note.trim()) {
    reminder.note = form.note.trim();
  }

  return {
    reminder,
    validation: validateReminder(reminder)
  };
}

export function hasReminderFormContent(form: ReminderFormState): boolean {
  return [
    form.title,
    form.ticker,
    form.dueDate,
    form.note
  ].some((value) => value.trim().length > 0);
}

export function upsertLocalReminder(
  reminders: LocalReminder[],
  nextReminder: LocalReminder
): LocalReminder[] {
  const existingReminderIndex = reminders.findIndex(
    (reminder) => reminder.id === nextReminder.id
  );

  if (existingReminderIndex === -1) {
    return [...reminders, nextReminder];
  }

  return reminders.map((reminder) =>
    reminder.id === nextReminder.id ? nextReminder : reminder
  );
}

export function removeLocalReminder(
  reminders: LocalReminder[],
  reminderId: string
): LocalReminder[] {
  return reminders.filter((reminder) => reminder.id !== reminderId);
}

export function toggleLocalReminderCompletion(
  reminders: LocalReminder[],
  reminderId: string
): LocalReminder[] {
  return reminders.map((reminder) =>
    reminder.id === reminderId
      ? { ...reminder, completed: !reminder.completed }
      : reminder
  );
}
