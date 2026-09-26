// @vitest-environment jsdom
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSqlitePortfolioRankerStorageService, type PortfolioRankerStorageService } from '../../main/portfolioRankerStorageService';
import { App } from './App';
import { markOnboardingCompleted } from './onboardingState';
import { PortfolioRankerScreen } from './PortfolioRankerScreen';
import * as storageModule from './portfolioRankerStorageClient';

let directory: string;
let filename: string;
let service: PortfolioRankerStorageService;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'ranking-drafts-'));
  filename = join(directory, 'ideas.sqlite');
  service = createSqlitePortfolioRankerStorageService(filename);
  await service.save({ id: 'idea-1', ticker: 'AAA', companyName: 'Alpha', manualScore: 80, notes: 'Saved note' });
  await service.save({ id: 'idea-2', ticker: 'BBB', companyName: 'Beta', manualScore: 60, notes: 'Second note' });
  localStorage.clear();
  markOnboardingCompleted();
  vi.spyOn(storageModule, 'getDefaultPortfolioRankerStorageClient').mockImplementation(() => service);
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await service.close();
  rmSync(directory, { recursive: true, force: true });
  localStorage.clear();
});

function ideas() { return within(screen.getByRole('region', { name: 'Investment ideas' })); }
function row(ticker: string) { return within(ideas().getByText(ticker).closest('article')!); }
async function openEditor(app = false) {
  const view = render(app ? <App /> : <PortfolioRankerScreen storageClient={service} />);
  if (app) fireEvent.click(screen.getByRole('button', { name: 'Thesis Ranking' }));
  await ideas().findByText('AAA');
  fireEvent.click(row('AAA').getByRole('button', { name: 'Edit details' }));
  return view;
}
function changeNote(note = 'Important research update') {
  fireEvent.change(screen.getByLabelText('Notes 1'), { target: { value: note } });
}
function leave() { fireEvent.click(screen.getByRole('button', { name: 'Dashboard' })); }
function dialog() { return within(screen.getByRole('dialog', { name: 'Unsaved ranking changes' })); }
async function savedNote() {
  const result = await service.list();
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value.find((item) => item.id === 'idea-1')?.notes;
}

