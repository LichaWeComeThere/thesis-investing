// @vitest-environment jsdom
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeLivingThesisReviewWorkflowStep,
  type LivingThesis,
  type LivingThesisHistory,
  type LivingThesisReviewWorkflow
} from '@thesis-investing/core';
import { createSqliteStorage } from '../../storage/sqlite';
import { createDecisionsStorageService } from '../../main/decisionsStorageService';
import { createReviewSessionStorageService } from '../../main/reviewSessionStorageService';
import { createLivingThesesStorageService } from '../../main/livingThesesStorageService';
import { createThesisHistoryStorageService } from '../../main/thesisHistoryStorageService';
import * as decisionClients from './decisionsStorageClient';
import * as reviewClients from './reviewSessionsStorageClient';
import * as thesisClients from './livingThesesStorageClient';
import * as historyClients from './thesisHistoryStorageClient';
import { markOnboardingCompleted } from './onboardingState';
import { App } from './App';
import { ThesisHealthPanel } from './ThesisHealthPanel';

const createdAt = '2026-09-01T10:00:00.000Z';
const referenceTime = '2026-09-19T12:00:00.000Z';
const thesis: LivingThesis = {
  id: 'health-ui-thesis', version: 1, entityName: 'Acme Research', ticker: 'ACME',
  title: 'Durable execution', summary: 'Recurring demand supports this research.', lifecycle: 'active',
  conviction: 'medium', riskLevel: 'low', nextReviewAt: '2026-09-25',
  risks: [{ id: 'health-ui-risk', thesisId: 'health-ui-thesis', title: 'Customer concentration',
    severity: 'high', status: 'open', createdAt, updatedAt: createdAt }],
  catalysts: [], createdAt, updatedAt: createdAt
};
let directory: string;
let filename: string;
let decisions: ReturnType<typeof createDecisionsStorageService>;
let reviews: ReturnType<typeof createReviewSessionStorageService>;
let theses: ReturnType<typeof createLivingThesesStorageService>;
let history: ReturnType<typeof createThesisHistoryStorageService>;

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(referenceTime);
  localStorage.clear(); markOnboardingCompleted();
  directory = mkdtempSync(join(tmpdir(), 'thesis-health-ui-')); filename = join(directory, 'research.sqlite');
  const storage = await createSqliteStorage({ filename });
  value(storage.repositories.livingTheses.create(thesis)); storage.close();
  const factory = () => createSqliteStorage({ filename });
  decisions = createDecisionsStorageService(factory);
  reviews = createReviewSessionStorageService(factory);
  theses = createLivingThesesStorageService(factory);
  history = createThesisHistoryStorageService(factory);
  vi.spyOn(decisionClients, 'getDefaultDecisionsStorageClient').mockReturnValue(decisions);
  vi.spyOn(reviewClients, 'getDefaultReviewSessionsStorageClient').mockReturnValue(reviews);
  vi.spyOn(thesisClients, 'getDefaultLivingThesesStorageClient').mockReturnValue(theses);
  vi.spyOn(historyClients, 'getDefaultThesisHistoryStorageClient').mockReturnValue(history);
});
afterEach(async () => {
  cleanup(); vi.restoreAllMocks(); vi.useRealTimers();
  await Promise.all([decisions.close(), reviews.close(), theses.close(), history.close()]);
  rmSync(directory, { recursive: true, force: true });
});

async function openBoard(waitForHealth = true) {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Theses' }));
  await screen.findByRole('heading', { name: 'History' });
  if (waitForHealth) await screen.findByRole('region', { name: 'Saved research' });
}

async function completeReview(resolveRisk = false) {
  const started = value(await reviews.start(thesis.id));
  let workflow: LivingThesisReviewWorkflow = {
    ...started.workflow, reviewReason: 'Check whether customer concentration has improved',
    scoreDraft: { kind: 'skip' },
    draft: { ...started.workflow.draft, risks: started.workflow.draft.risks.map((risk) =>
      resolveRisk ? { ...risk, status: 'resolved', detail: 'New customers reduced the concentration.' } : risk) }
  };
  while (workflow.activeStep !== 'complete_review') {
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep));
  }
  return value(await reviews.complete(started.id, workflow, started.version));
}

async function replaceThesis(changes: Partial<LivingThesis>) {
  const storage = await createSqliteStorage({ filename });
  const current = storage.repositories.livingTheses.getById(thesis.id)!;
  value(storage.repositories.livingTheses.update({ ...current, ...changes, updatedAt: referenceTime }, current.version));
  storage.close();
}

function research() { return screen.getByRole('region', { name: 'Saved research' }); }
function timing() { return screen.getByRole('region', { name: 'Review timing' }); }
async function waitForResearchStatus(status: string) {
  // A refresh replaces the section while loading; resolve the live node on each attempt.
  await waitFor(() => expect(within(research()).getByText(status)).toBeTruthy());
}

