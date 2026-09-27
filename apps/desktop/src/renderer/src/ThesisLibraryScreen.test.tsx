// @vitest-environment jsdom
import { useState } from 'react';
import type { LivingThesis } from '@thesis-investing/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LivingThesesStorageClient } from './livingThesesStorageClient';
import { ThesisLibraryScreen, type ThesisLibraryBrowseState } from './ThesisLibraryScreen';

const base: LivingThesis = {
  id: 'alpha', version: 1, entityName: 'Alpha', ticker: 'ALPH', title: 'Durable demand',
  summary: 'Renewal evidence', theme: 'Software', lifecycle: 'active', conviction: 'medium',
  riskLevel: 'low', risks: [], catalysts: [], nextReviewAt: '2026-09-29',
  createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-20T10:00:00.000Z'
};
const catalog: LivingThesis[] = [
  base,
  { ...base, id: 'cedar', entityName: 'Cedar', ticker: 'CDR', title: 'Historical idea',
    summary: 'Old notes after an acquisition', theme: 'Consumer', lifecycle: 'archived',
    nextReviewAt: '2026-09-27', updatedAt: '2026-09-21T10:00:00.000Z' },
  { ...base, id: 'beta', entityName: 'Beta', ticker: 'BETA', title: 'Paused idea', lifecycle: 'paused',
    nextReviewAt: undefined, updatedAt: '2026-09-21T10:00:00.000Z' },
  { ...base, id: 'delta', entityName: 'Delta', ticker: 'DLTA', title: 'A draft idea', lifecycle: 'draft',
    nextReviewAt: undefined, updatedAt: '2026-09-10T10:00:00.000Z' },
  { ...base, id: 'echo', entityName: 'Echo', ticker: 'ECHO', title: 'Monitoring idea', lifecycle: 'monitoring',
    nextReviewAt: '2026-09-27', updatedAt: '2026-09-11T10:00:00.000Z' }
];

function client(records: LivingThesis[] = catalog): LivingThesesStorageClient {
  return { list: vi.fn().mockResolvedValue({ ok: true, value: records }), create: vi.fn(), update: vi.fn(), getById: vi.fn() };
}

function Harness({ storage, initialState }: { storage: LivingThesesStorageClient | null; initialState?: ThesisLibraryBrowseState }): JSX.Element {
  const [state, setState] = useState<ThesisLibraryBrowseState>(initialState ?? { search: '', lifecycle: 'all', sort: 'recently-updated' });
  return <ThesisLibraryScreen client={storage} browseState={state} onBrowseStateChange={setState}
    onOpenThesis={vi.fn()} onBackToWorkspace={vi.fn()} onCreateThesis={vi.fn()} />;
}

