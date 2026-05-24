import { describe, expect, it } from 'vitest';

import type { LocalThesisNote } from './thesisMonitorInput';
import { toPersistedThesisNote } from './thesisNotesStorageClient';

describe('thesisNotesStorageClient', () => {
  it('strips current-session checklist text before persistence', () => {
    const localNote: LocalThesisNote = {
      body: 'The thesis is manually authored.',
      checklist: 'Current-session checklist',
      conviction: 'medium',
      id: 'thesis_msft',
      reviewDueAt: '2026-08-15',
      status: 'active',
      ticker: 'MSFT',
      title: 'Durable software thesis'
    };

    expect(toPersistedThesisNote(localNote)).toEqual({
      body: 'The thesis is manually authored.',
      conviction: 'medium',
      createdAt: undefined,
      id: 'thesis_msft',
      reviewDueAt: '2026-08-15',
      status: 'active',
      ticker: 'MSFT',
      title: 'Durable software thesis',
      updatedAt: undefined
    });
  });
});
