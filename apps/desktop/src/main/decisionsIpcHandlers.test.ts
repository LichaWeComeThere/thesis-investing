import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeLivingThesisReviewWorkflowStep, type LivingThesis, type LivingThesisReviewWorkflow } from '@thesis-investing/core';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { createDecisionsStorageService } from './decisionsStorageService';
import { createReviewSessionStorageService } from './reviewSessionStorageService';
import { createDecisionsIpcHandlers } from './decisionsIpcHandlers';
import { createDecisionsPreloadApi } from '../preload/decisionsPreload';
import { decisionsStorageChannels as channels } from '../shared/decisionsStorage';

let storage: SqliteStorage | undefined;
afterEach(() => storage?.close());
const thesis: LivingThesis = { id: 'decision-ipc-thesis', version: 1, entityName: 'Acme', title: 'Research', summary: 'Saved research', lifecycle: 'active', conviction: 'medium', riskLevel: 'low', risks: [], catalysts: [], createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-11T10:00:00.000Z' };
const requestId = 'b78d4d31-ff46-465e-874b-8a77b87b336e';
const input = { title: 'Keep researching', rationale: 'Wait for evidence about retention.' };

async function setup() {
  storage = await createSqliteStorage();
  const created = storage.repositories.livingTheses.create(thesis);
  if (!created.ok) throw new Error(created.errors.join(' '));
  const db = storage;
  const service = createDecisionsStorageService(async () => db);
  const handlers = createDecisionsIpcHandlers(service);
  const invoke = vi.fn(async (channel: string, ...args: unknown[]) => {
    if (channel === channels.list) return handlers.list(args[0]);
    if (channel === channels.listCompletedReviews) return handlers.listCompletedReviews(args[0]);
    if (channel === channels.create) return handlers.create(args[0], args[1], args[2]);
    throw new Error('Unrecognized channel');
  });
  return { api: createDecisionsPreloadApi(invoke), handlers, invoke, service, db };
}

describe('decision IPC and preload boundary', () => {
  it('records one immutable decision through the bridge and reuses its identity on an exact retry', async () => {
    const { api, invoke, db } = await setup();
    expect(await api.list(thesis.id)).toEqual({ ok: true, value: [] });
    const saved = await api.create(thesis.id, input, requestId);
    if (!saved.ok) throw new Error(saved.errors.join(' '));
    expect(saved.value).toMatchObject({ ...input, id: `decision_${requestId}`, thesisId: thesis.id, kind: 'research_note' });
    expect(await api.create(thesis.id, input, requestId)).toEqual(saved);
    expect(await api.list(thesis.id)).toEqual({ ok: true, value: [saved.value] });
    expect((await api.create(thesis.id, { ...input, rationale: 'Changed request' }, requestId)).ok).toBe(false);
    expect(db.repositories.livingTheses.getById(thesis.id)).toEqual(thesis);
    expect(invoke).toHaveBeenCalledWith(channels.create, thesis.id, input, requestId);
    expect(Object.keys(api).sort()).toEqual(['create', 'list', 'listCompletedReviews']);
  });

  it('rejects malformed identities before invoking storage and validates unknown decision fields in the service', async () => {
    const { handlers, service, db } = await setup();
    const listSpy = vi.spyOn(service, 'list');
    const reviewSpy = vi.spyOn(service, 'listCompletedReviews');
    const createSpy = vi.spyOn(service, 'create');
    for (const badId of [null, {}, 3, '', '   ']) {
      expect((await handlers.list(badId)).ok).toBe(false);
      expect((await handlers.listCompletedReviews(badId)).ok).toBe(false);
      expect((await handlers.create(badId, input, requestId)).ok).toBe(false);
    }
    for (const badRequestId of [null, {}, 3, '', 'not-a-uuid', 'b78d4d31-ff46-165e-874b-8a77b87b336e', 'b78d4d31-ff46-465e-774b-8a77b87b336e']) {
      expect((await handlers.create(thesis.id, input, badRequestId)).ok).toBe(false);
    }
    expect(listSpy).not.toHaveBeenCalled();
    expect(reviewSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    for (const badInput of [null, [], {}, { ...input, id: 'spoofed' }, { ...input, thesisId: 'another-thesis' }, { ...input, createdAt: '2026-01-01T00:00:00.000Z' }, { ...input, title: '' }, { ...input, rationale: '' }, { ...input, reviewSessionId: '' }]) {
      expect((await handlers.create(thesis.id, badInput, requestId)).ok).toBe(false);
    }
    expect(db.repositories.thesisDecisions.list(thesis.id)).toEqual([]);
  });

  it('offers completed reviews from the selected thesis and rejects active or foreign review links', async () => {
    const { api, db } = await setup();
    const reviews = createReviewSessionStorageService(async () => db);
    const started = await reviews.start(thesis.id);
    if (!started.ok) throw new Error(started.errors.join(' '));
    expect(await api.listCompletedReviews(thesis.id)).toEqual({ ok: true, value: [] });
    expect((await api.create(thesis.id, { ...input, reviewSessionId: started.value.id }, requestId)).ok).toBe(false);
    let workflow: LivingThesisReviewWorkflow = { ...started.value.workflow, reviewReason: 'Quarterly check', scoreDraft: { kind: 'skip' } };
    while (workflow.activeStep !== 'complete_review') {
      const advanced = completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep);
      if (!advanced.ok) throw new Error(advanced.errors.join(' '));
      workflow = advanced.value;
    }
    const completed = await reviews.complete(started.value.id, workflow, started.value.version);
    if (!completed.ok) throw new Error(completed.errors.join(' '));
    expect(await api.listCompletedReviews(thesis.id)).toEqual({ ok: true, value: [{ id: started.value.id, reviewReason: 'Quarterly check', completedAt: completed.value.session.completedAt }] });
    const foreign = db.repositories.livingTheses.create({ ...thesis, id: 'other-ipc-thesis' });
    if (!foreign.ok) throw new Error(foreign.errors.join(' '));
    expect(await api.listCompletedReviews(foreign.value.id)).toEqual({ ok: true, value: [] });
    expect((await api.create(foreign.value.id, { ...input, reviewSessionId: started.value.id }, requestId)).ok).toBe(false);
    const linked = await api.create(thesis.id, { ...input, reviewSessionId: started.value.id }, requestId);
    if (!linked.ok) throw new Error(linked.errors.join(' '));
    expect(linked.value).toMatchObject({ reviewSessionId: started.value.id, kind: 'review_conclusion' });
    expect(db.repositories.reviewSessions.getById(started.value.id)).toEqual(completed.value.session);
    expect(db.repositories.livingTheses.getById(thesis.id)).toEqual(completed.value.thesis);
  });
});
