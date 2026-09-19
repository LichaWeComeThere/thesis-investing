// @vitest-environment jsdom
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeLivingThesisReviewWorkflowStep, type LivingThesis, type LivingThesisReviewWorkflow } from '@thesis-investing/core';
import { createSqliteStorage } from '../../storage/sqlite';
import { createDecisionsStorageService } from '../../main/decisionsStorageService';
import { createReviewSessionStorageService } from '../../main/reviewSessionStorageService';
import { createLivingThesesStorageService } from '../../main/livingThesesStorageService';
import * as decisionClients from './decisionsStorageClient';
import * as reviewClients from './reviewSessionsStorageClient';
import * as thesisClients from './livingThesesStorageClient';
import { markOnboardingCompleted } from './onboardingState';
import { App } from './App';

const thesis: LivingThesis = { id: 'decision-ui-thesis', version: 1, entityName: 'Acme Research', ticker: 'ACME', title: 'Durable execution', summary: 'Original research summary', lifecycle: 'active', conviction: 'medium', riskLevel: 'low', risks: [], catalysts: [], createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-11T10:00:00.000Z' };
const other = { ...thesis, id: 'decision-ui-other', entityName: 'Beacon Research', title: 'Another thesis' };
let directory: string;
let filename: string;
let decisions: ReturnType<typeof createDecisionsStorageService>;
let reviews: ReturnType<typeof createReviewSessionStorageService>;
let theses: ReturnType<typeof createLivingThesesStorageService>;
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(async () => {
  localStorage.clear(); markOnboardingCompleted();
  directory = mkdtempSync(join(tmpdir(), 'decision-log-ui-')); filename = join(directory, 'research.sqlite');
  const storage = await createSqliteStorage({ filename });
  expect(storage.repositories.livingTheses.create(thesis).ok).toBe(true);
  expect(storage.repositories.livingTheses.create(other).ok).toBe(true); storage.close();
  decisions = createDecisionsStorageService(() => createSqliteStorage({ filename }), { now: () => '2026-09-12T16:20:00.000Z' });
  reviews = createReviewSessionStorageService(() => createSqliteStorage({ filename }), { now: () => '2026-09-12T16:00:00.000Z' });
  theses = createLivingThesesStorageService(() => createSqliteStorage({ filename }));
  vi.spyOn(decisionClients, 'getDefaultDecisionsStorageClient').mockReturnValue(decisions);
  vi.spyOn(reviewClients, 'getDefaultReviewSessionsStorageClient').mockReturnValue(reviews);
  vi.spyOn(thesisClients, 'getDefaultLivingThesesStorageClient').mockReturnValue(theses);
});
afterEach(async () => {
  cleanup(); vi.restoreAllMocks(); await decisions.close(); await reviews.close(); await theses.close();
  rmSync(directory, { recursive: true, force: true });
});
async function openBoard() {
  fireEvent.click(screen.getByRole('button', { name: 'Thesis Board' }));
  await screen.findByDisplayValue(thesis.summary);
  fireEvent.click(screen.getByRole('button', { name: /Acme Research.*Durable execution/ }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add decision' }).hasAttribute('disabled')).toBe(false));
}
async function start() { render(<App />); await openBoard(); fireEvent.click(screen.getByRole('button', { name: 'Add decision' })); }
function write(title = 'Revisit after the next results', rationale = 'Retention evidence is still incomplete.') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Decision' }), { target: { value: title } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Reason' }), { target: { value: rationale } });
}
async function save() { fireEvent.click(screen.getByRole('button', { name: 'Save decision' })); await screen.findByText('Decision saved. You can find it in this thesis’s history.'); }
async function persisted(id = thesis.id) { const result = await decisions.list(id); if (!result.ok) throw new Error(result.errors.join(' ')); return result.value; }
async function completeReview(id: string, reason: string) {
  const started = await reviews.start(id); if (!started.ok) throw new Error(started.errors.join(' '));
  let workflow: LivingThesisReviewWorkflow = { ...started.value.workflow, reviewReason: reason, scoreDraft: { kind: 'skip' } };
  while (workflow.activeStep !== 'complete_review') {
    const step = completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep);
    if (!step.ok) throw new Error(step.errors.join(' ')); workflow = step.value;
  }
  const completed = await reviews.complete(started.value.id, workflow, started.value.version);
  if (!completed.ok) throw new Error(completed.errors.join(' ')); return completed.value;
}

