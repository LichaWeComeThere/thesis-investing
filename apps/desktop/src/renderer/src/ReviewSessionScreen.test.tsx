// @vitest-environment jsdom
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LivingThesis } from '@thesis-investing/core';
import { createSqliteStorage } from '../../storage/sqlite';
import { createReviewSessionStorageService } from '../../main/reviewSessionStorageService';
import { createLivingThesesStorageService } from '../../main/livingThesesStorageService';
import * as reviewClients from './reviewSessionsStorageClient';
import * as thesisClients from './livingThesesStorageClient';
import { markOnboardingCompleted } from './onboardingState';
import { App } from './App';

const thesis: LivingThesis = { id: 'review-ui-test', version: 1, entityName: 'Acme Research', ticker: 'ACME', title: 'Durable execution', summary: 'Original research summary', lifecycle: 'active', conviction: 'medium', riskLevel: 'low', risks: [], catalysts: [], createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-11T10:00:00.000Z' };
let directory: string;
let filename: string;
let reviews: ReturnType<typeof createReviewSessionStorageService>;
let theses: ReturnType<typeof createLivingThesesStorageService>;
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(async () => {
  localStorage.clear(); markOnboardingCompleted();
  directory = mkdtempSync(join(tmpdir(), 'guided-review-')); filename = join(directory, 'research.sqlite');
  const storage = await createSqliteStorage({ filename });
  expect(storage.repositories.livingTheses.create(thesis).ok).toBe(true); storage.close();
  reviews = createReviewSessionStorageService(() => createSqliteStorage({ filename }));
  theses = createLivingThesesStorageService(() => createSqliteStorage({ filename }));
  vi.spyOn(reviewClients, 'getDefaultReviewSessionsStorageClient').mockReturnValue(reviews);
  vi.spyOn(thesisClients, 'getDefaultLivingThesesStorageClient').mockReturnValue(theses);
});
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await reviews.close(); await theses.close(); rmSync(directory, { recursive: true, force: true }); });
async function openBoard() {
  fireEvent.click(screen.getByRole('button', { name: 'Thesis Board' }));
  await screen.findByDisplayValue(thesis.summary);
}
async function start() {
  render(<App />); await openBoard();
  fireEvent.click(await screen.findByRole('button', { name: 'Start review' }));
  await screen.findByRole('heading', { name: 'Why are you reviewing?' });
}
function reason() { fireEvent.change(screen.getByRole('textbox', { name: /Review reason/ }), { target: { value: 'Quarterly thesis check-in.' } }); }
async function toSummary() { reason(); fireEvent.click(screen.getByRole('button', { name: 'Next: Thesis' })); await screen.findByRole('heading', { name: 'Update your thesis' }); }
function editSummary(value = 'Recheck customer retention next quarter.') { fireEvent.change(screen.getByRole('textbox', { name: /^Summary/ }), { target: { value } }); }
async function saved() { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); await screen.findByText('Draft saved locally'); }
async function current() { const result = await reviews.getActive(thesis.id); if (!result.ok || !result.value) throw new Error('Review missing'); return result.value; }

