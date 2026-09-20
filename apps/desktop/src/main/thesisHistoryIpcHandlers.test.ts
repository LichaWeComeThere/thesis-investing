import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LivingThesis } from '@thesis-investing/core';
import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { createDecisionsStorageService } from './decisionsStorageService';
import { createThesisHistoryStorageService } from './thesisHistoryStorageService';
import { createThesisHistoryIpcHandlers } from './thesisHistoryIpcHandlers';
import { createThesisHistoryPreloadApi } from '../preload/thesisHistoryPreload';
import { thesisHistoryStorageChannels as channels } from '../shared/thesisHistoryStorage';

let storage: SqliteStorage | undefined;
afterEach(() => { vi.restoreAllMocks(); storage?.close(); storage = undefined; });
const thesis: LivingThesis = { id: 'history-ipc-thesis', version: 1, entityName: 'Acme', title: 'Research',
  summary: 'Saved research', lifecycle: 'active', conviction: 'medium', riskLevel: 'low', risks: [], catalysts: [],
  createdAt: '2026-09-19T09:00:00.000Z', updatedAt: '2026-09-19T09:00:00.000Z' };

async function setup() {
  storage = await createSqliteStorage();
  const created = storage.repositories.livingTheses.create(thesis);
  if (!created.ok) throw new Error(created.errors.join(' '));
  const db = storage;
  const service = createThesisHistoryStorageService(async () => db);
  const handlers = createThesisHistoryIpcHandlers(service);
  const invoke = vi.fn(async (channel: string, ...args: unknown[]) => {
    if (channel === channels.get) return handlers.get(args[0]);
    throw new Error('Unrecognized history channel');
  });
  return { db, service, handlers, invoke, api: createThesisHistoryPreloadApi(invoke) };
}

describe('thesis history IPC and preload boundary', () => {
  it('returns persisted history for exactly one thesis through a read-only bridge', async () => {
    const { db, api, invoke } = await setup();
    const decisions = createDecisionsStorageService(async () => db, { now: () => '2026-09-19T10:00:00.000Z' });
    const saved = await decisions.create(thesis.id, { title: 'Investigate retention', rationale: 'The next report may resolve the uncertainty.' },
      'd0000000-0000-4000-8000-000000000001');
    if (!saved.ok) throw new Error(saved.errors.join(' '));
    const result = await api.get(thesis.id);
    if (!result.ok) throw new Error(result.errors.join(' '));
    expect(result.value.thesisId).toBe(thesis.id);
    expect(result.value.thesis).toEqual(thesis);
    expect(result.value.items).toHaveLength(2);
    expect(result.value.items[0]).toMatchObject({ kind: 'decision', decision: saved.value });
    expect(result.value.items[1]).toMatchObject({ kind: 'created', occurredAt: thesis.createdAt });
    expect(result.value.scores).toEqual([]);
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith(channels.get, thesis.id);
    expect(Object.keys(api)).toEqual(['get']);
    expect(db.repositories.livingTheses.getById(thesis.id)).toEqual(thesis);
    expect(db.repositories.thesisDecisions.list()).toEqual([saved.value]);
    expect((await api.get('missing-thesis')).ok).toBe(false);
  });

  it('rejects unknown or malformed renderer identities before calling the service', async () => {
    const { handlers, service } = await setup();
    const get = vi.spyOn(service, 'get');
    for (const invalid of [undefined, null, {}, [], 3, true, '', ' \t\n ']) {
      expect((await handlers.get(invalid)).ok).toBe(false);
    }
    expect(get).not.toHaveBeenCalled();
    expect((await handlers.get(thesis.id)).ok).toBe(true);
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith(thesis.id);
  });

  it('preserves service failures across the bridge and allows a later successful refresh', async () => {
    const { api, service } = await setup();
    const unavailable = { ok: false as const, errors: ['History is temporarily unavailable.'] };
    const get = vi.spyOn(service, 'get').mockResolvedValueOnce(unavailable);
    expect(await api.get(thesis.id)).toEqual(unavailable);
    expect((await api.get(thesis.id)).ok).toBe(true);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
