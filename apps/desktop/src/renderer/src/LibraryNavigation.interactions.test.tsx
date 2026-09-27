// @vitest-environment jsdom
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LivingThesis } from '@thesis-investing/core';
import { createSqliteStorage } from '../../storage/sqlite';
import { createLivingThesesStorageService } from '../../main/livingThesesStorageService';
import { createThesisHistoryStorageService } from '../../main/thesisHistoryStorageService';
import { createDecisionsStorageService } from '../../main/decisionsStorageService';
import * as thesisClients from './livingThesesStorageClient';
import * as historyClients from './thesisHistoryStorageClient';
import * as queueClients from './reviewQueueStorageClient';
import * as decisionClients from './decisionsStorageClient';
import { markOnboardingCompleted } from './onboardingState';
import { App } from './App';

const first: LivingThesis = {
  id: 'library-first', version: 1, entityName: 'First Company', ticker: 'FIRST',
  title: 'Newest saved thesis', summary: 'The first thesis must not replace the requested one.',
  lifecycle: 'active', conviction: 'medium', riskLevel: 'low', risks: [], catalysts: [],
  createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-12T10:00:00.000Z'
};
const target: LivingThesis = {
  ...first, id: 'library-target', entityName: 'Target Company', ticker: 'TARGET',
  title: 'Archived investment case', summary: 'Original archived thesis summary', lifecycle: 'archived',
  archivedAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-11T10:00:00.000Z'
};
let directory: string;
let filename: string;
let theses: ReturnType<typeof createLivingThesesStorageService>;
let history: ReturnType<typeof createThesisHistoryStorageService>;
let decisions: ReturnType<typeof createDecisionsStorageService>;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(async () => {
  localStorage.clear();
  markOnboardingCompleted();
  directory = mkdtempSync(join(tmpdir(), 'library-navigation-'));
  filename = join(directory, 'research.sqlite');
  const storage = await createSqliteStorage({ filename });
  expect(storage.repositories.livingTheses.create(first).ok).toBe(true);
  expect(storage.repositories.livingTheses.create(target).ok).toBe(true);
  storage.close();
  theses = createLivingThesesStorageService(() => createSqliteStorage({ filename }), {
    now: () => '2026-09-27T12:00:00.000Z'
  });
  history = createThesisHistoryStorageService(() => createSqliteStorage({ filename }));
  decisions = createDecisionsStorageService(() => createSqliteStorage({ filename }), { now: () => '2026-09-27T12:00:00.000Z' });
  vi.spyOn(thesisClients, 'getDefaultLivingThesesStorageClient').mockReturnValue(theses);
  vi.spyOn(historyClients, 'getDefaultThesisHistoryStorageClient').mockReturnValue(history);
  vi.spyOn(queueClients, 'getDefaultReviewQueueStorageClient').mockReturnValue(null);
  vi.spyOn(decisionClients, 'getDefaultDecisionsStorageClient').mockReturnValue(decisions);
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await Promise.all([theses.close(), history.close(), decisions.close()]);
  rmSync(directory, { recursive: true, force: true });
});

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

async function browseLibrary(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Theses' }));
  await screen.findByRole('heading', { name: first.entityName });
  fireEvent.click(screen.getByRole('button', { name: 'Browse library' }));
  await screen.findByRole('heading', { name: 'Thesis library' });
}

async function targetRow(title = target.title): Promise<HTMLElement> {
  return screen.findByRole('article', { name: `${target.entityName}: ${title}` });
}

async function openTarget(): Promise<void> {
  fireEvent.click(within(await targetRow()).getByRole('button', { name: 'Open thesis' }));
  await screen.findByRole('heading', { name: target.entityName });
}