describe('guided review with real draft storage', () => {
  it('starts, saves, closes storage, and resumes the exact draft without changing the thesis', async () => {
    await start(); await toSummary(); editSummary();
    fireEvent.change(screen.getByRole('textbox', { name: 'Review notes (optional)' }), { target: { value: 'A note with trailing space ' } });
    await saved();
    const session = (await current()).session;
    expect(session.workflow.notes).toBe('A note with trailing space ');
    cleanup(); await reviews.close(); await theses.close();
    render(<App />); await openBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Resume review' }));
    await screen.findByDisplayValue('Recheck customer retention next quarter.');
    expect(screen.getByRole('heading', { name: 'Update your thesis' })).toBeTruthy();
    expect(await theses.getById(thesis.id)).toEqual({ ok: true, value: thesis });
    expect((await current()).session.id).toBe(session.id);
  });
  it('keeps optional details tucked away and saves incomplete text before a section is confirmed', async () => {
    await start(); fireEvent.click(screen.getByRole('button', { name: 'Next: Thesis' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    await toSummary(); editSummary('');
    expect(document.querySelector('details')?.open).toBe(false);
    await saved(); expect((await current()).session.workflow.draft.summary).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Next: Risks & catalysts' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Update your thesis' })).toBeTruthy();
  });
  it('keeps edits on Continue editing and saves before sidebar navigation', async () => {
    await start(); await toSummary(); editSummary();
    const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Recheck customer retention next quarter.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save and leave' }));
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect((await current()).session.workflow.draft.summary).toBe('Recheck customer retention next quarter.');
    const cleanEvent = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(cleanEvent); expect(cleanEvent.defaultPrevented).toBe(false);
  });
  it('discards only edits after the last save when returning to the Board', async () => {
    await start(); await toSummary(); editSummary('Saved review text'); await saved(); editSummary('Temporary text');
    fireEvent.click(screen.getByRole('button', { name: 'Return to Board' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard edits and leave' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Resume review' }));
    await screen.findByDisplayValue('Saved review text'); expect(screen.queryByDisplayValue('Temporary text')).toBeNull();
  });
  it('keeps the editor open after a failed save and supports retry', async () => {
    await start(); await toSummary(); editSummary();
    vi.spyOn(reviews, 'saveDraft').mockRejectedValueOnce(new Error('disk unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Your changes have not been saved');
    expect(screen.getByDisplayValue('Recheck customer retention next quarter.')).toBeTruthy();
    await saved(); expect((await current()).session.workflow.draft.summary).toBe('Recheck customer retention next quarter.');
  });
  it('blocks edits and duplicate saves until the active save finishes', async () => {
    await start(); await toSummary(); editSummary();
    const original = reviews.saveDraft.bind(reviews);
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const spy = vi.spyOn(reviews, 'saveDraft').mockImplementationOnce(async (...args) => { await gate; return original(...args); });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByRole('button', { name: 'Saving…' }).hasAttribute('disabled')).toBe(true);
    expect(document.querySelector('.review-fields')?.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue editing' }).hasAttribute('disabled')).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1); finish();
    await screen.findByRole('heading', { name: 'Dashboard' });
  });
  it('preserves newer draft work during a version conflict and requires confirmation to reload', async () => {
    await start(); await toSummary(); editSummary('This window draft');
    const session = (await current()).session;
    expect((await reviews.saveDraft(session.id, { ...session.workflow, reviewReason: 'Saved from another window' }, session.version)).ok).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Your changes have not been saved');
    expect(screen.getByDisplayValue('This window draft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open saved draft…' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('This window draft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open saved draft…' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Open saved draft' }));
    await screen.findByDisplayValue('Saved from another window');
  });
  it('warns on resume if the thesis changed while retaining the saved draft', async () => {
    await start(); reason(); await saved(); cleanup();
    const storage = await createSqliteStorage({ filename });
    expect(storage.repositories.livingTheses.update({ ...thesis, title: 'New saved thesis title' }, 1).ok).toBe(true); storage.close();
    render(<App />); await openBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Resume review' }));
    await screen.findByText('The saved thesis has changed since this review began.');
    expect(screen.getByDisplayValue('Quarterly thesis check-in.')).toBeTruthy();
  });
  it('walks through risks, an explicit score skip, assessment, and a draft-only preview', async () => {
    await start(); await toSummary(); editSummary();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Risks & catalysts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add risk' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Risk 1' }), { target: { value: 'Customer concentration' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Business score' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Continue without a new score' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Your assessment' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Your confidence' }), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review draft' }));
    expect(screen.getByRole('heading', { name: 'Read your review draft' })).toBeTruthy();
    expect(screen.getByText('Customer concentration · open · unrated')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Complete review|Finish|Publish/ })).toBeNull();
    await saved();
    const { session } = await current();
    expect(session.workflow.status).toBe('in_progress'); expect(session.workflow.scoreDraft.kind).toBe('skip');
    expect(session.workflow.draft.risks[0].title).toBe('Customer concentration');
    expect(await theses.getById(thesis.id)).toEqual({ ok: true, value: thesis });
  });
  it('preserves partial score inputs, requires every rating before continuing, and previews the selected score', async () => {
    await start(); await toSummary();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Risks & catalysts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Business score' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Enter new ratings' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Business quality' }), { target: { value: '0' } });
    await saved();
    expect((await current()).session.workflow.scoreDraft).toEqual({ kind: 'score', input: { businessQuality: 0 } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Your assessment' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    for (const name of ['Competitive advantage', 'Management', 'Balance sheet', 'Growth', 'Valuation', 'Risk resilience']) {
      fireEvent.change(screen.getByRole('spinbutton', { name }), { target: { value: '8' } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Next: Your assessment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review draft' }));
    expect(screen.getByText('0 / 10')).toBeTruthy();
    await saved(); expect((await current()).session.workflow.scoreDraft.kind).toBe('score');
  });
  it('requires saved Board edits before starting a review', async () => {
    render(<App />); await openBoard();
    await screen.findByRole('button', { name: 'Start review' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Unsaved Board research' } });
    expect(screen.getByRole('button', { name: 'Start review' }).hasAttribute('disabled')).toBe(true);
    expect(await reviews.getActive(thesis.id)).toEqual({ ok: true, value: null });
  });
});