describe('ranking draft and save protection', () => {
  it('keeps the draft while other-row, add, clear, remove and filter controls are locked', async () => {
    await openEditor();
    changeNote();
    const otherEditor = row('BBB').getByRole('button', { name: 'Edit details' });
    expect((otherEditor as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(otherEditor);
    expect((screen.getByLabelText('Notes 1') as HTMLTextAreaElement).value).toBe('Important research update');
    for (const name of ['+ Add idea', '+ Add another idea', 'Clear entries']) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect((screen.getByLabelText('Search ideas') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Filter ideas') as HTMLSelectElement).disabled).toBe(true);
    fireEvent.click(row('AAA').getByLabelText('More actions for AAA'));
    expect((row('AAA').getByRole('button', { name: 'Remove idea' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(row('BBB').getByRole('button', { name: 'Edit details' }));
    expect((screen.getByLabelText('Notes 2') as HTMLTextAreaElement).value).toBe('Second note');
    expect(await savedNote()).toBe('Saved note');
  });

  it('retains failed edits, retries explicitly, and recovers normalized saved data after restart', async () => {
    const save = vi.spyOn(service, 'save').mockResolvedValueOnce({ ok: false, errors: ['Disk write failed'] });
    const view = await openEditor();
    changeNote('  Persist this reasoning  ');
    fireEvent.change(screen.getByLabelText('Company name 1'), { target: { value: '  Alpha Research  ' } });
    fireEvent.change(screen.getByLabelText('Ticker 1'), { target: { value: 'aaa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Disk write failed')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Edit AAA details' })).toBeTruthy();
    expect(ideas().getByText('Alpha')).toBeTruthy();
    expect(await savedNote()).toBe('Saved note');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByLabelText('Notes 1')).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(ideas().getByText('Alpha Research')).toBeTruthy();
    view.unmount();
    await service.close();
    service = createSqlitePortfolioRankerStorageService(filename);
    await openEditor();
    expect((screen.getByLabelText('Company name 1') as HTMLInputElement).value).toBe('Alpha Research');
    expect((screen.getByLabelText('Ticker 1') as HTMLInputElement).value).toBe('AAA');
    expect((screen.getByLabelText('Notes 1') as HTMLTextAreaElement).value).toBe('Persist this reasoning');
  });

  it('retains the draft after a rejected storage call', async () => {
    vi.spyOn(service, 'save').mockRejectedValueOnce(new Error('IPC disconnected'));
    await openEditor();
    changeNote();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('IPC disconnected')).toBeTruthy();
    expect((screen.getByLabelText('Notes 1') as HTMLTextAreaElement).value).toBe('Important research update');
    expect(await savedNote()).toBe('Saved note');
  });

  it.each([
    ['Ticker 1', '', 'Ticker must be a valid ticker symbol.'],
    ['Ticker 1', 'bad ticker', 'Ticker must be a valid ticker symbol.'],
    ['Manual score 1', 'abc', 'Manual score must be a finite number from 0 to 100.'],
    ['Manual score 1', '101', 'Manual score must be a finite number from 0 to 100.']
  ])('keeps invalid %s input "%s" editable without writing', async (label, value, message) => {
    const save = vi.spyOn(service, 'save');
    await openEditor();
    changeNote();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert').textContent).toContain(message);
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(value);
    expect(save).not.toHaveBeenCalled();
    expect(await savedNote()).toBe('Saved note');
  });

  it('allows the optional score to remain empty', async () => {
    await openEditor();
    fireEvent.change(screen.getByLabelText('Manual score 1'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByLabelText('Notes 1')).toBeNull());
    const result = await service.list();
    expect(result.ok && result.value.find((item) => item.id === 'idea-1')?.manualScore).toBeUndefined();
  });
});

describe('ranking navigation', () => {
  it.each(['Continue editing', 'Escape'])('preserves unsaved work with %s', async (choice) => {
    await openEditor(true);
    changeNote();
    leave();
    if (choice === 'Escape') {
      fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    } else {
      fireEvent.click(dialog().getByRole('button', { name: choice }));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((screen.getByLabelText('Notes 1') as HTMLTextAreaElement).value).toBe('Important research update');
    expect(await savedNote()).toBe('Saved note');
  });

  it('discards only the unsaved changes when leaving', async () => {
    await openEditor(true);
    changeNote();
    leave();
    fireEvent.click(dialog().getByRole('button', { name: 'Discard edits and leave' }));
    expect(screen.queryByLabelText('Notes 1')).toBeNull();
    expect(await savedNote()).toBe('Saved note');
  });

  it('saves successfully before leaving and reloads the saved note on return', async () => {
    await openEditor(true);
    changeNote();
    leave();
    fireEvent.click(dialog().getByRole('button', { name: 'Save and leave' }));
    await waitFor(() => expect(screen.queryByLabelText('Notes 1')).toBeNull());
    expect(await savedNote()).toBe('Important research update');
    fireEvent.click(screen.getByRole('button', { name: 'Thesis Ranking' }));
    await ideas().findByText('Alpha');
    fireEvent.click(row('AAA').getByRole('button', { name: 'Edit details' }));
    expect((screen.getByLabelText('Notes 1') as HTMLTextAreaElement).value).toBe('Important research update');
  });

  it('keeps failed Save and leave open for correction or retry', async () => {
    vi.spyOn(service, 'save').mockResolvedValueOnce({ ok: false, errors: ['Disk write failed'] });
    await openEditor(true);
    changeNote();
    leave();
    fireEvent.click(dialog().getByRole('button', { name: 'Save and leave' }));
    expect(await dialog().findByText('Disk write failed')).toBeTruthy();
    expect(await savedNote()).toBe('Saved note');
    fireEvent.click(dialog().getByRole('button', { name: 'Save and leave' }));
    await waitFor(() => expect(screen.queryByLabelText('Notes 1')).toBeNull());
    expect(await savedNote()).toBe('Important research update');
  });

  it('waits for an existing save, locks fields and duplicate saves, then completes queued navigation', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const originalSave = service.save.bind(service);
    const save = vi.spyOn(service, 'save').mockImplementationOnce(async (item) => { await gate; return originalSave(item); });
    await openEditor(true);
    changeNote();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((screen.getByLabelText('Notes 1') as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Saving…' }));
    leave();
    const pending = dialog();
    expect((pending.getByRole('button', { name: 'Continue editing' }) as HTMLButtonElement).disabled).toBe(true);
    expect((pending.getByRole('button', { name: 'Discard edits and leave' }) as HTMLButtonElement).disabled).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => { release(); await gate; });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByLabelText('Notes 1')).toBeNull();
    expect(await savedNote()).toBe('Important research update');
  });

  it('does not leave after an unchanged-row save fails while navigation is queued', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(service, 'save').mockImplementationOnce(async () => { await gate; return { ok: false, errors: ['Disk write failed'] }; });
    await openEditor(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    leave();
    await act(async () => { release(); await gate; });
    expect(await dialog().findByText('Disk write failed')).toBeTruthy();
    expect(screen.getByLabelText('Notes 1')).toBeTruthy();
    fireEvent.click(dialog().getByRole('button', { name: 'Continue editing' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('protects the Re-evaluate thesis shortcut and native reload while dirty', async () => {
    await openEditor(true);
    changeNote();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Re-evaluate thesis' }));
    expect(screen.getByRole('dialog').textContent).toContain('MBS Scorer');
    fireEvent.click(dialog().getByRole('button', { name: 'Continue editing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
    leave();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Investment ideas' })).toBeNull();
  });
});

describe('filtered ranking and new ideas', () => {
  it.each(['+ Add idea', '+ Add another idea'])('%s clears all filters and opens the new row', (name) => {
    render(<PortfolioRankerScreen storageClient={null} />);
    fireEvent.change(screen.getByLabelText('Search ideas'), { target: { value: 'NVDA' } });
    fireEvent.change(screen.getByLabelText('Filter ideas'), { target: { value: 'Strong' } });
    fireEvent.change(screen.getByLabelText('Filter idea status'), { target: { value: 'Active' } });
    fireEvent.click(screen.getByRole('button', { name }));
    const editor = screen.getByRole('region', { name: 'Edit Add ticker details' });
    expect(editor).toBeTruthy();
    expect((screen.getByLabelText('Search ideas') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Filter ideas') as HTMLSelectElement).value).toBe('all');
    expect((screen.getByLabelText('Filter idea status') as HTMLSelectElement).value).toBe('all');
    const ticker = within(editor).getByRole('textbox', { name: /Ticker/ });
    expect(document.activeElement).toBe(ticker);
    fireEvent.change(ticker, { target: { value: 'NEW' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save changes' }));
    expect(ideas().getByText('NEW')).toBeTruthy();
  });

  it('ranks exactly the filtered cards, including hidden samples and empty results', () => {
    render(<PortfolioRankerScreen storageClient={null} />);
    const output = () => within(screen.getByRole('heading', { name: 'Thesis ranking output' }).closest('section')!);
    fireEvent.change(screen.getByLabelText('Search ideas'), { target: { value: 'AVGO' } });
    expect(row('AVGO').getByText('1', { selector: '.portfolio-ranker-rank-badge' })).toBeTruthy();
    expect(output().getAllByText('AVGO').length).toBeGreaterThan(0);
    expect(output().getByText('1 / 1')).toBeTruthy();
    expect(output().queryByText('NVDA')).toBeNull();
    fireEvent.change(screen.getByLabelText('Search ideas'), { target: { value: 'AI Infrastructure' } });
    fireEvent.change(screen.getByLabelText('Filter idea status'), { target: { value: 'Active' } });
    expect(output().getByText('2 / 2')).toBeTruthy();
    expect(row('AVGO').getByText('2', { selector: '.portfolio-ranker-rank-badge' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search ideas'), { target: { value: 'no-such-idea' } });
    expect(ideas().getByText('Nothing found')).toBeTruthy();
    expect(output().getByText('0 / 0')).toBeTruthy();
    expect(output().getByText('No ideas ranked yet')).toBeTruthy();
    expect(output().queryByText('AVGO')).toBeNull();
  });
});
