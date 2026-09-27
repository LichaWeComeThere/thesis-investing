// @vitest-environment jsdom
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeLivingThesisReviewWorkflowStep,
  updateLivingThesisReviewReason,
  type LivingThesis,
  type LivingThesisReviewSession
} from '@thesis-investing/core';
import { createSqliteStorage } from '../../storage/sqlite';
import { createReviewSessionStorageService } from '../../main/reviewSessionStorageService';
import { createLivingThesesStorageService } from '../../main/livingThesesStorageService';
import { createReviewQueueStorageService } from '../../main/reviewQueueStorageService';
import * as reviewClients from './reviewSessionsStorageClient';
import * as thesisClients from './livingThesesStorageClient';
import * as queueClients from './reviewQueueStorageClient';
import { markOnboardingCompleted } from './onboardingState';
import { App } from './App';

const first: LivingThesis = {
  id: 'queue-first', version: 1, entityName: 'First Company', ticker: 'FIRST',
  title: 'Newest saved thesis', summary: 'The first thesis must not replace the requested one.',
  lifecycle: 'active', conviction: 'medium', riskLevel: 'low', risks: [], catalysts: [],
  nextReviewAt: '2026-09-01', createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-12T10:00:00.000Z'
};
const target: LivingThesis = {
  ...first, id: 'queue-target', entityName: 'Target Company', ticker: 'TARGET',
  title: 'Exact requested thesis', summary: 'Original target thesis summary',
  updatedAt: '2026-09-11T10:00:00.000Z'
};
let directory: string;
let filename: string;
let reviews: ReturnType<typeof createReviewSessionStorageService>;
let theses: ReturnType<typeof createLivingThesesStorageService>;
let queue: ReturnType<typeof createReviewQueueStorageService>;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(async () => {
  localStorage.clear();
  markOnboardingCompleted();
  directory = mkdtempSync(join(tmpdir(), 'queue-navigation-'));
  filename = join(directory, 'research.sqlite');
  const storage = await createSqliteStorage({ filename });
  expect(storage.repositories.livingTheses.create(first).ok).toBe(true);
  expect(storage.repositories.livingTheses.create(target).ok).toBe(true);
  expect(storage.repositories.livingTheses.list().map(({ id }) => id)).toEqual([first.id, target.id]);
  storage.close();
  const now = () => '2026-09-27T12:00:00.000Z';
  reviews = createReviewSessionStorageService(() => createSqliteStorage({ filename }), { now });
  theses = createLivingThesesStorageService(() => createSqliteStorage({ filename }), { now });
  queue = createReviewQueueStorageService(() => createSqliteStorage({ filename }), { now });
  vi.spyOn(reviewClients, 'getDefaultReviewSessionsStorageClient').mockReturnValue(reviews);
  vi.spyOn(thesisClients, 'getDefaultLivingThesesStorageClient').mockReturnValue(theses);
  vi.spyOn(queueClients, 'getDefaultReviewQueueStorageClient').mockReturnValue(queue);
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await Promise.all([reviews.close(), theses.close(), queue.close()]);
  rmSync(directory, { recursive: true, force: true });
});

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

async function savedReview(thesisId = target.id): Promise<LivingThesisReviewSession> {
  const session = value(await reviews.start(thesisId));
  const withReason = value(updateLivingThesisReviewReason(session.workflow, `Saved reason for ${thesisId}`));
  const workflow = value(completeLivingThesisReviewWorkflowStep(withReason, 'start_review'));
  return value(await reviews.saveDraft(session.id, {
    ...workflow, draft: { ...workflow.draft, summary: `Saved draft for ${thesisId}` }
  }, session.version));
}

async function queuedTarget(title = target.title): Promise<HTMLElement> {
  return screen.findByRole('article', { name: `${target.entityName}: ${title}` });
}

async function openTarget(action: 'Open thesis' | 'Resume review'): Promise<void> {
  fireEvent.click(within(await queuedTarget()).getByRole('button', { name: action }));
}

