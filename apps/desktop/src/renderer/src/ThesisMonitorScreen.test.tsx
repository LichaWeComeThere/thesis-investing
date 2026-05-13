import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThesisMonitorScreen } from './ThesisMonitorScreen';
import {
  buildThesisNoteFromForm,
  createEmptyThesisNoteForm,
  thesisNoteToForm,
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

    expect(html).toContain('User-authored notes');
    expect(html).toContain('No live data, automated news');
    expect(html).toContain('Durable software thesis');
    expect(html).toContain('MSFT');
    expect(html).toContain('Review customer retention');
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
});
