import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RemindersScreen } from './RemindersScreen';
import {
  buildReminderFromForm,
  createEmptyReminderForm,
  ensureReminderFormHasAvailableId,
  getNextReminderNumber,
  removeLocalReminder,
  toggleLocalReminderCompletion,
  upsertLocalReminder,
  type LocalReminder
} from './reminderInput';

const sampleReminder: LocalReminder = {
  completed: false,
  dueDate: '2026-08-15',
  id: 'reminder_sample',
  note: 'Compare the original margin assumptions to the latest report.',
  ticker: 'MSFT',
  title: 'Review operating margin thesis',
  type: 'thesis-review'
};

describe('RemindersScreen', () => {
  it('renders manual reminders copy and selected reminder details', () => {
    const html = renderToStaticMarkup(
      <RemindersScreen initialReminders={[sampleReminder]} />
    );

    expect(html).toContain('Review Dates');
    expect(html).toContain('Track thesis reviews, earnings follow-ups');
    expect(html).toContain('Review operating margin thesis');
    expect(html).toContain('Thesis review');
    expect(html).toContain('MSFT');
    expect(html).toContain('Compare the original margin assumptions');
  });

  it('renders validation errors for invalid populated input', () => {
    const invalidForm = {
      ...createEmptyReminderForm('invalid'),
      dueDate: '2026-02-30',
      ticker: 'bad ticker',
      title: '   ',
      type: 'unsupported-type'
    };

    const html = renderToStaticMarkup(
      <RemindersScreen initialForm={invalidForm} />
    );

    expect(html).toContain('Validation');
    expect(html).toContain('Reminder title is required.');
    expect(html).toContain('Reminder due date must use YYYY-MM-DD format.');
    expect(html).toContain('Reminder type is not supported.');
    expect(html).toContain('Reminder ticker must be a valid ticker symbol.');
  });

  it('renders storage errors without crashing', () => {
    const html = renderToStaticMarkup(
      <RemindersScreen initialStorageErrors={['Reminders storage unavailable.']} />
    );

    expect(html).toContain('Storage');
    expect(html).toContain('Reminders storage unavailable.');
  });

  it('converts populated form input into a validated reminder', () => {
    const form = {
      ...createEmptyReminderForm('valid'),
      dueDate: '2026-05-20',
      note: ' Manual note ',
      ticker: ' msft ',
      title: ' Thesis review ',
      type: 'thesis-review'
    };

    const result = buildReminderFromForm(form);

    expect(result.validation.valid).toBe(true);
    expect(result.reminder).toMatchObject({
      completed: false,
      dueDate: '2026-05-20',
      note: 'Manual note',
      ticker: 'MSFT',
      title: 'Thesis review',
      type: 'thesis-review'
    });
  });

  it('upserts, toggles, and removes local reminders deterministically', () => {
    const updatedReminder = {
      ...sampleReminder,
      note: 'Updated local note.'
    };
    const addedReminder: LocalReminder = {
      completed: false,
      dueDate: '2026-10-01',
      id: 'reminder_added',
      title: 'Manual earnings date',
      type: 'earnings'
    };

    const upsertedReminders = upsertLocalReminder(
      upsertLocalReminder([sampleReminder], updatedReminder),
      addedReminder
    );
    const toggledReminders = toggleLocalReminderCompletion(
      upsertedReminders,
      addedReminder.id
    );

    expect(upsertedReminders).toEqual([updatedReminder, addedReminder]);
    expect(toggledReminders[1].completed).toBe(true);
    expect(removeLocalReminder(toggledReminders, sampleReminder.id)).toEqual([
      { ...addedReminder, completed: true }
    ]);
  });

  it('finds the next available deterministic local reminder number', () => {
    const firstReminder = buildReminderFromForm({
      ...createEmptyReminderForm(1),
      dueDate: '2026-08-15',
      title: 'First reminder'
    }).reminder;
    const thirdReminder = buildReminderFromForm({
      ...createEmptyReminderForm(3),
      dueDate: '2026-08-20',
      title: 'Third reminder'
    }).reminder;

    expect(getNextReminderNumber([firstReminder, thirdReminder], 1)).toBe(2);
    expect(getNextReminderNumber([firstReminder, thirdReminder], 3)).toBe(4);
  });

  it('moves a draft form to an available ID after persisted reminders load', () => {
    const draftForm = createEmptyReminderForm(1);
    const existingReminder = buildReminderFromForm({
      ...draftForm,
      dueDate: '2026-08-15',
      title: 'Existing reminder'
    }).reminder;
    const reassignedForm = ensureReminderFormHasAvailableId(draftForm, [
      existingReminder
    ]);

    expect(reassignedForm).toEqual({
      ...draftForm,
      id: createEmptyReminderForm(2).id
    });
  });
});
