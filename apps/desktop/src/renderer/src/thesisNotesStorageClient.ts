import type { ThesisNote } from '@thesis-investing/core';
import type { ThesisNotesStorageApi } from '../../shared/thesisNotesStorage';
import type { ThesisInvestingApi } from '../../shared/watchlistStorage';
import type { LocalThesisNote } from './thesisMonitorInput';

declare global {
  interface Window {
    thesisInvesting?: ThesisInvestingApi;
  }
}

export type ThesisNotesStorageClient = ThesisNotesStorageApi;

export function getDefaultThesisNotesStorageClient(): ThesisNotesStorageClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.thesisInvesting?.thesisNotes ?? null;
}

export function toPersistedThesisNote(note: LocalThesisNote): ThesisNote {
  return {
    body: note.body,
    conviction: note.conviction,
    createdAt: note.createdAt,
    id: note.id,
    reviewDueAt: note.reviewDueAt,
    status: note.status,
    ticker: note.ticker,
    title: note.title,
    updatedAt: note.updatedAt
  };
}