describe('Decision Log with real local storage', () => {
  it('saves a dated read-only decision, reloads it after storage restart, and leaves the thesis unchanged', async () => {
    await start(); expect(screen.getByRole('textbox', { name: 'Decision' })).toBe(document.activeElement);
    write(); await save();
    const entry = (await persisted())[0];
    expect(entry).toMatchObject({ title: 'Revisit after the next results', rationale: 'Retention evidence is still incomplete.', createdAt: '2026-09-12T16:20:00.000Z', kind: 'research_note' });
    expect(screen.getByRole('button', { name: 'Add decision' })).toBe(document.activeElement);
    expect(screen.queryByRole('textbox', { name: 'Decision' })).toBeNull();
    expect(await theses.getById(thesis.id)).toEqual({ ok: true, value: thesis });
    cleanup(); await decisions.close(); await theses.close(); await reviews.close();
    render(<App />); await openBoard();
    expect(await screen.findByRole('heading', { name: entry.title })).toBeTruthy();
    expect(screen.getByText(entry.rationale)).toBeTruthy(); expect(await persisted()).toEqual([entry]);
  });
  it('requires the short decision and reason, preserving entered text on validation failure', async () => {
    await start(); write('Keep researching', '');
    fireEvent.submit(screen.getByRole('textbox', { name: 'Decision' }).closest('form')!);
    expect(await screen.findByText('Enter a decision and a reason before saving.')).toBeTruthy();
    expect(await persisted()).toEqual([]); expect(screen.getByDisplayValue('Keep researching')).toBeTruthy();
    write('Keep researching', 'New evidence is needed.'); await save(); expect(await persisted()).toHaveLength(1);
  });
  it('links to an eligible completed review with readable context and excludes other or unfinished reviews', async () => {
    const completed = await completeReview(thesis.id, 'Quarterly retention review');
    await completeReview(other.id, 'Beacon review'); await reviews.start(thesis.id);
    await start(); write('Keep the thesis under review', 'The latest review left one open question.');
    const selector = screen.getByRole('combobox', { name: 'Linked review (optional)' });
    expect(within(selector).getAllByRole('option')).toHaveLength(2);
    expect(within(selector).getByRole('option', { name: /Quarterly retention review/ })).toBeTruthy();
    expect(within(selector).queryByRole('option', { name: /Beacon review/ })).toBeNull();
    fireEvent.change(selector, { target: { value: completed.session.id } }); await save();
    expect((await persisted())[0]).toMatchObject({ kind: 'review_conclusion', reviewSessionId: completed.session.id });
    expect(screen.getByText(/Quarterly retention review/)).toBeTruthy();
    expect(await theses.getById(thesis.id)).toEqual({ ok: true, value: completed.thesis });
  });
  it('protects a decision on sidebar navigation and saves before leaving', async () => {
    await start(); write();
    const unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved decision' })).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Retention evidence is still incomplete.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save and leave' }));
    await screen.findByRole('heading', { name: 'Dashboard' }); expect(await persisted()).toHaveLength(1);
    const after = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(after); expect(after.defaultPrevented).toBe(false);
  });
  it('guards switching theses and creating a thesis, with explicit discard affecting only the unsaved decision', async () => {
    await start(); write();
    expect(screen.getByRole('button', { name: 'Start review' }).hasAttribute('disabled')).toBe(true);
    expect(document.querySelector('.living-thesis-form')?.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Beacon Research.*Another thesis/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Revisit after the next results')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Beacon Research.*Another thesis/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save and leave' }));
    await screen.findByRole('region', { name: 'Decision log for Beacon Research' });
    expect(await persisted()).toHaveLength(1); expect(await persisted(other.id)).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add decision' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Add decision' })); write('Temporary Beacon decision', 'Temporary notes');
    fireEvent.click(screen.getByRole('button', { name: 'New thesis' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard edits and leave' }));
    await screen.findByRole('heading', { name: 'Create Living Thesis' }); expect(await persisted(other.id)).toHaveLength(0);
  });
  it('keeps a failed save editable and retries using the same request identity', async () => {
    await start(); write();
    const spy = vi.spyOn(decisions, 'create').mockResolvedValueOnce({ ok: false, errors: ['The disk is temporarily unavailable.'] });
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await screen.findByText('The disk is temporarily unavailable.');
    write('Wait for the next report', 'Clarified reasoning after retry.'); await save();
    expect(spy.mock.calls[0][2]).toBe(spy.mock.calls[1][2]); expect(await persisted()).toHaveLength(1);
    expect((await persisted())[0].title).toBe('Wait for the next report');
  });
  it('freezes an unconfirmed save and retries the exact request after a lost reply without duplicate decisions', async () => {
    await start(); write();
    const original = decisions.create.bind(decisions);
    const spy = vi.spyOn(decisions, 'create').mockImplementationOnce(async (...args) => { await original(...args); throw new Error('Reply lost'); });
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await screen.findByText(/Saving could not be confirmed/);
    expect(await persisted()).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Decision' }).closest('fieldset')?.disabled).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Cancel' }).some((button) => button.hasAttribute('disabled'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Discard edits and leave' })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Continue editing' }).hasAttribute('disabled')).toBe(true);
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true })); expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry save and leave' }));
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(spy.mock.calls[1]).toEqual(spy.mock.calls[0]); expect(await persisted()).toHaveLength(1);
  });
  it('blocks duplicate writes and navigation while a save is pending, then leaves after success', async () => {
    await start(); write();
    const original = decisions.create.bind(decisions);
    let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    const spy = vi.spyOn(decisions, 'create').mockImplementationOnce(async (...args) => { await gate; return original(...args); });
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saving…' }));
    expect(screen.getByRole('textbox', { name: 'Decision' }).closest('fieldset')?.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    const dialog = await screen.findByRole('dialog'); expect(within(dialog).getByRole('button', { name: 'Continue editing' }).hasAttribute('disabled')).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1); release();
    await screen.findByRole('heading', { name: 'Dashboard' }); expect(await persisted()).toHaveLength(1);
  });
  it('confirms cancellation, returns focus, and keeps Board edits separate', async () => {
    await start(); write();
    fireEvent.click(within(screen.getByRole('region', { name: 'Decision log for Acme Research' })).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Discard this decision?' })).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByDisplayValue('Retention evidence is still incomplete.')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('region', { name: 'Decision log for Acme Research' })).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard decision' }));
    expect(await persisted()).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Add decision' })).toBe(document.activeElement);
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Unsaved Board changes' } });
    expect(screen.getByRole('button', { name: 'Add decision' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).toBeTruthy();
  });
  it('shows a retryable load failure without pretending history is empty', async () => {
    vi.spyOn(decisions, 'list').mockRejectedValueOnce(new Error('Temporary read failure'));
    render(<App />); fireEvent.click(screen.getByRole('button', { name: 'Thesis Board' }));
    await screen.findByText('The decision log could not be loaded. Try again.');
    expect(screen.queryByText(/No decisions yet/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try loading again' }));
    await screen.findByText(/No decisions yet/);
  });
  it('allows documentary decisions on archived theses without changing their lifecycle', async () => {
    const storage = await createSqliteStorage({ filename });
    const archived = storage.repositories.livingTheses.update({ ...thesis, lifecycle: 'archived' }, thesis.version);
    if (!archived.ok) throw new Error(archived.errors.join(' ')); storage.close();
    await start(); write('Archive the research for later', 'No current research priority.'); await save();
    expect(await persisted()).toHaveLength(1);
    expect(await theses.getById(thesis.id)).toEqual({ ok: true, value: archived.value });
  });
  it('saves in an HTTP preview without randomUUID using a cryptographically generated v4 identity', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
    try {
      await start(); write(); await save();
      expect((await persisted())[0].id).toMatch(/^decision_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      if (descriptor) Object.defineProperty(crypto, 'randomUUID', descriptor);
      else Reflect.deleteProperty(crypto, 'randomUUID');
    }
  });
  it.each(['start', 'resume'] as const)('blocks a new decision while a review %s request is opening', async (method) => {
    if (method === 'resume') await reviews.start(thesis.id);
    let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    if (method === 'start') {
      const original = reviews.start.bind(reviews);
      vi.spyOn(reviews, 'start').mockImplementationOnce(async (id) => { await gate; return original(id); });
    } else {
      const original = reviews.resume.bind(reviews);
      vi.spyOn(reviews, 'resume').mockImplementationOnce(async (id) => { await gate; return original(id); });
    }
    render(<App />); await openBoard();
    fireEvent.click(await screen.findByRole('button', { name: method === 'start' ? 'Start review' : 'Resume review' }));
    expect(screen.getByRole('button', { name: 'Add decision' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Add decision' }));
    expect(screen.queryByRole('textbox', { name: 'Decision' })).toBeNull();
    expect(screen.getByRole('button', { name: /Beacon Research.*Another thesis/ }).hasAttribute('disabled')).toBe(true);
    release(); await screen.findByRole('heading', { name: 'Why are you reviewing?' });
  });
  it('finishes an already pending save before a queued thesis switch and clears that navigation request', async () => {
    await start(); write();
    const original = decisions.create.bind(decisions);
    let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(decisions, 'create').mockImplementationOnce(async (...args) => { await gate; return original(...args); });
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    fireEvent.click(screen.getByRole('button', { name: /Beacon Research.*Another thesis/ }));
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue editing' }).hasAttribute('disabled')).toBe(true);
    release(); await screen.findByRole('region', { name: 'Decision log for Beacon Research' });
    expect(await persisted()).toHaveLength(1); expect(await persisted(other.id)).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add decision' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Add decision' })); write('Research Beacon separately', 'A separate company and separate evidence.');
    expect(screen.queryByRole('dialog')).toBeNull();
    await save(); expect(await persisted(other.id)).toHaveLength(1);
  });
});
