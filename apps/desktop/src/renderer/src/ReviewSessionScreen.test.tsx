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
import { ThesisBoardScreen } from './ThesisBoardScreen';

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
  fireEvent.click(screen.getByRole('button', { name: 'Theses' }));
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
async function toPreview() {
  await toSummary(); editSummary();
  fireEvent.click(screen.getByRole('button', { name: 'Next: Risks & catalysts' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next: Business score' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Continue without a new score' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next: Your assessment' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next: Review draft' }));
}
async function confirmCompletion() {
  fireEvent.click(screen.getByRole('button', { name: 'Complete review' }));
  const dialog = await screen.findByRole('dialog', { name: 'Complete this review?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Complete review' }));
  return dialog;
}
async function current() { const result = await reviews.getActive(thesis.id); if (!result.ok || !result.value) throw new Error('Review missing'); return result.value; }

describe('guided review with real draft storage', () => {
  it('restores the thesis context after returning from a review and clears earlier creation feedback', async () => {
    render(<ThesisBoardScreen initialTheses={[thesis]} initialFeedback={{ type: 'saved', message: 'Living Thesis created and saved locally.' }} historyClient={null} decisionClient={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start review' }));
    await screen.findByRole('heading', { name: 'Why are you reviewing?' });

    fireEvent.click(screen.getByRole('button', { name: 'Return to theses' }));

    expect(document.activeElement).toBe(await screen.findByRole('heading', { name: 'Acme Research' }));
    expect(screen.queryByText('Living Thesis created and saved locally.')).toBeNull();
  });
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
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Recheck customer retention next quarter.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save and leave' }));
    await screen.findByRole('heading', { name: 'Overview' });
    expect((await current()).session.workflow.draft.summary).toBe('Recheck customer retention next quarter.');
    const cleanEvent = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(cleanEvent); expect(cleanEvent.defaultPrevented).toBe(false);
  });
  it('discards only edits after the last save when returning to the Board', async () => {
    await start(); await toSummary(); editSummary('Saved review text'); await saved(); editSummary('Temporary text');
    fireEvent.click(screen.getByRole('button', { name: 'Return to theses' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard edits and leave' }));
    expect(document.activeElement).toBe(await screen.findByRole('heading', { name: 'Acme Research' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue editing' }).hasAttribute('disabled')).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1); finish();
    await screen.findByRole('heading', { name: 'Overview' });
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
  it('walks through risks, an explicit score skip, assessment, and a preview without applying changes', async () => {
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
    expect(screen.getByRole('button', { name: 'Complete review' })).toBeTruthy();
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Score notes (optional)' }), { target: { value: 'Temporary score notes' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Score notes (optional)' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Your assessment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review draft' }));
    expect(screen.getByText('0 / 10')).toBeTruthy();
    await saved(); expect((await current()).session.workflow.scoreDraft.kind).toBe('score');
    const scoreCompletion = vi.spyOn(reviews, 'complete');
    await confirmCompletion();
    const scoreResult = await scoreCompletion.mock.results[0].value;
    expect(scoreResult.ok, JSON.stringify(scoreResult)).toBe(true);
    await screen.findByText('Review completed. Your thesis and review history are saved. The new business score is saved too.');
    const storage = await createSqliteStorage({ filename });
    const scores = storage.repositories.mbsScoreSnapshots.list();
    expect(scores).toHaveLength(1); expect(scores[0].thesisId).toBe(thesis.id);
    expect(scores[0].input.businessQuality).toBe(0);
    expect(scores[0].input.notes).toBe(''); expect(scores[0].notes).toBeUndefined();
    expect(storage.repositories.thesisRevisions.list(thesis.id)).toHaveLength(1);
    storage.close();
  });
  it('applies the latest unsaved review only after confirmation and refreshes the Board version', async () => {
    await start(); await toPreview();
    fireEvent.click(screen.getByRole('button', { name: /^Your assessment/ }));
    fireEvent.change(screen.getByLabelText('Next review date (optional)'), { target: { value: '2026-12-11' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Review every (days, optional)' }), { target: { value: '91' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review draft' }));
    expect(within(screen.getByRole('region', { name: 'Next review date' })).getByText('2026-12-11')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Review frequency (days)' })).getByText('91')).toBeTruthy();
    const id = (await current()).session.id;
    const completeSpy = vi.spyOn(reviews, 'complete');
    fireEvent.click(screen.getByRole('button', { name: 'Complete review' }));
    const dialog = await screen.findByRole('dialog', { name: 'Complete this review?' });
    expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toBe(document.activeElement);
    expect(completeSpy).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByText('Recheck customer retention next quarter.')).toBeTruthy();
    expect(await theses.getById(thesis.id)).toEqual({ ok: true, value: thesis });
    await confirmCompletion();
    await screen.findByText('Review completed. Your thesis and review history are saved.');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Decision Log' }));
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', 'Recheck customer retention next quarter.');
    expect(await reviews.getActive(thesis.id)).toEqual({ ok: true, value: null });
    expect((await reviews.resume(id)).ok).toBe(false);
    const after = await theses.getById(thesis.id);
    expect(after.ok && after.value.version).toBe(2);
    expect(after.ok && after.value.nextReviewAt).toBe('2026-12-11');
    expect(after.ok && after.value.reviewCadenceDays).toBe(91);
    expect(completeSpy).toHaveBeenCalledWith(id, expect.objectContaining({ draft: expect.objectContaining({ nextReviewAt: '2026-12-11', reviewCadenceDays: 91 }) }), 1);
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Edit after completed review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Changes saved locally. Version 3 is current.');
    const storage = await createSqliteStorage({ filename });
    expect(storage.repositories.thesisRevisions.list(thesis.id)).toHaveLength(1);
    expect(storage.repositories.thesisRevisions.list(thesis.id)[0].after.summary).toBe('Recheck customer retention next quarter.');
    expect(storage.repositories.thesisRevisions.list(thesis.id)[0].after.nextReviewAt).toBe('2026-12-11');
    expect(storage.repositories.thesisRevisions.list(thesis.id)[0].after.reviewCadenceDays).toBe(91);
    storage.close();
  });
  it('retains all draft changes after a rejected completion and retries explicitly', async () => {
    await start(); await toPreview();
    vi.spyOn(reviews, 'complete').mockResolvedValueOnce({ ok: false, errors: ['Storage is temporarily unavailable. Try again.'] });
    const dialog = await confirmCompletion();
    await within(dialog).findByText('Storage is temporarily unavailable. Try again.');
    expect(await theses.getById(thesis.id)).toEqual({ ok: true, value: thesis });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByText('Recheck customer retention next quarter.')).toBeTruthy();
    await confirmCompletion();
    await screen.findByText('Review completed. Your thesis and review history are saved.');
  });
  it('blocks repeated completion, editing, window close, and sidebar navigation while completing', async () => {
    await start(); await toPreview();
    const original = reviews.complete.bind(reviews);
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const spy = vi.spyOn(reviews, 'complete').mockImplementationOnce(async (...args) => { await gate; return original(...args); });
    const dialog = await confirmCompletion();
    const pending = within(dialog).getByRole('button', { name: 'Completing review…' });
    expect(pending.hasAttribute('disabled')).toBe(true);
    fireEvent.click(pending);
    expect(within(dialog).getByRole('button', { name: 'Keep editing' }).hasAttribute('disabled')).toBe(true);
    expect(document.querySelector('.review-fields')?.hasAttribute('disabled')).toBe(true);
    const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.getByRole('dialog', { name: 'Complete this review?' })).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(1);
    finish(); await screen.findByText('Review completed. Your thesis and review history are saved.');
    expect(screen.getByRole('heading', { name: 'Theses' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Overview' })).toBeNull();
  });
  it('recovers a lost completion response by retrying the same review without duplicate history', async () => {
    await start(); await toPreview();
    const original = reviews.complete.bind(reviews);
    const spy = vi.spyOn(reviews, 'complete').mockImplementationOnce(async (...args) => {
      const result = await original(...args); expect(result.ok).toBe(true); throw new Error('Response lost');
    });
    const dialog = await confirmCompletion();
    await within(dialog).findByText(/Completion could not be confirmed/);
    expect(screen.getByText('Completion not confirmed')).toBeTruthy();
    const keepEditing = within(dialog).getByRole('button', { name: 'Keep editing' });
    expect(keepEditing.hasAttribute('disabled')).toBe(true);
    fireEvent.click(keepEditing); fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.getByRole('dialog', { name: 'Complete this review?' })).toBeTruthy();
    expect(document.querySelector('.review-fields')?.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.getByRole('dialog', { name: 'Complete this review?' })).toBeTruthy();
    const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Complete review' }));
    await screen.findByText('Review completed. Your thesis and review history are saved.');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]).toEqual(spy.mock.calls[0]);
    const storage = await createSqliteStorage({ filename });
    expect(storage.repositories.thesisRevisions.list(thesis.id)).toHaveLength(1);
    expect(storage.repositories.livingTheses.getById(thesis.id)?.version).toBe(2);
    storage.close();
  });
  it.each(['active', 'archived'] as const)('blocks completion when the source thesis changes to %s and retains the draft', async (lifecycle) => {
    await start(); await toPreview();
    const storage = await createSqliteStorage({ filename });
    expect(storage.repositories.livingTheses.update({ ...thesis, lifecycle, summary: 'Newer saved research' }, 1).ok).toBe(true); storage.close();
    const dialog = await confirmCompletion();
    await within(dialog).findByRole('alert');
    expect(within(dialog).getByRole('button', { name: 'Complete review' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByText('Recheck customer retention next quarter.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Complete review' }).hasAttribute('disabled')).toBe(true);
    await saved();
    const stored = await theses.getById(thesis.id);
    expect(stored.ok && stored.value.summary).toBe('Newer saved research');
    expect((await current()).session.workflow.draft.summary).toBe('Recheck customer retention next quarter.');
  });
  it('requires saved Board edits before starting a review', async () => {
    render(<App />); await openBoard();
    await screen.findByRole('button', { name: 'Start review' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Unsaved Board research' } });
    expect(screen.getByRole('button', { name: 'Start review' }).hasAttribute('disabled')).toBe(true);
    expect(await reviews.getActive(thesis.id)).toEqual({ ok: true, value: null });
  });
});