describe('Thesis library navigation with saved research', () => {
  it('opens the exact non-first archived thesis history and focuses its heading', async () => {
    const getHistory = vi.spyOn(history, 'get');
    render(<App />);
    await browseLibrary();

    fireEvent.click(within(await targetRow()).getByRole('button', { name: 'View history' }));

    const heading = await screen.findByRole('heading', { name: 'History' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole('heading', { name: target.entityName })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    await screen.findByText('Currently archived');
    expect(getHistory).toHaveBeenLastCalledWith(target.id);
    expect(screen.queryByDisplayValue(first.summary)).toBeNull();
  });

  it('keeps browsing filters and reloads the saved thesis after Save and leave', async () => {
    render(<App />);
    await browseLibrary();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search theses' }), { target: { value: 'Target' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'archived' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'entity' } });
    await openTarget();
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis title' }), { target: { value: 'Target updated investment case' } });

    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).getByRole('button', { name: 'Save and leave' }));

    await targetRow('Target updated investment case');
    expect(screen.getByRole('searchbox', { name: 'Search theses' })).toHaveProperty('value', 'Target');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveProperty('value', 'archived');
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveProperty('value', 'entity');
    expect(screen.queryByRole('article', { name: `${first.entityName}: ${first.title}` })).toBeNull();
    expect(value(await theses.getById(target.id)).title).toBe('Target updated investment case');
    expect(value(await theses.getById(first.id))).toEqual(first);
  });

  it('preserves a draft when staying and discards it only on the explicit leave choice', async () => {
    render(<App />);
    await browseLibrary();
    await openTarget();
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Unsaved library edit' } });

    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Unsaved library edit')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Thesis library' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).getByRole('button', { name: 'Discard and leave' }));

    await targetRow();
    await openTarget();
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    expect(value(await theses.getById(target.id))).toEqual(target);
  });

  it('keeps the draft and destination available after a failed Save and leave', async () => {
    render(<App />);
    await browseLibrary();
    await openTarget();
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Retain failed save' } });
    vi.spyOn(theses, 'update').mockResolvedValueOnce({ ok: false, code: 'storage', errors: ['Storage is temporarily unavailable.'] });

    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).getByRole('button', { name: 'Save and leave' }));

    await within(screen.getByRole('dialog', { name: 'Unsaved thesis changes' })).findByText('Storage is temporarily unavailable.');
    expect(screen.getByDisplayValue('Retain failed save')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Thesis library' })).toBeNull();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Unsaved thesis changes' })).getByRole('button', { name: 'Save and leave' }));
    await targetRow();
    expect(value(await theses.getById(target.id)).summary).toBe('Retain failed save');
  });

  it('waits for the initial read before accepting a new draft and focuses Company afterward', async () => {
    const create = vi.spyOn(theses, 'create');
    render(<App />);
    await browseLibrary();
    await targetRow();
    let finish!: (result: Awaited<ReturnType<typeof theses.list>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof theses.list>>>((resolve) => { finish = resolve; });
    vi.spyOn(theses, 'list').mockReturnValueOnce(pending);

    fireEvent.click(screen.getByRole('button', { name: 'New thesis' }));

    expect(screen.queryByRole('textbox', { name: 'Company or asset' })).toBeNull();
    expect(create).not.toHaveBeenCalled();
    await act(async () => { finish({ ok: true, value: [first, target] }); });
    const company = await screen.findByRole('textbox', { name: 'Company or asset' });
    await waitFor(() => expect(document.activeElement).toBe(company));
    expect(company).toHaveProperty('value', '');
    fireEvent.change(company, { target: { value: 'New research idea' } });
    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('New research idea')).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
    expect(value(await theses.list())).toHaveLength(2);
  });

  it('retains a history target through a failed read without substituting another thesis', async () => {
    render(<App />);
    await browseLibrary();
    const row = await targetRow();
    vi.spyOn(theses, 'list').mockRejectedValueOnce(new Error('Temporary read failure'));

    fireEvent.click(within(row).getByRole('button', { name: 'View history' }));

    await screen.findByText('Your saved theses could not be loaded. Try again.');
    expect(screen.queryByRole('textbox', { name: 'Thesis summary' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    const heading = await screen.findByRole('heading', { name: 'History' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    expect(screen.queryByDisplayValue(first.summary)).toBeNull();
  });

  it('protects a decision draft when browsing the library and records it before leaving', async () => {
    render(<App />);
    await browseLibrary();
    await openTarget();
    const add = screen.getByRole('button', { name: 'Add decision' });
    await waitFor(() => expect(add).toHaveProperty('disabled', false));
    fireEvent.click(add);
    fireEvent.change(screen.getByRole('textbox', { name: 'Decision' }), { target: { value: 'Revisit the archived case' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason' }), { target: { value: 'A new source changes the earlier evidence.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved decision' })).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Revisit the archived case')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Thesis library' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved decision' })).getByRole('button', { name: 'Save and leave' }));

    await targetRow();
    const saved = value(await decisions.list(target.id));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ title: 'Revisit the archived case', rationale: 'A new source changes the earlier evidence.' });
    expect(value(await theses.getById(target.id))).toEqual(target);
  });
});
