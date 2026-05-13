import {
  createId,
  normalizeTickerSymbol,
  validateThesisNote,
  type ThesisNote,
  type ThesisStatus,
  type ValidationResult
} from '@thesis-investing/core';

export type ThesisConvictionValue = NonNullable<ThesisNote['conviction']>;

export type LocalThesisNote = ThesisNote & {
  checklist?: string;
};

export type ThesisNoteFormState = {
  id: string;
  title: string;
  ticker: string;
  body: string;
  status: ThesisStatus;
  conviction: '' | ThesisConvictionValue;
  reviewDueAt: string;
  checklist: string;
};

export type ThesisNoteFormResult = {
  note: LocalThesisNote;
  validation: ValidationResult;
};

export const THESIS_STATUS_OPTIONS: ThesisStatus[] = [
  'draft',
  'active',
  'watch',
  'challenged',
  'broken',
  'closed'
];

export const THESIS_CONVICTION_OPTIONS: ThesisConvictionValue[] = [
  'low',
  'medium',
  'high'
];

export function createEmptyThesisNoteForm(
  seed: string | number = 'draft'
): ThesisNoteFormState {
  return {
    body: '',
    checklist: '',
    conviction: '',
    id: createId('thesis', ['local', seed]),
    reviewDueAt: '',
    status: 'draft',
    ticker: '',
    title: ''
  };
}

export function thesisNoteToForm(note: LocalThesisNote): ThesisNoteFormState {
  return {
    body: note.body,
    checklist: note.checklist ?? '',
    conviction: note.conviction ?? '',
    id: note.id,
    reviewDueAt: note.reviewDueAt ?? '',
    status: note.status,
    ticker: note.ticker ?? '',
    title: note.title
  };
}

export function buildThesisNoteFromForm(
  form: ThesisNoteFormState
): ThesisNoteFormResult {
  const note: LocalThesisNote = {
    body: form.body.trim(),
    id: form.id,
    status: form.status,
    title: form.title.trim()
  };

  if (form.ticker.trim()) {
    note.ticker = normalizeTickerSymbol(form.ticker);
  }

  if (form.conviction) {
    note.conviction = form.conviction;
  }

  if (form.reviewDueAt.trim()) {
    note.reviewDueAt = form.reviewDueAt.trim();
  }

  if (form.checklist.trim()) {
    note.checklist = form.checklist.trim();
  }

  return {
    note,
    validation: validateThesisNote(note)
  };
}

export function hasThesisFormContent(form: ThesisNoteFormState): boolean {
  return [
    form.title,
    form.ticker,
    form.body,
    form.conviction,
    form.reviewDueAt,
    form.checklist
  ].some((value) => value.trim().length > 0);
}
