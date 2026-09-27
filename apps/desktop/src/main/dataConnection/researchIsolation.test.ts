import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createSqliteStorage, type SqliteStorage } from '../../storage/sqlite';
import type { CompanyDetails } from '../../shared/companyDetails';
import { createLivingThesesStorageService } from '../livingThesesStorageService';
import { createReviewSessionStorageService } from '../reviewSessionStorageService';
import { createDecisionsStorageService } from '../decisionsStorageService';
import { buildLocalDataExportDocument, createLocalDataStorageService } from '../localDataStorageService';
import { createCredentialStore } from './credentialStore';
import { createProviderCache } from './providerCache';
import { createRequestBudget } from './requestBudget';
import { createCompanyDetailsService, type CompanyDetailsAdapter, type CompanyDetailsService } from './companyDetailsService';

function value<T>(result: { ok: true; value: T } | { ok: false; errors: readonly string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.value;
}

function researchSnapshot(storage: SqliteStorage) {
  const repositories = storage.repositories;
  return buildLocalDataExportDocument({
    exportedAt: '2026-09-27T03:00:00.000Z',
    livingTheses: repositories.livingTheses.list(),
    reviewSessions: repositories.reviewSessions.list(),
    thesisRevisions: repositories.thesisRevisions.list(),
    thesisDecisions: repositories.thesisDecisions.list(),
    mbsScoreSnapshots: repositories.mbsScoreSnapshots.list(),
    watchlistItems: repositories.watchlistItems.list(),
    thesisNotes: repositories.thesisNotes.list(),
    reminders: repositories.reminders.list(),
    portfolioRankerItems: repositories.portfolioRankerItems.list()
  });
}

describe('connection and research storage isolation', () => {
  it('keeps saved research and its exported data unchanged through key, cache, quota, restart, and removal operations', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'thesis-connection-isolation-'));
    const researchPath = join(directory, 'thesis-investing.sqlite');
    const connectionDirectory = join(directory, 'data-connection');
    const backupPath = join(directory, 'research-backup.json');
    const secret = 'synthetic-isolation-key-only';
    const replacementSecret = 'synthetic-replacement-key-only';
    const providerOnlyName = 'Provider-only metadata fixture';
    let clock = Date.parse('2026-09-27T03:00:00.000Z');
    let storage: SqliteStorage | undefined;
    let connection: CompanyDetailsService | undefined;

    try {
      storage = await createSqliteStorage({ filename: researchPath });
      const originalStorage = storage;
      const theses = createLivingThesesStorageService(async () => originalStorage);
      const thesis = value(await theses.create({
        entityName: 'User research name', ticker: 'EXM', title: 'Original thesis title',
        summary: 'This research must remain unchanged.', lifecycle: 'active',
        conviction: 'medium', riskLevel: 'low', risks: [], catalysts: []
      }));
      const reviews = createReviewSessionStorageService(async () => originalStorage);
      const review = value(await reviews.start(thesis.id));
      value(await reviews.saveDraft(review.id, { ...review.workflow, notes: 'Preserve my unfinished notes.' }, review.version));
      const decisions = createDecisionsStorageService(async () => originalStorage);
      value(await decisions.create(thesis.id, { title: 'Revisit the evidence', rationale: 'Keep my independent reasoning.' }, '00000000-0000-4000-8000-000000000011'));
      const baseline = researchSnapshot(storage);

      const credentials = createCredentialStore({
        directory: connectionDirectory,
        // Synthetic encryption exercises file boundaries, not OS safeStorage.
        encryption: {
          isAvailable: () => true,
          encrypt: (key) => Buffer.from([0xa5, ...Buffer.from(key).map(byte => byte ^ 0xff)]),
          decrypt: (bytes) => Buffer.from(bytes.subarray(1).map(byte => byte ^ 0xff)).toString()
        }
      });
      const profile: CompanyDetails = {
        schemaVersion: 1, provider: 'alpha-vantage', providerSymbol: 'EXM', companyName: providerOnlyName,
        exchange: 'NASDAQ', sector: 'Fixture sector', industry: null, country: 'USA', currency: 'USD',
        retrievedAt: new Date(clock).toISOString(), sourceUpdatedAt: null
      };
      const adapter = vi.fn<CompanyDetailsAdapter>(async () => ({ ok: true, value: profile }));
      const openConnection = () => createCompanyDetailsService({
        credentials, adapter, now: () => clock,
        getThesis: async id => storage!.repositories.livingTheses.getById(id),
        budget: createRequestBudget({ directory: connectionDirectory, now: () => clock }),
        // Explicit fixture permission tests the stronger persistent-cache case;
        // the production foundation intentionally keeps provider data in memory.
        cache: createProviderCache({ now: () => clock, persistence: { directory: connectionDirectory, allowed: true } })
      });
      const exportAndCheck = async () => {
        expect(researchSnapshot(storage!)).toEqual(baseline);
        const exporter = createLocalDataStorageService({
          createStorage: async () => storage!, getUserDataPath: () => directory,
          databaseFileExists: () => true,
          showSaveDialog: async () => ({ canceled: false, filePath: backupPath })
        });
        expect((await exporter.exportToJson()).ok).toBe(true);
        const serialized = await readFile(backupPath, 'utf8');
        expect(JSON.parse(serialized).data).toEqual(baseline.data);
        for (const excluded of [secret, replacementSecret, providerOnlyName, 'api-key.enc', 'provider-cache.sqlite', 'provider-request-budget.sqlite']) {
          expect(serialized).not.toContain(excluded);
        }
      };

      await exportAndCheck();
      connection = openConnection();
      expect(await connection.saveKey(secret)).toMatchObject({ ok: true, value: { configured: true } });
      const loaded = await connection.refresh(thesis.id);
      expect(loaded).toMatchObject({ ok: true, value: { data: { companyName: providerOnlyName }, freshness: 'fresh' } });
      expect(JSON.stringify(loaded)).not.toContain(secret);
      expect((await readFile(join(connectionDirectory, 'api-key.enc'))).includes(Buffer.from(secret))).toBe(false);
      expect(await readdir(connectionDirectory)).toEqual(expect.arrayContaining(['api-key.enc', 'provider-cache.sqlite', 'provider-request-budget.sqlite']));
      await exportAndCheck();

      connection.close();
      storage.close();
      storage = await createSqliteStorage({ filename: researchPath });
      connection = openConnection();
      expect(await connection.status()).toMatchObject({ ok: true, value: { configured: true } });
      expect(await connection.getCached(thesis.id)).toMatchObject({ ok: true, value: { data: { companyName: providerOnlyName } } });
      expect(await connection.refresh(thesis.id)).toMatchObject({ ok: true, value: { error: { code: 'rate-limited' } } });
      expect(adapter).toHaveBeenCalledTimes(1);
      await exportAndCheck();

      expect(await connection.saveKey(replacementSecret)).toMatchObject({ ok: true, value: { configured: true } });
      expect(await connection.getCached(thesis.id)).toMatchObject({ ok: true, value: { data: null } });
      expect(await connection.refresh(thesis.id)).toMatchObject({ ok: true, value: { error: { code: 'rate-limited' } } });
      expect(adapter).toHaveBeenCalledTimes(1);
      clock += 15_000;
      expect(await connection.refresh(thesis.id)).toMatchObject({ ok: true, value: { data: { companyName: providerOnlyName } } });
      expect(adapter).toHaveBeenCalledTimes(2);
      await exportAndCheck();

      expect(await connection.remove()).toMatchObject({ ok: true, value: { configured: false } });
      expect(await connection.getCached(thesis.id)).toMatchObject({ ok: true, value: { data: null } });
      expect(await connection.refresh(thesis.id)).toMatchObject({ ok: true, value: { error: { code: 'not-configured' } } });
      expect(await readdir(connectionDirectory)).not.toContain('api-key.enc');
      expect(await readdir(connectionDirectory)).toContain('provider-request-budget.sqlite');
      await exportAndCheck();
    } finally {
      connection?.close();
      storage?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