describe('Thesis Health from saved local research', () => {
  it('keeps research concerns independent of review timing and refreshes both after a Board save', async () => {
    await replaceThesis({ nextReviewAt: '2026-10-25' });
    await completeReview();
    await openBoard();
    await waitForResearchStatus('Needs attention');
    expect(within(timing()).getByText('Review scheduled')).toBeTruthy();
    expect(within(research()).getByText(/Customer concentration/)).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'resolved' } });
    fireEvent.change(screen.getByLabelText('Next review'), { target: { value: '2026-09-18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitForResearchStatus('No flagged concerns');
    expect(within(timing()).getByText('Review overdue')).toBeTruthy();
    expect(within(research()).queryByText('Needs attention')).toBeNull();
    expect(value(await theses.getById(thesis.id))).toMatchObject({ nextReviewAt: '2026-09-18',
      risks: [{ status: 'resolved' }] });
  });

  it('explains insufficient saved information rather than treating an unreviewed thesis as healthy', async () => {
    await replaceThesis({ risks: [{ ...thesis.risks[0], status: 'resolved' }], nextReviewAt: undefined });
    await openBoard();
    await waitForResearchStatus('Not enough information');
    expect(within(timing()).getByText('No review date')).toBeTruthy();
    expect(within(research()).queryByText('No flagged concerns')).toBeNull();
    fireEvent.click(screen.getByText('How this is assessed'));
    expect(screen.getByText(/They do not verify the evidence behind your research/)).toBeTruthy();
  });

  it('updates health after the user completes a review that resolves the recorded concern', async () => {
    await openBoard();
    await waitForResearchStatus('Needs attention');
    fireEvent.click(await screen.findByRole('button', { name: 'Start review' }));
    await screen.findByRole('heading', { name: 'Why are you reviewing?' });
    fireEvent.change(screen.getByRole('textbox', { name: /Review reason/ }), { target: { value: 'New evidence resolves customer concentration' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Thesis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Risks & catalysts' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Risk 1 status' }), { target: { value: 'resolved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Business score' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Continue without a new score' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Your assessment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete review' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Complete this review?' })).getByRole('button', { name: 'Complete review' }));
    await screen.findByRole('heading', { name: 'History' });
    await waitForResearchStatus('No flagged concerns');
    expect(within(timing()).getByText('Review due soon')).toBeTruthy();
    expect(value(await reviews.getActive(thesis.id))).toBeNull();
    expect(value(await history.get(thesis.id)).items.filter((item) => item.kind === 'review')).toHaveLength(1);
  });

  it('waits for saved history and displays a retryable error without a reassuring health assessment', async () => {
    await completeReview(true);
    const original = history.get.bind(history);
    let fail!: () => void;
    const gate = new Promise<void>((resolve) => { fail = resolve; });
    const failingRead = vi.spyOn(history, 'get').mockImplementation(async () => {
      await gate; throw new Error('Temporary read failure');
    });
    await openBoard(false);
    expect(screen.getByText('Checking saved thesis health…')).toBeTruthy();
    expect(screen.queryByText('No flagged concerns')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Saved research' })).toBeNull();
    await act(async () => { fail(); await gate; });
    await screen.findByText('Your history could not be loaded. Try again.');
    expect(screen.queryByText('No flagged concerns')).toBeNull();
    failingRead.mockImplementation(original);
    fireEvent.click(within(screen.getByRole('region', { name: 'Thesis health for Acme Research' }))
      .getByRole('button', { name: 'Check again' }));
    await waitForResearchStatus('No flagged concerns');
  });

  it('removes a previously reassuring assessment when the updated saved history cannot be read', async () => {
    await completeReview(true);
    await openBoard();
    await waitForResearchStatus('No flagged concerns');
    const failingRead = vi.spyOn(history, 'get').mockRejectedValue(new Error('Temporary read failure'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'open' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Your history could not be loaded. Try again.');
    expect(screen.queryByText('No flagged concerns')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Saved research' })).toBeNull();
    failingRead.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Try history again' }));
    await waitForResearchStatus('Needs attention');
  });

  it.each(['paused', 'archived'] as const)('keeps concerns visible while review reminders are %s', async (lifecycle) => {
    await completeReview();
    await replaceThesis({ lifecycle, nextReviewAt: '2026-09-10',
      ...(lifecycle === 'archived' ? { archivedAt: referenceTime } : {}) });
    await openBoard();
    await waitForResearchStatus('Needs attention');
    expect(within(timing()).getByText(lifecycle === 'paused' ? 'Reviews paused' : 'Thesis archived')).toBeTruthy();
    expect(within(timing()).queryByText('Review overdue')).toBeNull();
  });

  it('rechecks due dates on focus and each minute without rereading storage, and clears its timer when closed', async () => {
    await completeReview(true);
    const snapshot: LivingThesisHistory = value(await history.get(thesis.id));
    const reads = vi.spyOn(history, 'get');
    vi.useRealTimers(); vi.useFakeTimers();
    let clock = new Date(2026, 8, 24, 23, 59);
    const now = vi.fn(() => clock);
    const rendered = render(<ThesisHealthPanel history={snapshot} clock={now} entityName={thesis.entityName} />);
    expect(within(timing()).getByText('Review due soon')).toBeTruthy();
    clock = new Date(2026, 8, 24, 23, 59, 30);
    const newerSnapshot: LivingThesisHistory = { ...snapshot, thesis: { ...snapshot.thesis,
      version: snapshot.thesis.version + 1, updatedAt: clock.toISOString(),
      risks: snapshot.thesis.risks.map((risk) => ({ ...risk, status: 'open', updatedAt: clock.toISOString() })) } };
    rendered.rerender(<ThesisHealthPanel history={newerSnapshot} clock={now} entityName={thesis.entityName} />);
    expect(within(research()).getByText('Needs attention')).toBeTruthy();
    expect(screen.queryByText(/Thesis health is unavailable/)).toBeNull();
    clock = new Date(2026, 8, 25, 0, 1);
    fireEvent(window, new Event('focus'));
    expect(within(timing()).getByText('Review due today')).toBeTruthy();
    clock = new Date(2026, 8, 26, 0, 1);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(within(timing()).getByText('Review overdue')).toBeTruthy();
    expect(reads).not.toHaveBeenCalled();
    rendered.unmount(); now.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    fireEvent(window, new Event('focus'));
    expect(now).not.toHaveBeenCalled();
  });
});