function names(): string[] {
  return screen.queryAllByRole('article').map((row) => row.getAttribute('aria-label') ?? '');
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('ThesisLibraryScreen', () => {
  it('searches saved research across fields and includes every lifecycle', async () => {
    render(<Harness storage={client()} />);
    await screen.findByRole('article', { name: 'Cedar: Historical idea' });
    expect(names()).toHaveLength(5);
    const search = screen.getByRole('searchbox', { name: 'Search theses' });
    for (const query of ['cedar', 'cdr', 'historical', 'old notes', 'consumer', '  CEDAR  acquisition  ']) {
      fireEvent.change(search, { target: { value: query } });
      expect(names()).toEqual(['Cedar: Historical idea']);
    }
    fireEvent.change(search, { target: { value: '' } });
    for (const thesis of catalog) {
      fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: thesis.lifecycle } });
      expect(names()).toEqual([`${thesis.entityName}: ${thesis.title}`]);
    }
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'all' } });
    expect(names()).toHaveLength(5);
  });

  it('sorts the full catalog consistently, including tied dates and unscheduled records', async () => {
    render(<Harness storage={client()} />);
    await screen.findByRole('article', { name: 'Alpha: Durable demand' });
    expect(names()).toEqual(['Beta: Paused idea', 'Cedar: Historical idea', 'Alpha: Durable demand', 'Echo: Monitoring idea', 'Delta: A draft idea']);
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'entity' } });
    expect(names()).toEqual(['Alpha: Durable demand', 'Beta: Paused idea', 'Cedar: Historical idea', 'Delta: A draft idea', 'Echo: Monitoring idea']);
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'next-review' } });
    expect(names()).toEqual(['Cedar: Historical idea', 'Echo: Monitoring idea', 'Alpha: Durable demand', 'Beta: Paused idea', 'Delta: A draft idea']);
  });

  it('sends exact thesis and history targets without writing saved research', async () => {
    const storage = client();
    const onOpenThesis = vi.fn();
    const onCreateThesis = vi.fn();
    const onBackToWorkspace = vi.fn();
    render(<ThesisLibraryScreen client={storage} onOpenThesis={onOpenThesis}
      onCreateThesis={onCreateThesis} onBackToWorkspace={onBackToWorkspace} />);
    const row = within(await screen.findByRole('article', { name: 'Cedar: Historical idea' }));
    fireEvent.click(row.getByRole('button', { name: 'Open thesis' }));
    expect(onOpenThesis).toHaveBeenLastCalledWith({ thesisId: 'cedar' });
    fireEvent.click(row.getByRole('button', { name: 'View history' }));
    expect(onOpenThesis).toHaveBeenLastCalledWith({ thesisId: 'cedar', view: 'history' });
    fireEvent.click(screen.getByRole('button', { name: 'New thesis' }));
    expect(onCreateThesis).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Back to workspace' }));
    expect(onBackToWorkspace).toHaveBeenCalledTimes(1);
    expect(storage.create).not.toHaveBeenCalled();
    expect(storage.update).not.toHaveBeenCalled();
  });

  it('keeps a filtered empty result distinct from an empty library and restores filters accessibly', async () => {
    const view = render(<Harness storage={client()} initialState={{ search: 'nothing matches', lifecycle: 'archived', sort: 'entity' }} />);
    await screen.findByText('No theses match your search.');
    expect(screen.queryByText('Your research starts here.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(names()).toHaveLength(5);
    const search = screen.getByRole('searchbox', { name: 'Search theses' });
    expect(search).toHaveProperty('value', '');
    expect(document.activeElement).toBe(search);
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveProperty('value', 'all');
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveProperty('value', 'entity');
    view.unmount();
    render(<Harness storage={client([])} />);
    await screen.findByText('Your research starts here.');
    expect(screen.queryByText('No theses match your search.')).toBeNull();
  });

  it('shows loading and unavailable states without claiming the catalog is empty', async () => {
    const storage = client();
    let finish!: (result: Awaited<ReturnType<LivingThesesStorageClient['list']>>) => void;
    vi.mocked(storage.list).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = render(<Harness storage={storage} />);
    expect(screen.getByText('Loading your saved theses…')).toBeTruthy();
    expect(screen.queryByText('Your research starts here.')).toBeNull();
    await act(async () => { finish({ ok: true, value: [] }); });
    await screen.findByText('Your research starts here.');
    view.unmount();
    render(<Harness storage={null} />);
    expect(screen.getByText('Your saved theses aren’t available in this window.')).toBeTruthy();
    expect(screen.queryByText('Your research starts here.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();
  });

  it('reports a read failure and retries without presenting a false empty catalog', async () => {
    const storage = client();
    vi.mocked(storage.list).mockResolvedValueOnce({ ok: false, code: 'storage', errors: ['Saved research could not be read.'] });
    render(<Harness storage={storage} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Saved research could not be read.');
    expect(screen.queryByText('Your research starts here.')).toBeNull();
    expect(screen.queryByText('No theses match your search.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('article', { name: 'Cedar: Historical idea' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(storage.list).toHaveBeenCalledTimes(2);
  });

  it('marks retained rows unavailable after a failed refresh and restores actions after retry', async () => {
    const storage = client();
    render(<Harness storage={storage} />);
    const row = within(await screen.findByRole('article', { name: 'Cedar: Historical idea' }));
    vi.mocked(storage.list).mockRejectedValueOnce(new Error('Connection lost'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByRole('alert');
    expect(row.getByRole('button', { name: 'Open thesis' })).toHaveProperty('disabled', true);
    expect(row.getByRole('button', { name: 'View history' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(async () => { await Promise.resolve(); });
    expect(row.getByRole('button', { name: 'Open thesis' })).toHaveProperty('disabled', false);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
