// @vitest-environment jsdom
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeLivingThesisReviewWorkflowStep,
  type LivingThesis,
  type LivingThesisReviewScoreDraft,
  type LivingThesisReviewWorkflow,
  type ManualBusinessScoreInput
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

const createdAt = '2026-09-11T10:00:00.000Z';
const thesis: LivingThesis = {
  id: 'history-ui-thesis', version: 1, entityName: 'Acme Research', ticker: 'ACME',
  title: 'Durable execution', summary: 'Original research summary', lifecycle: 'active',
  conviction: 'medium', riskLevel: 'low',
  risks: [{ id: 'history-ui-risk', thesisId: 'history-ui-thesis', title: 'Customer concentration',
    severity: 'high', status: 'open', createdAt, updatedAt: createdAt }],
  catalysts: [], createdAt, updatedAt: createdAt
};
const other: LivingThesis = { ...thesis, id: 'history-ui-other', entityName: 'Beacon Research',
  title: 'Another thesis', risks: [] };
const scoreInput: ManualBusinessScoreInput = {
  businessQuality: 5, moat: 5, management: 5, balanceSheet: 5, growth: 5, valuation: 5, risk: 5
};
let directory: string;
let filename: string;
let currentTime: string;
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
  localStorage.clear(); markOnboardingCompleted();
  directory = mkdtempSync(join(tmpdir(), 'thesis-history-ui-'));
  filename = join(directory, 'research.sqlite'); currentTime = '2026-09-12T10:00:00.000Z';
  const storage = await createSqliteStorage({ filename });
  value(storage.repositories.livingTheses.create(thesis));
  value(storage.repositories.livingTheses.create(other)); storage.close();
  const factory = () => createSqliteStorage({ filename });
  decisions = createDecisionsStorageService(factory, { now: () => currentTime });
  reviews = createReviewSessionStorageService(factory, { now: () => currentTime });
  theses = createLivingThesesStorageService(factory);
  history = createThesisHistoryStorageService(factory);
  vi.spyOn(decisionClients, 'getDefaultDecisionsStorageClient').mockReturnValue(decisions);
  vi.spyOn(reviewClients, 'getDefaultReviewSessionsStorageClient').mockReturnValue(reviews);
  vi.spyOn(thesisClients, 'getDefaultLivingThesesStorageClient').mockReturnValue(theses);
  vi.spyOn(historyClients, 'getDefaultThesisHistoryStorageClient').mockReturnValue(history);
});
afterEach(async () => {
  cleanup(); vi.restoreAllMocks();
  await Promise.all([decisions.close(), reviews.close(), theses.close(), history.close()]);
  rmSync(directory, { recursive: true, force: true });
});

async function openBoard() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Thesis Board' }));
  fireEvent.click(await screen.findByRole('button', { name: /Acme Research.*Durable execution/ }));
  await screen.findByRole('heading', { name: 'History' });
}

async function completeReview(options: {
  reason?: string;
  summary?: string;
  scoreDraft?: LivingThesisReviewScoreDraft;
  resolveRisk?: boolean;
  thesisId?: string;
} = {}) {
  const started = value(await reviews.start(options.thesisId ?? thesis.id));
  let workflow: LivingThesisReviewWorkflow = {
    ...started.workflow,
    reviewReason: options.reason ?? 'Quarterly evidence review',
    scoreDraft: options.scoreDraft ?? { kind: 'skip' },
    draft: { ...started.workflow.draft,
      summary: options.summary ?? started.workflow.draft.summary,
      risks: started.workflow.draft.risks.map((risk) => options.resolveRisk
        ? { ...risk, status: 'resolved', detail: 'Customer mix became more balanced.' } : risk) }
  };
  while (workflow.activeStep !== 'complete_review') {
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep));
  }
  return value(await reviews.complete(started.id, workflow, started.version));
}

async function addDecision(title: string, rationale: string, reviewSessionId?: string, thesisId = thesis.id) {
  return value(await decisions.create(thesisId, { title, rationale, reviewSessionId }, randomUUID()));
}

function historyRegion(entityName = thesis.entityName) {
  return screen.getByRole('region', { name: `History for ${entityName}` });
}

