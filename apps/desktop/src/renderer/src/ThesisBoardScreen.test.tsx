import type { LivingThesis } from '@thesis-investing/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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

describe('ThesisBoardScreen', () => {
  it('loads formal saved data by default without rendering mock thesis records', () => {
    const html = renderToStaticMarkup(<ThesisBoardScreen />);

    expect(html).toContain('Thesis Board');
    expect(html).toContain('Saved locally');
    expect(html).toContain('Loading saved theses...');
    expect(html).not.toContain('NVDA');
    expect(html).not.toContain('Demo thesis workspace');
  });

  it('renders a truthful empty state and does not auto-seed demo records', () => {
    const html = renderToStaticMarkup(
      <ThesisBoardScreen initialTheses={[]} />
    );

    expect(html).toContain('No Living Thesis records yet');
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

    expect(html).toContain('Living Thesis records could not be loaded.');
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
