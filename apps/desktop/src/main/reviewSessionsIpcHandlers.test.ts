import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { createReviewSessionStorageService } from './reviewSessionStorageService';
import { createReviewSessionsIpcHandlers } from './reviewSessionsIpcHandlers';
import { createReviewSessionsPreloadApi } from '../preload/reviewSessionsPreload';
import { reviewSessionsStorageChannels as channels } from '../shared/reviewSessionsStorage';
import type { LivingThesis } from '@thesis-investing/core';

let storage: SqliteStorage | undefined;
afterEach(() => storage?.close());
const thesis: LivingThesis = { id: 'ipc-thesis', version: 1, entityName: 'Acme', title: 'Research', summary: 'Saved summary', lifecycle: 'active', conviction: 'medium', riskLevel: 'low', risks: [], catalysts: [], createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-11T10:00:00.000Z' };
async function setup() {
  storage = await createSqliteStorage(); storage.repositories.livingTheses.create(thesis);
  const db = storage;
  const service = createReviewSessionStorageService(async () => db);
  const handlers = createReviewSessionsIpcHandlers(service);
  const invoke = vi.fn(async (channel: string, ...args: unknown[]) => {
    if (channel === channels.getActive) return handlers.getActive(args[0]);
    if (channel === channels.start) return handlers.start(args[0]);
    if (channel === channels.resume) return handlers.resume(args[0]);
    if (channel === channels.saveDraft) return handlers.saveDraft(args[0], args[1], args[2]);
    throw new Error('Unrecognized channel');
  });
  return { api: createReviewSessionsPreloadApi(invoke), handlers, invoke, service };
}
describe('review IPC and preload boundary', () => {
  it('routes start, active lookup, save and resume to persisted review data with version checks', async () => {
    const { api, invoke } = await setup();
    expect(await api.getActive(thesis.id)).toEqual({ ok: true, value: null });
    const created = await api.start(thesis.id); if (!created.ok) throw new Error('Start failed');
    expect((await api.start(thesis.id)).ok).toBe(false);
    const session = created.value;
    const saved = await api.saveDraft(session.id, { ...session.workflow, reviewReason: 'Quarterly check' }, session.version);
    expect(saved.ok).toBe(true); if (!saved.ok) throw new Error('Save failed');
    expect(saved.value.version).toBe(2);
    expect((await api.saveDraft(session.id, session.workflow, session.version)).ok).toBe(false);
    expect(await api.resume(session.id)).toEqual({ ok: true, value: { session: saved.value, currentThesis: thesis, baselineStatus: 'current' } });
    expect(invoke).toHaveBeenCalledWith(channels.saveDraft, session.id, expect.objectContaining({ reviewReason: 'Quarterly check' }), 1);
    expect(storage?.repositories.livingTheses.getById(thesis.id)).toEqual(thesis);
  });
  it('rejects malformed arguments, spoofed baselines and completion without overwriting a draft', async () => {
    const { api, handlers, service } = await setup();
    const startSpy = vi.spyOn(service, 'start');
    for (const invalid of [null, {}, 3, '', '   ']) expect((await handlers.start(invalid)).ok).toBe(false);
    expect(startSpy).not.toHaveBeenCalled();
    const created = await api.start(thesis.id); if (!created.ok) throw new Error('Start failed');
    const session = created.value;
    for (const version of [0, -1, 1.5, '1', NaN, Infinity]) expect((await handlers.saveDraft(session.id, session.workflow, version)).ok).toBe(false);
    for (const workflow of [null, {}, { ...session.workflow, status: 'completed' }, { ...session.workflow, baseline: { ...thesis, summary: 'Spoofed' } }]) {
      expect((await handlers.saveDraft(session.id, workflow, 1)).ok).toBe(false);
    }
    expect(storage?.repositories.reviewSessions.getById(session.id)).toEqual(session);
    expect(Object.keys(api).sort()).toEqual(['getActive', 'resume', 'saveDraft', 'start']);
  });
});
