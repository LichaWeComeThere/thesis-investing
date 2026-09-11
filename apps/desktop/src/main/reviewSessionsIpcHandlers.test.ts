import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { createReviewSessionStorageService } from './reviewSessionStorageService';
import { createReviewSessionsIpcHandlers } from './reviewSessionsIpcHandlers';
import { createReviewSessionsPreloadApi } from '../preload/reviewSessionsPreload';
import { reviewSessionsStorageChannels as channels } from '../shared/reviewSessionsStorage';
import { completeLivingThesisReviewWorkflowStep, type LivingThesis, type LivingThesisReviewWorkflow } from '@thesis-investing/core';

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
    if (channel === channels.complete) return handlers.complete(args[0], args[1], args[2]);
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
  it('rejects malformed arguments, spoofed baselines and completed payloads without overwriting a draft', async () => {
    const { api, handlers, service } = await setup();
    const startSpy = vi.spyOn(service, 'start');
    const completeSpy = vi.spyOn(service, 'complete');
    for (const invalid of [null, {}, 3, '', '   ']) expect((await handlers.start(invalid)).ok).toBe(false);
    expect(startSpy).not.toHaveBeenCalled();
    for (const invalid of [null, {}, 3, '', '   ']) expect((await handlers.complete(invalid, {}, 1)).ok).toBe(false);
    const created = await api.start(thesis.id); if (!created.ok) throw new Error('Start failed');
    const session = created.value;
    for (const version of [0, -1, 1.5, '1', NaN, Infinity]) expect((await handlers.saveDraft(session.id, session.workflow, version)).ok).toBe(false);
    for (const version of [0, -1, 1.5, '1', NaN, Infinity]) expect((await handlers.complete(session.id, session.workflow, version)).ok).toBe(false);
    expect(completeSpy).not.toHaveBeenCalled();
    for (const workflow of [null, {}, { ...session.workflow, status: 'completed' }, { ...session.workflow, baseline: { ...thesis, summary: 'Spoofed' } }]) {
      expect((await handlers.saveDraft(session.id, workflow, 1)).ok).toBe(false);
      expect((await handlers.complete(session.id, workflow, 1)).ok).toBe(false);
    }
    expect(storage?.repositories.reviewSessions.getById(session.id)).toEqual(session);
    expect(Object.keys(api).sort()).toEqual(['complete', 'getActive', 'resume', 'saveDraft', 'start']);
  });
  it('completes through the typed bridge once and rejects changed requests against an ended session', async () => {
    const { api, invoke } = await setup();
    const created = await api.start(thesis.id); if (!created.ok) throw new Error('Start failed');
    const session = created.value;
    let workflow: LivingThesisReviewWorkflow = { ...session.workflow, reviewReason: 'Quarterly check', scoreDraft: { kind: 'skip' }, draft: { ...session.workflow.draft, summary: 'Updated research' } };
    while (workflow.activeStep !== 'complete_review') {
      const step = completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep);
      if (!step.ok) throw new Error(step.errors.join(' ')); workflow = step.value;
    }
    const completed = await api.complete(session.id, workflow, session.version);
    if (!completed.ok) throw new Error(completed.errors.join(' '));
    expect(completed.value.thesis.summary).toBe('Updated research');
    expect(completed.value.thesis.version).toBe(2);
    expect(completed.value.session.workflow.status).toBe('completed');
    expect(invoke).toHaveBeenCalledWith(channels.complete, session.id, workflow, session.version);
    expect(await api.getActive(thesis.id)).toEqual({ ok: true, value: null });
    expect((await api.resume(session.id)).ok).toBe(false);
    expect((await api.complete(session.id, { ...workflow, notes: 'Different request' }, session.version)).ok).toBe(false);
    expect((await api.complete(session.id, workflow, completed.value.session.version)).ok).toBe(false);
    expect(await api.complete(session.id, workflow, session.version)).toEqual(completed);
    expect(storage?.repositories.thesisRevisions.list(thesis.id)).toHaveLength(1);
  });

});