function expandEntry(text: string | RegExp, index = 0) {
  const matches = within(historyRegion()).getAllByText(text);
  const entry = matches[index].closest('details');
  if (!entry) throw new Error('Expected an expandable history entry.');
  fireEvent.click(entry.querySelector('summary')!);
  expect(entry.open).toBe(true);
  return within(entry);
}

describe('Thesis History with real local storage', () => {
  it('shows saved review changes and compares formally linked scores in chronological order', async () => {
    await completeReview({ reason: 'Retention evidence improved', summary: 'Stronger retention supports the thesis.',
      resolveRisk: true, scoreDraft: { kind: 'score', input: scoreInput } });
    currentTime = '2026-09-13T10:00:00.000Z';
    await completeReview({ reason: 'Business quality improved', summary: 'Recurring research now has stronger evidence.',
      scoreDraft: { kind: 'score', input: { ...scoreInput, businessQuality: 10 } } });
    await openBoard();
    await within(historyRegion()).findAllByText('Review completed');
    const recent = expandEntry('Review completed', 0);
    expect(recent.getByText('Business quality improved')).toBeTruthy();
    expect(recent.getByText('Stronger retention supports the thesis.')).toBeTruthy();
    expect(recent.getByText('Recurring research now has stronger evidence.')).toBeTruthy();
    const earlier = expandEntry('Review completed', 1);
    expect(earlier.getByText('Retention evidence improved')).toBeTruthy();
    expect(earlier.getByText('Original research summary')).toBeTruthy();
    expect(earlier.getByText(/Customer mix became more balanced/)).toBeTruthy();
    const laterScore = expandEntry('Business score: 60 / 100');
    expect(laterScore.getAllByText('+10 points from the previous score')).toHaveLength(2);
    const ratings = laterScore.getByRole('table', { name: 'Ratings recorded with this score' });
    expect(within(ratings).getByRole('row', { name: 'Business quality 10 / 10' })).toBeTruthy();
    const firstScore = expandEntry('Business score: 50 / 100');
    expect(firstScore.getAllByText('First recorded review score')).toHaveLength(2);
  });

  it('records a completed no-change review without inventing a score, and excludes unfinished reviews', async () => {
    await completeReview({ reason: 'The existing evidence remains unchanged' });
    value(await reviews.start(thesis.id));
    await completeReview({ thesisId: other.id, reason: 'A private Beacon review' });
    await openBoard();
    await within(historyRegion()).findByText('Review completed');
    const entry = expandEntry('Review completed');
    expect(entry.getByText('The existing evidence remains unchanged')).toBeTruthy();
    expect(entry.getByText('No thesis changes in this review.')).toBeTruthy();
    expect(entry.getByText(/No new business score/)).toBeTruthy();
    expect(within(historyRegion()).queryByText(/Business score:/)).toBeNull();
    expect(within(historyRegion()).queryByText('A private Beacon review')).toBeNull();
    expect(within(historyRegion()).getAllByText('Review completed')).toHaveLength(1);
  });

  it('keeps the recent list short, expands older decisions, and preserves linked review context after restart', async () => {
    const completed = await completeReview({ reason: 'Review supporting the decision' });
    for (let index = 0; index < 6; index += 1) {
      currentTime = `2026-09-14T10:0${index}:00.000Z`;
      await addDecision(`Decision number ${index + 1}`, `Evidence for decision ${index + 1}`,
        index === 5 ? completed.session.id : undefined);
    }
    await decisions.close(); await reviews.close(); await history.close();
    await openBoard();
    await within(historyRegion()).findByText(/Decision: Decision number 6/);
    expect(within(historyRegion()).queryByText(/Decision: Decision number 1/)).toBeNull();
    fireEvent.click(within(historyRegion()).getByRole('button', { name: /Show all history/ }));
    expect(within(historyRegion()).getByText(/Decision: Decision number 1/)).toBeTruthy();
    const latest = expandEntry(/Decision: Decision number 6/);
    expect(latest.getByText('Evidence for decision 6')).toBeTruthy();
    expect(latest.getByText(/Review supporting the decision/)).toBeTruthy();
    expect(within(historyRegion()).getByText('Thesis created')).toBeTruthy();
  });

  it('refreshes history after saving a decision while retaining the decision and Board navigation guards', async () => {
    await openBoard();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add decision' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Add decision' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Decision' }), { target: { value: 'Wait for new retention evidence' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason' }), { target: { value: 'The current reporting period is incomplete.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved decision' })).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('The current reporting period is incomplete.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await within(historyRegion()).findByText(/Decision: Wait for new retention evidence/);
    expect(value(await decisions.list(thesis.id))).toHaveLength(1);
    expect(value(await theses.getById(thesis.id))).toEqual(thesis);
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Unsaved Board research' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Unsaved thesis changes' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByDisplayValue('Unsaved Board research')).toBeTruthy();
  });

  it('refreshes after a completed review returns to the Board without adding a second completion', async () => {
    await openBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Start review' }));
    await screen.findByRole('heading', { name: 'Why are you reviewing?' });
    fireEvent.change(screen.getByRole('textbox', { name: /Review reason/ }), { target: { value: 'Fresh research from the review flow' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Thesis' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Summary/ }), { target: { value: 'A newly completed review summary.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Risks & catalysts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Business score' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Continue without a new score' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Your assessment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Review draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete review' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Complete this review?' })).getByRole('button', { name: 'Complete review' }));
    await screen.findByDisplayValue('A newly completed review summary.');
    await within(historyRegion()).findByText('Review completed');
    expect(within(historyRegion()).getAllByText('Review completed')).toHaveLength(1);
    expect(expandEntry('Review completed').getByText('Fresh research from the review flow')).toBeTruthy();
    expect(value(await reviews.getActive(thesis.id))).toBeNull();
  });

  it('shows a retryable loading failure instead of claiming that history is empty', async () => {
    await addDecision('Preserve the existing thesis', 'There is already a saved history record.');
    const failingRead = vi.spyOn(history, 'get').mockRejectedValue(new Error('A temporary read failure'));
    await openBoard();
    await screen.findByText('Your history could not be loaded. Try again.');
    expect(within(historyRegion()).queryByText(/No completed reviews or decisions yet/)).toBeNull();
    failingRead.mockRestore();
    fireEvent.click(within(historyRegion()).getByRole('button', { name: 'Try history again' }));
    await within(historyRegion()).findByText(/Decision: Preserve the existing thesis/);
    expect(screen.queryByText('Your history could not be loaded. Try again.')).toBeNull();
  });

  it('refreshes the current archived marker after a Board save without inventing a completed review', async () => {
    await openBoard();
    await within(historyRegion()).findByText('Thesis created');
    expect(within(historyRegion()).queryByText('Currently archived')).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'Lifecycle' }), { target: { value: 'archived' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Thesis summary' }), { target: { value: 'Research saved for later reference.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await within(historyRegion()).findByText('Currently archived');
    expect(within(historyRegion()).getByText(/earlier archive changes may not be recorded/)).toBeTruthy();
    expect(within(historyRegion()).getByText(/Direct edits on the Board may not appear/)).toBeTruthy();
    expect(within(historyRegion()).queryByText('Review completed')).toBeNull();
    expect(value(await theses.getById(thesis.id))).toMatchObject({ lifecycle: 'archived', version: 2,
      summary: 'Research saved for later reference.' });
  });

  it('ignores a delayed read from the previous thesis after selection changes', async () => {
    await addDecision('Acme-only decision', 'This history belongs only to Acme.');
    await addDecision('Beacon-only decision', 'This history belongs only to Beacon.', undefined, other.id);
    const original = history.get.bind(history);
    const acmeResult = await original(thesis.id);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(history, 'get').mockImplementation(async (id) => {
      if (id === thesis.id) { await gate; return acmeResult; }
      return original(id);
    });
    await openBoard();
    fireEvent.click(screen.getByRole('button', { name: /Beacon Research.*Another thesis/ }));
    await within(historyRegion(other.entityName)).findByText(/Decision: Beacon-only decision/);
    await act(async () => { release(); await gate; });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'History for Acme Research' })).toBeNull());
    expect(within(historyRegion(other.entityName)).queryByText(/Acme-only decision/)).toBeNull();
    expect(within(historyRegion(other.entityName)).getByText(/Decision: Beacon-only decision/)).toBeTruthy();
  });
});
