// @vitest-environment jsdom

import type { LivingThesis } from '@thesis-investing/core';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import * as livingThesesClient from './livingThesesStorageClient';
import type { LivingThesesStorageClient } from './livingThesesStorageClient';
import { markOnboardingCompleted } from './onboardingState';

const thesis: LivingThesis = {
  id: 'thesis-navigation-test',
  version: 1,
  entityName: 'Acme Research',
  ticker: 'ACME',
  title: 'Durable execution',
  summary: 'Original research summary',
  lifecycle: 'active',
  conviction: 'medium',
  riskLevel: 'low',
  risks: [],
  catalysts: [],
  createdAt: '2026-08-24T12:00:00.000Z',
  updatedAt: '2026-08-24T12:00:00.000Z'
};

let savedThesis: LivingThesis;
let client: LivingThesesStorageClient;

beforeAll(() => {
  // jsdom does not implement native modal behavior. These tests exercise React
  // navigation; native focus trapping and Escape need separate browser QA.
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});

beforeEach(() => {
  localStorage.clear();
  markOnboardingCompleted();
  savedThesis = structuredClone(thesis);
  client = {
    list: vi.fn<LivingThesesStorageClient['list']>(async () => ({ ok: true, value: [savedThesis] })),
    getById: vi.fn<LivingThesesStorageClient['getById']>(async () => ({ ok: true, value: savedThesis })),
    create: vi.fn<LivingThesesStorageClient['create']>(async (input) => {
      savedThesis = { ...thesis, id: 'new-thesis', entityName: input.entityName, title: input.title, summary: input.summary };
      return { ok: true, value: savedThesis };
    }),
    update: vi.fn<LivingThesesStorageClient['update']>(async (input, expectedVersion) => {
      savedThesis = { ...savedThesis, summary: input.summary, version: expectedVersion + 1 };
      return { ok: true, value: savedThesis };
    })
  };
  vi.spyOn(livingThesesClient, 'getDefaultLivingThesesStorageClient').mockReturnValue(client);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function openBoard(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Thesis Board' }));
  await screen.findByDisplayValue(savedThesis.summary);
}

function editSummary(value = 'Unsaved research update'): void {
  fireEvent.change(screen.getByLabelText('Thesis summary'), { target: { value } });
}

function leaveBoard(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
}

describe('Thesis Board sidebar navigation', () => {
  it('keeps the draft when the user chooses Continue editing', async () => {
    render(<App />);
    await openBoard();
    editSummary();
    leaveBoard();

    expect(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));

    expect(screen.getByDisplayValue('Unsaved research update')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(client.update).not.toHaveBeenCalled();
  });

  it('navigates directly when the Board has no unsaved edits', async () => {
    render(<App />);
    await openBoard();
    leaveBoard();

    await waitFor(() => expect(screen.queryByLabelText('Thesis summary')).toBeNull());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(client.update).not.toHaveBeenCalled();
  });

  it('saves the update before leaving and reloads it when returning', async () => {
    render(<App />);
    await openBoard();
    editSummary();
    leaveBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));

    await waitFor(() => expect(screen.queryByLabelText('Thesis summary')).toBeNull());
    expect(client.update).toHaveBeenCalledTimes(1);
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: thesis.id, summary: 'Unsaved research update' }), 1
    );
    await openBoard();
    expect(screen.getByDisplayValue('Unsaved research update')).toBeTruthy();
    expect(savedThesis.version).toBe(2);
  });

  it('discards only the draft without writing to storage', async () => {
    render(<App />);
    await openBoard();
    editSummary();
    leaveBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }));

    await waitFor(() => expect(screen.queryByLabelText('Thesis summary')).toBeNull());
    await openBoard();
    expect(screen.getByDisplayValue(thesis.summary)).toBeTruthy();
    expect(client.update).not.toHaveBeenCalled();
    expect(client.create).not.toHaveBeenCalled();
  });

  it('saves a new thesis before leaving', async () => {
    render(<App />);
    await openBoard();
    fireEvent.click(screen.getByRole('button', { name: 'New thesis' }));
    fireEvent.change(screen.getByLabelText('Entity name'), { target: { value: 'New research entity' } });
    fireEvent.change(screen.getByLabelText('Thesis title'), { target: { value: 'New research title' } });
    editSummary('A new thesis summary');
    leaveBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));

    await waitFor(() => expect(screen.queryByLabelText('Thesis summary')).toBeNull());
    expect(client.create).toHaveBeenCalledTimes(1);
    expect(client.create).toHaveBeenCalledWith(expect.objectContaining({ summary: 'A new thesis summary' }));
    expect(client.update).not.toHaveBeenCalled();
    await openBoard();
    expect(screen.getByDisplayValue('A new thesis summary')).toBeTruthy();
  });

  it.each(['validation', 'storage', 'conflict'] as const)('preserves the draft after a %s failure', async (code) => {
    vi.mocked(client.update).mockResolvedValueOnce({ ok: false, code, errors: ['Save failed: ' + code] });
    render(<App />);
    await openBoard();
    editSummary();
    leaveBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));

    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText('Save failed: ' + code)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Unsaved research update')).toBeTruthy();
    expect(savedThesis.summary).toBe(thesis.summary);
  });

  it('preserves the draft after a rejected save and allows a retry', async () => {
    vi.mocked(client.update).mockRejectedValueOnce(new Error('IPC disconnected'));
    render(<App />);
    await openBoard();
    editSummary();
    leaveBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));

    expect(await within(screen.getByRole('dialog')).findByText(/Your edits are still open/)).toBeTruthy();
    expect(screen.getByDisplayValue('Unsaved research update')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));
    await waitFor(() => expect(screen.queryByLabelText('Thesis summary')).toBeNull());
    expect(savedThesis.summary).toBe('Unsaved research update');
  });

  it('validates required form fields before attempting Save and leave', async () => {
    render(<App />);
    await openBoard();
    editSummary('');
    leaveBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));

    expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('Complete the required fields');
    expect(client.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));
    expect((screen.getByLabelText('Thesis summary') as HTMLTextAreaElement).value).toBe('');
  });

  it.each(['dialog', 'editor'] as const)('waits for a pending %s save and prevents duplicate actions', async (source) => {
    let finishSave!: (result: Awaited<ReturnType<LivingThesesStorageClient['update']>>) => void;
    vi.mocked(client.update).mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    render(<App />);
    await openBoard();
    editSummary();
    if (source === 'editor') fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    leaveBoard();
    if (source === 'dialog') fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));

    const dialog = screen.getByRole('dialog');
    for (const button of within(dialog).getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(button);
    }
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(screen.getByLabelText('Thesis summary').closest('fieldset')?.disabled).toBe(true);
    expect(client.update).toHaveBeenCalledTimes(1);

    finishSave({ ok: true, value: { ...thesis, summary: 'Unsaved research update', version: 2 } });
    await waitFor(() => expect(screen.queryByLabelText('Thesis summary')).toBeNull());
  });

  it('keeps edits on the active sidebar item and cancels leaving with Escape', async () => {
    render(<App />);
    await openBoard();
    editSummary();
    fireEvent.click(screen.getByRole('button', { name: 'Thesis Board' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByDisplayValue('Unsaved research update')).toBeTruthy();

    leaveBoard();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByDisplayValue('Unsaved research update')).toBeTruthy();
    expect(client.update).not.toHaveBeenCalled();
  });
});
