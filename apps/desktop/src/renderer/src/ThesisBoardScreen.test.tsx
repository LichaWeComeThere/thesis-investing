// @vitest-environment jsdom

import type { LivingThesis } from '@thesis-investing/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CreateLivingThesisInput } from '../../shared/livingThesesStorage';
import {
  ThesisBoardScreen
} from './ThesisBoardScreen';
import {
  saveLivingThesisDraft,
  thesisToDraft
} from './livingThesisBoardModel';
import type { LivingThesesStorageClient } from './livingThesesStorageClient';

const thesis: LivingThesis = {
  bearCase: 'Retention weakens.',
  bullCase: 'Durable execution compounds.',
  catalysts: [
    {
      createdAt: '2026-08-24T12:00:00.000Z',
      detail: 'A research checkpoint.',
      id: 'catalyst-1',
      status: 'open',
      thesisId: 'thesis-1',
      title: 'Product launch',
      updatedAt: '2026-08-24T12:00:00.000Z'
    }
  ],
  conviction: 'medium',
  createdAt: '2026-08-24T12:00:00.000Z',
  entityName: 'Acme Research',
  id: 'thesis-1',
  lifecycle: 'monitoring',
  nextReviewAt: '2026-10-01',
  reviewCadenceDays: 30,
  riskLevel: 'high',
  risks: [
    {
      createdAt: '2026-08-24T12:00:00.000Z',
      detail: 'Monitor customer concentration.',
      id: 'risk-1',
      severity: 'high',
      status: 'open',
      thesisId: 'thesis-1',
      title: 'Customer concentration',
      updatedAt: '2026-08-24T12:00:00.000Z'
    }
  ],
  summary: 'A formal persisted thesis.',
  theme: 'Quality compounders',
  ticker: 'ACME',
  title: 'Durable execution thesis',
  updatedAt: '2026-08-24T12:00:00.000Z',
  version: 4
};

afterEach(cleanup);