describe('Overview queue navigation with saved research', () => {
  it('opens and focuses the exact non-first thesis without starting a review', async () => {
    const start = vi.spyOn(reviews, 'start');
    const resume = vi.spyOn(reviews, 'resume');
    render(<App />);

    await openTarget('Open thesis');

    const heading = await screen.findByRole('heading', { name: target.entityName });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    expect(screen.queryByDisplayValue(first.summary)).toBeNull();
    expect(start).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
    expect(await reviews.getActive(target.id)).toEqual({ ok: true, value: null });
  });

  it('resumes the exact saved draft and step, focuses its heading, and leaves the thesis unchanged', async () => {
    await savedReview(first.id);
    const session = await savedReview();
    const start = vi.spyOn(reviews, 'start');
    const resume = vi.spyOn(reviews, 'resume');
    const save = vi.spyOn(reviews, 'saveDraft');
    render(<App />);

    await openTarget('Resume review');

    const heading = await screen.findByRole('heading', { name: 'Update your thesis' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole('textbox', { name: /^Summary/ })).toHaveProperty('value', `Saved draft for ${target.id}`);
    expect(screen.queryByDisplayValue(`Saved draft for ${first.id}`)).toBeNull();
    expect(resume).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledWith(session.id);
    expect(start).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(await theses.getById(target.id)).toEqual({ ok: true, value: target });
  });

  it('reports a review that ended after the queue loaded and never creates a replacement', async () => {
    const session = await savedReview();
    const start = vi.spyOn(reviews, 'start');
    render(<App />);
    await queuedTarget();
    expect((await reviews.abandon(session.id, session.version)).ok).toBe(true);

    await openTarget('Resume review');

    await screen.findByText('This review has ended and cannot be resumed.');
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    expect(screen.queryByRole('heading', { name: 'Update your thesis' })).toBeNull();
    expect(start).not.toHaveBeenCalled();
    expect(await reviews.getActive(target.id)).toEqual({ ok: true, value: null });
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(within(await queuedTarget()).getByRole('button', { name: 'Open thesis' })).toBeTruthy();
  });

  it('reports a missing saved session without falling back to another review', async () => {
    await savedReview();
    const snapshot = value(await queue.get('2026-09-27'));
    vi.spyOn(queue, 'get').mockResolvedValueOnce({ ok: true, value: {
      ...snapshot, items: snapshot.items.map((item) => item.thesisId === target.id
        ? { ...item, review: { ...item.review!, sessionId: 'missing-review' } } : item)
    } });
    const start = vi.spyOn(reviews, 'start');
    const resume = vi.spyOn(reviews, 'resume');
    render(<App />);

    await openTarget('Resume review');

    await screen.findByText('The review session was not found.');
    expect(resume).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledWith('missing-review');
    expect(start).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Update your thesis' })).toBeNull();
  });

  it('rejects a saved session that belongs to another thesis', async () => {
    const unrelated = await savedReview(first.id);
    await savedReview();
    const snapshot = value(await queue.get('2026-09-27'));
    vi.spyOn(queue, 'get').mockResolvedValueOnce({ ok: true, value: {
      ...snapshot, items: snapshot.items.map((item) => item.thesisId === target.id
        ? { ...item, review: { ...item.review!, sessionId: unrelated.id } } : item)
    } });
    const start = vi.spyOn(reviews, 'start');
    render(<App />);

    await openTarget('Resume review');

    await screen.findByText('The saved review has changed. Check the current thesis and its review before continuing.');
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    expect(screen.queryByDisplayValue(`Saved draft for ${first.id}`)).toBeNull();
    expect(start).not.toHaveBeenCalled();
  });

  it('shows a useful missing-thesis state without selecting the first saved thesis', async () => {
    const start = vi.spyOn(reviews, 'start');
    const resume = vi.spyOn(reviews, 'resume');
    render(<App />);
    await queuedTarget();
    vi.spyOn(theses, 'list').mockResolvedValueOnce({ ok: true, value: [first] });

    await openTarget('Open thesis');

    await screen.findByText('That thesis is no longer available. Choose a saved thesis, or return to the list and refresh it.');
    expect(screen.queryByRole('textbox', { name: 'Thesis summary' })).toBeNull();
    expect(screen.queryByRole('heading', { name: first.entityName })).toBeNull();
    expect(screen.getByText('Choose a thesis to get started.')).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it('retains the exact thesis target when a failed Board load is retried', async () => {
    const start = vi.spyOn(reviews, 'start');
    vi.spyOn(theses, 'list').mockRejectedValueOnce(new Error('temporary read failure'));
    render(<App />);

    await openTarget('Open thesis');

    await screen.findByText('Your saved theses could not be loaded. Try again.');
    expect(screen.queryByRole('textbox', { name: 'Thesis summary' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    const heading = await screen.findByRole('heading', { name: target.entityName });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    expect(start).not.toHaveBeenCalled();
  });

  it.each(['archived', 'paused'] as const)('rechecks a thesis that became %s after the queue loaded', async (lifecycle) => {
    await savedReview();
    const start = vi.spyOn(reviews, 'start');
    const resume = vi.spyOn(reviews, 'resume');
    render(<App />);
    await queuedTarget();
    expect((await theses.update({ ...target, lifecycle }, target.version)).ok).toBe(true);

    await openTarget('Resume review');

    await screen.findByText('This review could not be opened from Overview. Check the current thesis and its saved review below.');
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    expect(resume).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('keeps the requested thesis visible after a failed resume and never starts a new review', async () => {
    const session = await savedReview();
    const start = vi.spyOn(reviews, 'start');
    vi.spyOn(reviews, 'resume').mockRejectedValueOnce(new Error('storage interrupted'));
    render(<App />);

    await openTarget('Resume review');

    await screen.findByText('The saved review could not be opened. Check the review below and try again.');
    expect(screen.getByRole('textbox', { name: 'Thesis summary' })).toHaveProperty('value', target.summary);
    expect(start).not.toHaveBeenCalled();
    expect(value(await reviews.getActive(target.id))?.session.id).toBe(session.id);
  });

  it('prevents a second review request while queue resume is pending and retains the edit guard afterward', async () => {
    const session = await savedReview();
    const originalResume = reviews.resume.bind(reviews);
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const resume = vi.spyOn(reviews, 'resume').mockImplementationOnce(async (id) => {
      await pending;
      return originalResume(id);
    });
    const start = vi.spyOn(reviews, 'start');
    render(<App />);
    await openTarget('Resume review');

    const launcher = await screen.findByRole('button', { name: 'Resume review' });
    expect(launcher.hasAttribute('disabled')).toBe(true);
    fireEvent.click(launcher);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledWith(session.id);
    expect(start).not.toHaveBeenCalled();
    finish();

    fireEvent.change(await screen.findByRole('textbox', { name: /^Summary/ }), { target: { value: 'Protected resumed review edit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Protected resumed review edit')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Overview' })).toBeNull();
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it('guards review edits on return to Overview, saves before leaving, and reloads the saved queue', async () => {
    const session = await savedReview();
    const getQueue = vi.spyOn(queue, 'get');
    const start = vi.spyOn(reviews, 'start');
    render(<App />);
    await openTarget('Resume review');
    fireEvent.change(await screen.findByRole('textbox', { name: /^Summary/ }), { target: { value: 'Review edit saved before return' } });

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Review edit saved before return')).toBeTruthy();
    expect(getQueue).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save and leave' }));

    await queuedTarget();
    expect(getQueue).toHaveBeenCalledTimes(2);
    const saved = value(await reviews.getActive(target.id));
    expect(saved?.session.id).toBe(session.id);
    expect(saved?.session.workflow.draft.summary).toBe('Review edit saved before return');
    expect(await theses.getById(target.id)).toEqual({ ok: true, value: target });
    await openTarget('Resume review');
    await screen.findByDisplayValue('Review edit saved before return');
    expect(start).not.toHaveBeenCalled();
  });

  it('guards thesis edits and refreshes the queue title from the saved thesis on return', async () => {
    const getQueue = vi.spyOn(queue, 'get');
    render(<App />);
    await openTarget('Open thesis');
    fireEvent.change(await screen.findByRole('textbox', { name: 'Thesis title' }), { target: { value: 'Updated target thesis title' } });

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Updated target thesis title')).toBeTruthy();
    expect(getQueue).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved thesis changes' })).getByRole('button', { name: 'Save and leave' }));

    await queuedTarget('Updated target thesis title');
    expect(getQueue).toHaveBeenCalledTimes(2);
    expect(value(await theses.getById(target.id)).title).toBe('Updated target thesis title');
    expect(value(await theses.getById(first.id))).toEqual(first);
  });
});
