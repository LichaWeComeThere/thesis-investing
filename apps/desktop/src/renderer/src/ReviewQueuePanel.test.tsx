// @vitest-environment jsdom
import type { LivingThesisReviewQueue, LivingThesisReviewQueueItem } from '@thesis-investing/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReviewQueueStorageApi } from '../../shared/reviewQueueStorage';
import { DashboardScreen } from './DashboardScreen';
import { ReviewQueuePanel } from './ReviewQueuePanel';

type QueueResult = Awaited<ReturnType<ReviewQueueStorageApi['get']>>;

function item(overrides: Partial<LivingThesisReviewQueueItem> = {}): LivingThesisReviewQueueItem {
  return {
    thesisId: 'thesis-a', entityName: 'Acme', ticker: 'ACME', title: 'Durable demand',
    lifecycle: 'active', group: 'overdue',
    reviewTiming: { status: 'overdue', dueDate: '2026-09-26', daysUntilDue: -1 },
    researchReasons: [], ...overrides
  };
}

function queue(items: readonly LivingThesisReviewQueueItem[] = [item()], overrides: Partial<LivingThesisReviewQueue> = {}): LivingThesisReviewQueue {
  return {
    algorithmVersion: 1, assessedAt: '2026-09-27T12:00:00.000Z', referenceDate: '2026-09-27',
    eligibleThesisCount: items.length, excludedThesisCount: 0, items, ...overrides
  };
}

