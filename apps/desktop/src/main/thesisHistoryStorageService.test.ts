import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  calculateMbsScore,
  completeLivingThesisReviewWorkflowStep,
  evaluateLivingThesisHealth,
  type LivingThesis,
  type LivingThesisHistory,
  type LivingThesisReviewScoreDraft,
  type LivingThesisReviewWorkflow
} from '@thesis-investing/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSqliteDatabase, createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import { createReviewSessionStorageService } from './reviewSessionStorageService';
import { createDecisionsStorageService } from './decisionsStorageService';
import { createThesisHistoryStorageService } from './thesisHistoryStorageService';
import { buildLocalDataExportDocument, createLocalDataStorageService } from './localDataStorageService';

const createdAt = '2026-09-19T09:00:00.000Z';
const firstReviewAt = '2026-09-19T10:00:00.000Z';
const secondReviewAt = '2026-09-19T11:00:00.000Z';
const decisionAt = '2026-09-19T12:00:00.000Z';
const editedAt = '2026-09-19T13:00:00.000Z';
const healthClock = { referenceTime: '2026-09-20T14:00:00.000Z', today: '2026-09-20' };
const scoreDraft: LivingThesisReviewScoreDraft = { kind: 'score', input: {
  businessQuality: 8, moat: 7, management: 6, balanceSheet: 9, growth: 5, valuation: 4, risk: 0
} };
const storages = new Set<SqliteStorage>();
const folders: string[] = [];
const uuid = (number: number) => `c0000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

afterEach(async () => {
  vi.restoreAllMocks();
  for (const storage of storages) storage.close();
  storages.clear();
  for (const directory of folders.splice(0)) await rm(directory, { recursive: true });
});

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

function thesis(id = 'thesis'): LivingThesis {
  return { id, version: 1, ticker: 'SAME', entityName: 'Example Research', title: 'Recurring revenue',
    summary: 'Original research.', lifecycle: 'active', conviction: 'medium', riskLevel: 'medium',
    createdAt, updatedAt: createdAt, risks: [], catalysts: [] };
}

async function filename() {
  const directory = await mkdtemp(join(tmpdir(), 'thesis-history-'));
  folders.push(directory);
  return join(directory, 'research.sqlite');
}

async function open(path?: string) {
  const storage = await createSqliteStorage({ filename: path });
  storages.add(storage);
  return storage;
}

async function complete(storage: SqliteStorage, thesisId: string, prefix: string, now: string,
  score: LivingThesisReviewScoreDraft = scoreDraft) {
  let id = 0;
  const reviews = createReviewSessionStorageService(async () => storage, {
    now: () => now, createId: () => `${prefix}-${++id}`
  });
  const started = value(await reviews.start(thesisId));
  let workflow: LivingThesisReviewWorkflow = { ...started.workflow, reviewReason: `Evidence check ${prefix}`,
    notes: `Observed facts ${prefix}`, scoreDraft: score,
    draft: { ...started.workflow.draft, summary: `Reviewed research ${prefix}` } };
  while (workflow.activeStep !== 'complete_review') {
    workflow = value(completeLivingThesisReviewWorkflowStep(workflow, workflow.activeStep));
  }
  return value(await reviews.complete(started.id, workflow, started.version));
}

function snapshot(storage: SqliteStorage) {
  const r = storage.repositories;
  return buildLocalDataExportDocument({ exportedAt: editedAt,
    livingTheses: r.livingTheses.list(), reviewSessions: r.reviewSessions.list(),
    thesisRevisions: r.thesisRevisions.list(), thesisDecisions: r.thesisDecisions.list(),
    mbsScoreSnapshots: r.mbsScoreSnapshots.list(), watchlistItems: r.watchlistItems.list(),
    thesisNotes: r.thesisNotes.list(), reminders: r.reminders.list(),
    portfolioRankerItems: r.portfolioRankerItems.list() });
}

function assess(history: LivingThesisHistory) {
  return value(evaluateLivingThesisHealth({ history, ...healthClock }));
}

async function fixture() {
  const path = await filename();
  const storage = await open(path);
  value(storage.repositories.livingTheses.create(thesis()));
  const first = await complete(storage, 'thesis', 'scored', firstReviewAt);
  const second = await complete(storage, 'thesis', 'skipped', secondReviewAt, { kind: 'skip' });
  const decisions = createDecisionsStorageService(async () => storage, { now: () => decisionAt });
  const note = value(await decisions.create('thesis', { title: 'Read the next report', rationale: 'Retention remains a question.' }, uuid(1)));
  const conclusion = value(await decisions.create('thesis', { title: 'Revisit pricing', rationale: 'The review added new evidence.', reviewSessionId: first.session.id }, uuid(2)));
  return { storage, path, first, second, note, conclusion,
    history: createThesisHistoryStorageService(async () => storage) };
}

describe('read-only thesis history against SQLite', () => {
  it('returns completed reviews, saved reasons and decisions from only the requested thesis, ignoring drafts and unrelated scores', async () => {
    const { storage, history, first, second, note, conclusion } = await fixture();
    value(storage.repositories.livingTheses.create(thesis('other')));
    await complete(storage, 'other', 'foreign', secondReviewAt);
    const decisions = createDecisionsStorageService(async () => storage, { now: () => decisionAt });
    value(await decisions.create('other', { title: 'Other company', rationale: 'Unrelated research.' }, uuid(3)));
    const reviews = createReviewSessionStorageService(async () => storage, { now: () => decisionAt });
    const ended = value(await reviews.start('thesis'));
    value(await reviews.abandon(ended.id, ended.version));
    const unfinished = value(await reviews.start('thesis'));

    // Legacy notes and Living Theses may share identical IDs. Neither that text nor
    // a ticker match establishes the formal completed-review score relationship.
    value(storage.repositories.thesisNotes.create({ id: 'thesis', title: 'Legacy note', body: 'Separate record', status: 'active' }));
    const originalScore = first.scoreSnapshot!;
    for (const [id, owner] of [['legacy-exact-id', 'thesis'], ['matching-ticker', 'other'], ['orphan', undefined]]) {
      value(storage.repositories.mbsScoreSnapshots.create({ ...originalScore, id: id!, thesisId: owner, createdAt: decisionAt }));
    }
    const before = snapshot(storage);
    const result = value(await history.get('thesis'));
    expect(result.thesisId).toBe('thesis');
    expect(result.thesis).toEqual(before.data.livingTheses.find((parent) => parent.id === 'thesis'));
    expect(result.items.filter((item) => item.kind === 'review').map((item) => item.session)).toEqual([second.session, first.session]);
    expect(result.items.filter((item) => item.kind === 'decision').map((item) => item.decision)).toEqual([note, conclusion]);
    expect(result.items.find((item) => item.kind === 'decision' && item.decision.id === conclusion.id))
      .toMatchObject({ reviewReason: first.session.workflow.reviewReason });
    expect(result.scores).toEqual([{ snapshot: originalScore, reviewSessionId: first.session.id }]);
    expect(result.items.filter((item) => item.kind === 'score')).toHaveLength(1);
    expect(result.items.filter((item) => item.kind === 'created')).toHaveLength(1);
    expect(result.items).toHaveLength(6);
    expect(storage.repositories.reviewSessions.getInProgressByThesisId('thesis')).toEqual(unfinished);
    expect(snapshot(storage)).toEqual(before);
  });

  it('uses one transaction for the parent, reviews, revisions, decisions and linked scores without saving anything', async () => {
    const { storage, history } = await fixture();
    const before = snapshot(storage);
    let inside = false;
    const originalTransaction = storage.runInTransaction.bind(storage);
    const transaction = vi.spyOn(storage, 'runInTransaction').mockImplementation((operation) => originalTransaction(() => {
      inside = true;
      try { return operation(); } finally { inside = false; }
    }));
    const r = storage.repositories;
    const parentRead = r.livingTheses.getById.bind(r.livingTheses);
    const sessionRead = r.reviewSessions.list.bind(r.reviewSessions);
    const revisionRead = r.thesisRevisions.list.bind(r.thesisRevisions);
    const decisionRead = r.thesisDecisions.list.bind(r.thesisDecisions);
    const scoreRead = r.mbsScoreSnapshots.getById.bind(r.mbsScoreSnapshots);
    const reads = [
      vi.spyOn(r.livingTheses, 'getById').mockImplementation((id) => { expect(inside).toBe(true); return parentRead(id); }),
      vi.spyOn(r.reviewSessions, 'list').mockImplementation((id) => { expect(inside).toBe(true); return sessionRead(id); }),
      vi.spyOn(r.thesisRevisions, 'list').mockImplementation((id) => { expect(inside).toBe(true); return revisionRead(id); }),
      vi.spyOn(r.thesisDecisions, 'list').mockImplementation((id) => { expect(inside).toBe(true); return decisionRead(id); }),
      vi.spyOn(r.mbsScoreSnapshots, 'getById').mockImplementation((id) => { expect(inside).toBe(true); return scoreRead(id); })
    ];
    const coherent = value(await history.get('thesis'));
    expect(coherent.thesis).toEqual(before.data.livingTheses[0]);
    expect(coherent.thesis.version).toBe(3);
    expect(coherent.items.filter((item) => item.kind === 'review')[0].revision.after).toEqual(coherent.thesis);
    expect(transaction).toHaveBeenCalledOnce();
    for (const read of reads) { expect(read).toHaveBeenCalled(); read.mockRestore(); }
    expect(snapshot(storage)).toEqual(before);
  });

  it('keeps original review snapshots after later Board edits and shows archived state after restart without changing saved data', async () => {
    const { storage, path, history, first, second } = await fixture();
    const current = storage.repositories.livingTheses.getById('thesis')!;
    const edited = value(storage.repositories.livingTheses.update({ ...current,
      summary: 'Later Board edits are current.', lifecycle: 'archived', archivedAt: editedAt, updatedAt: editedAt }, current.version));
    const before = snapshot(storage);
    const result = value(await history.get('thesis'));
    expect(result.thesis).toEqual(edited);
    expect(result.items.filter((item) => item.kind === 'review').map((item) => item.revision.after))
      .toEqual([second.revision.after, first.revision.after]);
    expect(result.items.find((item) => item.kind === 'archived')).toMatchObject({ occurredAt: editedAt });
    expect(storage.repositories.livingTheses.getById('thesis')).toEqual(edited);
    expect(snapshot(storage)).toEqual(before);
    await history.close(); storages.delete(storage);
    const reopened = await open(path);
    const restarted = createThesisHistoryStorageService(async () => reopened);
    expect(value(await restarted.get('thesis'))).toEqual(result);
    expect(snapshot(reopened)).toEqual(before);
  });

  it('assesses saved risks rather than unfinished review edits or unlinked legacy scores, and updates only after a saved thesis reload', async () => {
    const { storage, history, first } = await fixture();
    const initial = value(await history.get('thesis'));
    const initialHealth = assess(initial);
    expect(initialHealth.research.status).toBe('no_flagged_concerns');
    expect(initialHealth.research.limitations).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'one_score_only' })]));

    const reviews = createReviewSessionStorageService(async () => storage, { now: () => editedAt });
    const started = value(await reviews.start('thesis'));
    const risk = { id: 'proposed-health-risk', thesisId: 'thesis', title: 'Customer concentration',
      status: 'open' as const, severity: 'high' as const, createdAt: editedAt, updatedAt: editedAt };
    const draft = value(await reviews.saveDraft(started.id, { ...started.workflow,
      draft: { ...started.workflow.draft, risks: [risk] } }, started.version));
    const lowScore = calculateMbsScore({ businessQuality: 0, moat: 0, management: 0, balanceSheet: 0,
      growth: 0, valuation: 0, risk: 0 });
    if (lowScore.rating === 'incomplete') throw new Error('Expected a complete legacy score.');
    value(storage.repositories.mbsScoreSnapshots.create({ ...first.scoreSnapshot!, ...lowScore,
      id: 'legacy-same-id-and-ticker', rating: lowScore.rating, createdAt: editedAt }));
    const savedBeforeRead = snapshot(storage);
    const withDraft = value(await history.get('thesis'));
    expect(withDraft.thesis.risks).toEqual([]);
    expect(withDraft.scores).toEqual(initial.scores);
    expect(assess(withDraft)).toEqual(initialHealth);
    expect(snapshot(storage)).toEqual(savedBeforeRead);

    const savedRisk = value(storage.repositories.livingTheses.update({ ...withDraft.thesis,
      risks: [risk], updatedAt: editedAt }, withDraft.thesis.version));
    const withSavedRisk = value(await history.get('thesis'));
    expect(withSavedRisk.thesis).toEqual(savedRisk);
    expect(assess(withSavedRisk).research).toMatchObject({ status: 'needs_attention',
      reasons: expect.arrayContaining([expect.objectContaining({ code: 'open_high_risks' })]) });
    const resolved = value(storage.repositories.livingTheses.update({ ...savedRisk,
      risks: [{ ...risk, status: 'resolved', updatedAt: '2026-09-19T14:00:00.000Z' }],
      updatedAt: '2026-09-19T14:00:00.000Z' }, savedRisk.version));
    const afterResolution = value(await history.get('thesis'));
    expect(afterResolution.thesis).toEqual(resolved);
    expect(assess(afterResolution).research.status).toBe('no_flagged_concerns');
    expect(storage.repositories.reviewSessions.getById(draft.id)?.workflow.draft.risks).toEqual([risk]);
    expect(afterResolution.scores).toEqual(initial.scores);
    expect(afterResolution.items).toEqual(initial.items);
    expect(storage.repositories.thesisRevisions.list()).toEqual(savedBeforeRead.data.thesisRevisions);
    expect(storage.repositories.thesisDecisions.list()).toEqual(savedBeforeRead.data.thesisDecisions);
  });

  it('returns an empty score list and creation event for a saved thesis with no history, while missing IDs fail', async () => {
    const storage = await open();
    const parent = value(storage.repositories.livingTheses.create(thesis()));
    const history = createThesisHistoryStorageService(async () => storage);
    expect(value(await history.get('thesis'))).toMatchObject({ thesisId: 'thesis', scores: [],
      items: [{ kind: 'created', occurredAt: parent.createdAt }] });
    expect((await history.get('missing')).ok).toBe(false);
    expect(storage.repositories.livingTheses.list()).toEqual([parent]);
  });

  it('rejects invalid IDs before opening storage, retries failed initialization, and closes only initialized storage', async () => {
    const storage = await open();
    value(storage.repositories.livingTheses.create(thesis()));
    const factory = vi.fn<() => Promise<SqliteStorage>>().mockRejectedValueOnce(new Error('Injected open failure')).mockResolvedValue(storage);
    const history = createThesisHistoryStorageService(factory);
    await history.close();
    for (const bad of ['', '   ', null, undefined, {}, 3]) expect((await history.get(bad as string)).ok).toBe(false);
    expect(factory).not.toHaveBeenCalled();
    expect((await history.get('thesis')).ok).toBe(false);
    expect((await history.get('thesis')).ok).toBe(true);
    expect((await history.get('thesis')).ok).toBe(true);
    expect(factory).toHaveBeenCalledTimes(2);
    const close = vi.spyOn(storage, 'close');
    await history.close(); storages.delete(storage);
    await history.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it.each([
    ['missing revision', "DROP TRIGGER immutable_thesis_revision_delete; DELETE FROM living_thesis_revisions WHERE id = 'scored-2';"],
    ['missing completed session', "PRAGMA foreign_keys = OFF; DROP TRIGGER immutable_ended_review_delete; DELETE FROM living_thesis_review_sessions WHERE id = 'scored-1';"],
    ['missing linked score', "PRAGMA foreign_keys = OFF; DELETE FROM mbs_score_snapshots WHERE id = 'scored-3';"],
    ['forged linked score', "UPDATE mbs_score_snapshots SET score = 99 WHERE id = 'scored-3';"],
    ['foreign linked score', "UPDATE mbs_score_snapshots SET thesis_id = 'other' WHERE id = 'scored-3';"],
    ['mismatched revision link', "PRAGMA foreign_keys = OFF; DROP TRIGGER immutable_thesis_revision_update; UPDATE living_thesis_revisions SET review_session_id = 'missing' WHERE id = 'scored-2';"],
    ['missing decision review link', "PRAGMA foreign_keys = OFF; DROP TRIGGER immutable_thesis_decision_update; UPDATE living_thesis_decisions SET review_session_id = 'missing' WHERE kind = 'review_conclusion';"]
  ])('reports %s instead of returning incomplete or misleading history', async (_name, sql) => {
    const { storage, path, history } = await fixture();
    const database = await createSqliteDatabase({ filename: path });
    try {
      database.exec(sql);
      const rawSnapshot = () => ['living_theses', 'living_thesis_review_sessions', 'living_thesis_revisions',
        'living_thesis_decisions', 'mbs_score_snapshots'].map((table) => database.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
      const before = rawSnapshot();
      const result = await history.get('thesis');
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty('value');
      if (result.ok) throw new Error('Corrupt history was accepted.');
      expect(result.errors.join(' ')).not.toBe('');
      expect(rawSnapshot()).toEqual(before);
      expect(storage.repositories.livingTheses.getById('thesis')?.version).toBe(3);
    } finally { database.close(); }
  });

  it('ignores an unrelated corrupt raw score rather than reading every legacy snapshot', async () => {
    const { storage, path, history, first } = await fixture();
    value(storage.repositories.mbsScoreSnapshots.create({ ...first.scoreSnapshot!, id: 'unrelated-corrupt', thesisId: 'thesis' }));
    const database = await createSqliteDatabase({ filename: path });
    try {
      database.prepare('UPDATE mbs_score_snapshots SET input_json = ? WHERE id = ?').run('not json', 'unrelated-corrupt');
      expect(value(await history.get('thesis')).scores).toEqual([{ snapshot: first.scoreSnapshot, reviewSessionId: first.session.id }]);
    } finally { database.close(); }
  });

  it('reconstructs history and derived health after format 5 file import, restart and duplicate-import ID remapping', async () => {
    const { storage, path, history } = await fixture();
    const current = storage.repositories.livingTheses.getById('thesis')!;
    value(storage.repositories.livingTheses.update({ ...current, updatedAt: editedAt, nextReviewAt: '2026-09-18',
      risks: [{ id: 'saved-backup-risk', thesisId: 'thesis', title: 'Demand concentration', status: 'open',
        severity: 'high', createdAt: editedAt, updatedAt: editedAt }] }, current.version));
    const expected = value(await history.get('thesis'));
    const expectedHealth = assess(expected);
    expect(expectedHealth.research.status).toBe('needs_attention');
    expect(expectedHealth.reviewTiming.status).toBe('overdue');
    const filePath = `${path}.json`;
    const exporter = createLocalDataStorageService({ createStorage: async () => storage,
      getUserDataPath: () => folders[folders.length - 1], showSaveDialog: async () => ({ canceled: false, filePath }) });
    expect((await exporter.exportToJson()).ok).toBe(true);
    const exported = JSON.parse(await readFile(filePath, 'utf8'));
    expect(exported.formatVersion).toBe(5);
    expect(Object.keys(exported.data).sort()).toEqual(['livingTheses', 'mbsScoreSnapshots', 'portfolioRankerItems',
      'reminders', 'reviewSessions', 'thesisDecisions', 'thesisNotes', 'thesisRevisions', 'watchlistItems']);
    const targetPath = await filename();
    const target = await open(targetPath);
    const importer = createLocalDataStorageService({ createStorage: async () => target,
      getUserDataPath: () => folders[folders.length - 1], createImportPreviewId: () => 'history-preview',
      showOpenDialog: async () => ({ canceled: false, filePaths: [filePath] }) });
    expect((await importer.previewImportFromJson()).ok).toBe(true);
    expect((await importer.importFromJson('history-preview')).ok).toBe(true);
    target.close(); storages.delete(target);
    const reopened = await open(targetPath);
    const restored = createThesisHistoryStorageService(async () => reopened);
    expect(value(await restored.get('thesis'))).toEqual(expected);
    expect(assess(value(await restored.get('thesis')))).toEqual(expectedHealth);
    expect(snapshot(reopened).data).toEqual(snapshot(storage).data);

    const again = createLocalDataStorageService({ createStorage: async () => reopened,
      getUserDataPath: () => folders[folders.length - 1], createImportPreviewId: () => 'repeat-preview',
      showOpenDialog: async () => ({ canceled: false, filePaths: [filePath] }) });
    expect((await again.previewImportFromJson()).ok).toBe(true);
    expect((await again.importFromJson('repeat-preview')).ok).toBe(true);
    const remapped = value(await restored.get('thesis-import-1'));
    expect(remapped.thesis.risks[0]).toMatchObject({ id: 'saved-backup-risk-import-1', thesisId: 'thesis-import-1' });
    expect(remapped.scores[0]).toMatchObject({ reviewSessionId: 'scored-1-import-1',
      snapshot: { id: 'scored-3-import-1', thesisId: 'thesis-import-1' } });
    const remappedHealth = assess(remapped);
    expect({ ...remappedHealth, thesisId: expectedHealth.thesisId }).toEqual(expectedHealth);
    await restored.close(); storages.delete(reopened);
    const finalStorage = await open(targetPath);
    const finalHistory = createThesisHistoryStorageService(async () => finalStorage);
    expect(assess(value(await finalHistory.get('thesis-import-1')))).toEqual(remappedHealth);
    expect(assess(value(await finalHistory.get('thesis')))).toEqual(expectedHealth);
  });
});