describe('ThesisBoardScreen', () => {
  it('loads formal saved data by default without rendering mock thesis records', () => {
    const html = renderToStaticMarkup(<ThesisBoardScreen />);

    expect(html).toContain('Theses');
    expect(html).toContain('Your theses');
    expect(html).toContain('Loading saved theses...');
    expect(html).not.toContain('NVDA');
    expect(html).not.toContain('Demo thesis workspace');
  });

  it('renders a truthful empty state and does not auto-seed demo records', () => {
    const html = renderToStaticMarkup(
      <ThesisBoardScreen initialTheses={[]} />
    );

    expect(html).toContain('Your first thesis starts here');
    expect(html).toContain('Create first thesis');
    expect(html).not.toContain('example records');
  });

  it('renders persisted current state, structured children, and editable fields', () => {
    const html = renderToStaticMarkup(
      <ThesisBoardScreen initialTheses={[thesis]} />
    );

    expect(html).toContain('Acme Research');
    expect(html).toContain('Durable execution thesis');
    expect(html).toContain('Version 4');
    expect(html).toContain('Monitoring');
    expect(html).toContain('Customer concentration');
    expect(html).toContain('Product launch');
    expect(html).toContain('Save changes');
    expect(html).toContain('Review cadence (days)');
    expect(html).toContain('Next review');
    expect(html).not.toContain('MBS score');
    expect(html).not.toContain('Thesis health');
    expect(html).not.toContain('Review priority');
  });

  it('renders a safe load error without implying data was changed', () => {
    const html = renderToStaticMarkup(
      <ThesisBoardScreen
        initialFeedback={{
          messages: ['Living Thesis storage is unavailable. Try again.'],
          type: 'error'
        }}
        initialLoadState="error"
      />
    );

    expect(html).toContain('Your theses could not be loaded.');
    expect(html).toContain('Your saved data was not changed.');
    expect(html).toContain('Try again');
  });

  it('keeps stale-write recovery explicit through a reload action', () => {
    const html = renderToStaticMarkup(
      <ThesisBoardScreen
        initialFeedback={{
          messages: ['A newer saved version is available.'],
          type: 'conflict'
        }}
        initialTheses={[thesis]}
      />
    );

    expect(html).toContain('This thesis changed in another window.');
    expect(html).toContain('A newer saved version is available.');
    expect(html).toContain('Reloading will replace the unsaved edits shown here.');
    expect(html).toContain('Reload saved version');
  });

  it('supports separate records sharing a ticker and keys display by persisted identity', () => {
    const secondThesis = {
      ...thesis,
      entityName: 'Acme Special Situations',
      id: 'thesis-2',
      risks: [],
      catalysts: [],
      title: 'A separate thesis for the same entity'
    };
    const html = renderToStaticMarkup(
      <ThesisBoardScreen initialTheses={[thesis, secondThesis]} />
    );

    expect(html).toContain('Acme Research');
    expect(html).toContain('Acme Special Situations');
    expect(html.match(/ACME \/ /g)).toHaveLength(2);
  });

  it('searches saved research without discarding the selected draft', () => {
    const other: LivingThesis = { ...thesis, id: 'second-thesis', entityName: 'Cedar Systems', ticker: 'CDR', title: 'Infrastructure demand', theme: 'Infrastructure' };
    render(<ThesisBoardScreen initialTheses={[thesis, other]} reviewClient={null} decisionClient={null} historyClient={null} />);

    fireEvent.change(screen.getByLabelText('Thesis summary'), { target: { value: 'Research still in progress' } });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search theses' }), { target: { value: '  cdr ' } });

    const saved = screen.getByRole('group', { name: 'Saved theses' });
    expect(within(saved).queryByRole('button', { name: /Acme Research/ })).toBeNull();
    fireEvent.click(within(saved).getByRole('button', { name: /Cedar Systems/ }));
    expect(screen.getByDisplayValue('Research still in progress')).toBeTruthy();
    expect(screen.getByText('Save or cancel the current changes before opening another thesis.')).toBeTruthy();
    expect(screen.getByText('1 of 2 theses')).toBeTruthy();
  });

  it('reveals a collapsed invalid field when saving so it can be corrected', () => {
    const update = vi.fn();
    render(<ThesisBoardScreen initialTheses={[thesis]} client={makeClient({ update })} reviewClient={null} decisionClient={null} historyClient={null} />);
    const cadence = screen.getByLabelText('Review cadence (days)') as HTMLInputElement;
    const section = cadence.closest('details')!;
    expect(section.open).toBe(false);
    section.open = true;
    fireEvent.change(cadence, { target: { value: '0' } });
    section.open = false;

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(section.open).toBe(true);
    expect(cadence.validity.valid).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });

  it('focuses a new thesis form and selected details without focusing on initial load', () => {
    const other: LivingThesis = { ...thesis, id: 'second-thesis', entityName: 'Cedar Systems' };
    render(<ThesisBoardScreen initialTheses={[thesis, other]} reviewClient={null} decisionClient={null} historyClient={null} />);
    expect(document.activeElement).toBe(document.body);

    fireEvent.click(screen.getByRole('button', { name: 'New thesis' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Company or asset' }));

    fireEvent.click(within(screen.getByRole('group', { name: 'Saved theses' })).getByRole('button', { name: /Cedar Systems/ }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Cedar Systems' }));

    const search = screen.getByRole('searchbox', { name: 'Search theses' });
    search.focus();
    fireEvent.change(search, { target: { value: 'Cedar' } });
    expect(document.activeElement).toBe(search);
  });

  it('keeps focus and the draft when dirty thesis navigation is blocked', () => {
    const other: LivingThesis = { ...thesis, id: 'second-thesis', entityName: 'Cedar Systems' };
    render(<ThesisBoardScreen initialTheses={[thesis, other]} reviewClient={null} decisionClient={null} historyClient={null} />);
    const summary = screen.getByRole('textbox', { name: 'Thesis summary' });
    summary.focus();
    fireEvent.change(summary, { target: { value: 'Unsaved research' } });

    fireEvent.click(screen.getByRole('button', { name: 'New thesis' }));
    expect(document.activeElement).toBe(summary);
    fireEvent.click(within(screen.getByRole('group', { name: 'Saved theses' })).getByRole('button', { name: /Cedar Systems/ }));
    expect(document.activeElement).toBe(summary);
    expect(screen.getByRole('heading', { name: 'Acme Research' })).toBeTruthy();
    expect(screen.getByDisplayValue('Unsaved research')).toBeTruthy();
  });

  it('jumps to the existing decision log when full history is unavailable', () => {
    render(<ThesisBoardScreen initialTheses={[thesis]} reviewClient={null} decisionClient={null} historyClient={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'View history' }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Decision Log' }));
  });

  it('focuses the saved thesis context after creating a thesis', async () => {
    const create = vi.fn(async () => ({ ok: true as const, value: thesis }));
    render(<ThesisBoardScreen initialTheses={[]} client={makeClient({ create })} reviewClient={null} decisionClient={null} historyClient={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'New thesis' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Company or asset' }), { target: { value: thesis.entityName } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis title' }), { target: { value: thesis.title } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: thesis.summary } });
    fireEvent.click(screen.getByRole('button', { name: 'Create thesis' }));

    await screen.findByText('Living Thesis created and saved locally.');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Acme Research' }));
    expect(create).toHaveBeenCalledOnce();
  });

  it('focuses the selected thesis without resetting its current draft', () => {
    render(<ThesisBoardScreen initialTheses={[thesis]} reviewClient={null} decisionClient={null} historyClient={null} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Research still in progress' } });

    fireEvent.click(within(screen.getByRole('group', { name: 'Saved theses' })).getByRole('button', { name: /Acme Research/ }));

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Acme Research' }));
    expect(screen.getByDisplayValue('Research still in progress')).toBeTruthy();
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });

  it.each([false, true])('restores context after cancelling a new form (existing thesis: %s)', (hasThesis) => {
    render(<ThesisBoardScreen initialTheses={hasThesis ? [thesis] : []} reviewClient={null} decisionClient={null} historyClient={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'New thesis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(document.activeElement).toBe(hasThesis
      ? screen.getByRole('heading', { name: 'Acme Research' })
      : screen.getByRole('button', { name: 'New thesis' }));
  });

  it('creates tickerless input without renderer-authored identity, version, or timestamps', async () => {
    const create = vi.fn(async (input: CreateLivingThesisInput) => {
      void input;
      return {
        ok: true as const,
        value: thesis
      };
    });
    const client = makeClient({ create });
    const draft = { ...thesisToDraft(thesis), ticker: '' };

    await saveLivingThesisDraft(client, draft, true);

    expect(create).toHaveBeenCalledOnce();
    const input = create.mock.calls[0]?.[0];
    expect(input?.ticker).toBe('');
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('version');
    expect(input).not.toHaveProperty('createdAt');
    expect(input).not.toHaveProperty('updatedAt');
  });

  it('updates by persisted ID and expected version while retaining child IDs', async () => {
    const saved = { ...thesis, version: 5 };
    const update = vi.fn(async () => ({ ok: true as const, value: saved }));
    const client = makeClient({ update });
    const draft = thesisToDraft(thesis);
    const result = await saveLivingThesisDraft(client, draft, false);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'thesis-1',
        risks: [expect.objectContaining({ id: 'risk-1' })],
        catalysts: [expect.objectContaining({ id: 'catalyst-1' })]
      }),
      4
    );
    expect(result.ok && result.value.version).toBe(5);
  });

  it('keeps version conflicts distinguishable from successful saves', async () => {
    const client = makeClient({
      update: async () => ({
        code: 'conflict',
        errors: ['A newer saved version is available.'],
        ok: false
      })
    });

    const result = await saveLivingThesisDraft(
      client,
      thesisToDraft(thesis),
      false
    );

    expect(result).toEqual({
      code: 'conflict',
      errors: ['A newer saved version is available.'],
      ok: false
    });
  });
});

function makeClient(
  overrides: Partial<LivingThesesStorageClient>
): LivingThesesStorageClient {
  return {
    create: async () => ({ code: 'validation', errors: [], ok: false }),
    getById: async () => ({ code: 'not-found', errors: [], ok: false }),
    list: async () => ({ ok: true, value: [] }),
    update: async () => ({ code: 'conflict', errors: [], ok: false }),
    ...overrides
  };
}