function deferred() {
  let resolve!: (result: QueueResult) => void;
  const promise = new Promise<QueueResult>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('ReviewQueuePanel', () => {
  it('shows clear groups, separate timing and concerns, and routes exact saved IDs', async () => {
    const rows = [
      item({ thesisId: 'thesis-draft', entityName: 'Draft company', group: 'in_progress',
        review: { sessionId: 'session-specific', updatedAt: '2026-09-27T10:00:00.000Z', baselineStatus: 'changed' },
        researchReasons: [{ code: 'overall_risk_high', message: 'The saved overall risk level is high.' }] }),
      item(),
      item({ thesisId: 'thesis-soon', entityName: 'Soon company', group: 'due_soon', reviewTiming: { status: 'due_today', dueDate: '2026-09-27', daysUntilDue: 0 } }),
      item({ thesisId: 'thesis-concern', entityName: 'Concern company', group: 'research_concerns', reviewTiming: { status: 'not_scheduled' },
        researchReasons: [{ code: 'open_high_risks', message: 'Open risks rated high: Capacity.' }] })
    ];
    const onOpenThesis = vi.fn();
    render(<ReviewQueuePanel storageClient={{ get: vi.fn().mockResolvedValue({ ok: true, value: queue(rows) }) }} onOpenThesis={onOpenThesis} />);

    await screen.findByRole('article', { name: 'Draft company: Durable demand' });
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Continue a review', 'Overdue', 'Due soon', 'Research concerns']);
    const draft = within(screen.getByRole('article', { name: 'Draft company: Durable demand' }));
    expect(draft.getByText('Review timing').parentElement?.textContent).toContain('1 day overdue');
    expect(draft.getByText('The saved overall risk level is high.')).toBeTruthy();
    expect(draft.getByText('Thesis changed since this draft began. Check it before continuing.')).toBeTruthy();
    fireEvent.click(draft.getByRole('button', { name: 'Resume review' }));
    expect(onOpenThesis).toHaveBeenLastCalledWith({ thesisId: 'thesis-draft', reviewSessionId: 'session-specific' });
    fireEvent.click(within(screen.getByRole('article', { name: 'Acme: Durable demand' })).getByRole('button', { name: 'Open thesis' }));
    expect(onOpenThesis).toHaveBeenLastCalledWith({ thesisId: 'thesis-a' });
    expect(screen.getByText('No review date set')).toBeTruthy();
    expect(screen.getByText(/Due today/)).toBeTruthy();
  });

  it('places the queue after the thesis introduction and before the tools on Overview', async () => {
    const onOpenThesis = vi.fn();
    render(<DashboardScreen summaryStorageClient={null} queueStorageClient={{ get: vi.fn().mockResolvedValue({ ok: true, value: queue() }) }} onOpenThesis={onOpenThesis} />);
    await screen.findByRole('article');
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Start with your thesis.', 'Needs review', 'Make progress on an idea', 'Saved in your tools']);
    fireEvent.click(screen.getByRole('button', { name: 'Open thesis' }));
    expect(onOpenThesis).toHaveBeenCalledWith({ thesisId: 'thesis-a' });
  });

  it('keeps loading, unavailable preview, no theses, and empty queue states distinct', async () => {
    const request = deferred();
    const get = vi.fn().mockReturnValue(request.promise);
    const view = render(<ReviewQueuePanel storageClient={{ get }} />);
    expect(screen.getByRole('status').textContent).toBe('Loading your review queue…');
    expect(screen.queryByText('No saved theses yet.')).toBeNull();
    await act(async () => { request.resolve({ ok: true, value: queue([]) }); });
    expect(screen.getByText('No saved theses yet.')).toBeTruthy();
    expect(screen.getByText(/Paused and archived theses are excluded/)).toBeTruthy();

    view.rerender(<ReviewQueuePanel storageClient={{ get: vi.fn().mockResolvedValue({ ok: true, value: queue([], { eligibleThesisCount: 3, excludedThesisCount: 2 }) }) }} />);
    expect(await screen.findByText('Nothing is queued for review today.')).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
    expect(screen.getByText(/more than seven days away are not listed for timing alone/)).toBeTruthy();

    view.rerender(<ReviewQueuePanel storageClient={null} />);
    expect(screen.getByText(/Your review queue is unavailable in this preview/)).toBeTruthy();
    expect(screen.queryByText('Nothing is queued for review today.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();
  });

  it('shows a failed first read as an error and retries without pretending the queue is empty', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce({ ok: false, errors: ['The saved history could not be read.'] })
      .mockResolvedValueOnce({ ok: true, value: queue() });
    render(<ReviewQueuePanel storageClient={{ get }} />);
    expect((await screen.findByRole('alert')).textContent).toContain('The saved history could not be read.');
    expect(screen.queryByText('No saved theses yet.')).toBeNull();
    expect(screen.queryByText('Nothing is queued for review today.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('article')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('keeps rows and focus during refresh, then marks stale rows unavailable on failure until retry succeeds', async () => {
    const refresh = deferred();
    const get = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: queue() })
      .mockReturnValueOnce(refresh.promise)
      .mockRejectedValueOnce(new Error('Storage disconnected.'))
      .mockResolvedValueOnce({ ok: true, value: queue() });
    const onOpenThesis = vi.fn();
    render(<ReviewQueuePanel storageClient={{ get }} onOpenThesis={onOpenThesis} />);
    const button = await screen.findByRole('button', { name: 'Open thesis' });
    button.focus();
    fireEvent(window, new Event('focus'));
    expect(screen.getByRole('status').textContent).toBe('Refreshing review queue…');
    expect(screen.getByRole('button', { name: 'Open thesis' })).toBe(button);
    expect(document.activeElement).toBe(button);
    await act(async () => { refresh.resolve({ ok: true, value: queue([item({ group: 'due_soon', reviewTiming: { status: 'due_today', daysUntilDue: 0 } })]) }); });
    expect(screen.getByRole('button', { name: 'Open thesis' })).toBe(button);
    expect(document.activeElement).toBe(button);

    fireEvent(window, new Event('focus'));
    expect((await screen.findByRole('alert')).textContent).toContain('Storage disconnected.');
    expect(screen.getByRole('article')).toBeTruthy();
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onOpenThesis).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('alert')).toBeNull();
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it('refreshes on focus and local calendar rollover, and removes polling and listeners on unmount', async () => {
    vi.useFakeTimers();
    let now = new Date(2026, 8, 27, 23, 59, 0);
    const clock = () => now;
    const get = vi.fn().mockResolvedValue({ ok: true, value: queue() });
    const view = render(<ReviewQueuePanel storageClient={{ get }} clock={clock} />);
    await act(async () => { await Promise.resolve(); });
    expect(get).toHaveBeenLastCalledWith('2026-09-27');
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(get).toHaveBeenCalledTimes(1);
    now = new Date(2026, 8, 28, 0, 0, 0);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenLastCalledWith('2026-09-28');
    await act(async () => { fireEvent(window, new Event('focus')); });
    expect(get).toHaveBeenCalledTimes(3);
    view.unmount();
    now = new Date(2026, 8, 29, 0, 0, 0);
    await act(async () => { vi.advanceTimersByTime(60_000); fireEvent(window, new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(get).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores older responses after a newer refresh and pending responses after unmount', async () => {
    const older = deferred();
    const newer = deferred();
    const last = deferred();
    const get = vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise).mockReturnValueOnce(last.promise);
    const view = render(<ReviewQueuePanel storageClient={{ get }} />);
    fireEvent(window, new Event('focus'));
    await act(async () => { newer.resolve({ ok: true, value: queue([item({ entityName: 'Latest company' })]) }); });
    await act(async () => { older.resolve({ ok: false, errors: ['Old response.'] }); });
    expect(screen.getByRole('article', { name: 'Latest company: Durable demand' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent(window, new Event('focus'));
    view.unmount();
    await act(async () => { last.resolve({ ok: true, value: queue() }); });
    expect(screen.queryByRole('article')).toBeNull();
  });
});
