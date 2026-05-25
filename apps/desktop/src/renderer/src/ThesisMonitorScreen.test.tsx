import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThesisMonitorScreen } from './ThesisMonitorScreen';
import {
  buildThesisNoteFromForm,
  createEmptyThesisNoteForm,
  ensureThesisNoteFormHasAvailableId,
  getNextThesisNoteNumber,
  thesisNoteToForm,
  upsertLocalThesisNote,
  type LocalThesisNote
} from './thesisMonitorInput';

const sampleNote: LocalThesisNote = {
  body: 'The business thesis is user-authored and manually reviewed.',
  checklist: 'Review customer retention and balance sheet notes.',
  conviction: 'medium',
  id: 'thesis_sample',
  reviewDueAt: '2026-08-15',
  status: 'active',
  ticker: 'MSFT',
  title: 'Durable software thesis'
};

describe('ThesisMonitorScreen', () => {
  it('renders thesis monitor copy and selected note details', () => {
    const html = renderToStaticMarkup(
      <ThesisMonitorScreen initialNotes={[sampleNote]} />
    );

    expect(html).toContain('Thesis Notes');
    expect(html).toContain('Thesis Queue');
    expect(html).toContain('plan the next review');
    expect(html).toContain('Durable software thesis');
    expect(html).toContain('MSFT');
    expect(html).toContain('Review customer retention');
  });

  it('renders demo thesis queue cards when no local notes exist', () => {
    const html = renderToStaticMarkup(<ThesisMonitorScreen />);

    expect(html).toContain('Review, rank, and update stock theses');
    expect(html).toContain('+ New Thesis');
    expect(html).toContain('NVDA');
    expect(html).toContain('AI infrastructure leadership');
    expect(html).toContain('CRWD');
    expect(html).toContain('Cybersecurity resilience');
    expect(html).toContain('Caution');
    expect(html).toContain('Selected thesis snapshot');
    expect(html).toContain('Review workflow');
  });

  it('renders validation errors for invalid populated input', () => {
    const invalidForm = {
      ...createEmptyThesisNoteForm('invalid'),
      reviewDueAt: '2026-02-30',
      ticker: 'bad ticker'
    };

    const html = renderToStaticMarkup(
      <ThesisMonitorScreen initialForm={invalidForm} />
    );

    expect(html).toContain('Validation');
    expect(html).toContain('Thesis note title is required.');
    expect(html).toContain('Thesis note body is required.');
    expect(html).toContain('Thesis note ticker must be a valid ticker symbol.');
    expect(html).toContain('Thesis note review date must use YYYY-MM-DD format.');
  });

  it('renders storage errors without crashing', () => {
    const html = renderToStaticMarkup(
      <ThesisMonitorScreen initialStorageErrors={['Thesis storage unavailable.']} />
    );

    expect(html).toContain('Storage');
    expect(html).toContain('Thesis storage unavailable.');
  });

  it('converts form input into a validated local thesis note', () => {
    const form = thesisNoteToForm(sampleNote);
    const result = buildThesisNoteFromForm({
      ...form,
      ticker: ' msft ',
      title: ' Durable software thesis ',
      body: ' Updated thesis body. ',
      checklist: ' Revisit pricing power. '
    });

    expect(result.validation.valid).toBe(true);
    expect(result.note).toMatchObject({
      body: 'Updated thesis body.',
      checklist: 'Revisit pricing power.',
      ticker: 'MSFT',
      title: 'Durable software thesis'
    });
  });

  it('upserts local thesis notes deterministically', () => {
    const updatedNote = {
      ...sampleNote,
      title: 'Updated durable software thesis'
    };
    const addedNote: LocalThesisNote = {
      body: 'A second user-authored thesis.',
      id: 'thesis_added',
      status: 'draft',
      title: 'Second thesis'
    };

    expect(
      upsertLocalThesisNote(
        upsertLocalThesisNote([sampleNote], updatedNote),
        addedNote
      )
    ).toEqual([updatedNote, addedNote]);
  });

  it('finds the next available deterministic local thesis note number', () => {
    const firstNote = buildThesisNoteFromForm({
      ...createEmptyThesisNoteForm(1),
      body: 'First body',
      title: 'First thesis'
    }).note;
    const thirdNote = buildThesisNoteFromForm({
      ...createEmptyThesisNoteForm(3),
      body: 'Third body',
      title: 'Third thesis'
    }).note;

    expect(getNextThesisNoteNumber([firstNote, thirdNote], 1)).toBe(2);
    expect(getNextThesisNoteNumber([firstNote, thirdNote], 3)).toBe(4);
  });

  it('moves a draft form to an available thesis ID after persisted notes load', () => {
    const draftForm = createEmptyThesisNoteForm(1);
    const existingNote = buildThesisNoteFromForm({
      ...draftForm,
      body: 'Existing body',
      title: 'Existing thesis'
    }).note;
    const reassignedForm = ensureThesisNoteFormHasAvailableId(draftForm, [
      existingNote
    ]);

    expect(reassignedForm).toEqual({
      ...draftForm,
      id: createEmptyThesisNoteForm(2).id
    });
  });
});
