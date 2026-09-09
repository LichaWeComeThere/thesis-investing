import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LivingThesis } from '@thesis-investing/core';

import { createSqliteStorage } from '../storage/sqlite';
import type { CreateLivingThesisInput } from '../shared/livingThesesStorage';
import { createLivingThesesStorageService } from './livingThesesStorageService';

const CREATED_AT = '2026-08-24T12:00:00.000Z';
const UPDATED_AT = '2026-08-24T13:00:00.000Z';

describe('createLivingThesesStorageService', () => {
  it('creates and lists a tickerless Living Thesis with main-owned identity and timestamps', async () => {
    const ids = idSequence('thesis-uuid', 'risk-uuid', 'catalyst-uuid');
    const service = createLivingThesesStorageService(
      () => createSqliteStorage(),
      { createId: ids, now: () => CREATED_AT }
    );

    const result = await service.create(makeInput({ ticker: undefined }));

    expect(result).toEqual({
      ok: true,
      value: {
        bearCase: 'Execution slows.',
        bullCase: 'Execution compounds.',
        catalysts: [
          {
            createdAt: CREATED_AT,
            detail: 'Durable product cycle.',
            id: 'catalyst-uuid',
            status: 'open',
            thesisId: 'thesis-uuid',
            title: 'Product launch',
            updatedAt: CREATED_AT
          }
        ],
        conviction: 'medium',
        createdAt: CREATED_AT,
        entityName: 'Acme Research',
        id: 'thesis-uuid',
        lifecycle: 'active',
        nextReviewAt: '2026-10-01',
        reviewCadenceDays: 30,
        riskLevel: 'medium',
        risks: [
          {
            createdAt: CREATED_AT,
            detail: 'Monitor customer concentration.',
            id: 'risk-uuid',
            severity: 'high',
            status: 'open',
            thesisId: 'thesis-uuid',
            title: 'Customer concentration',
            updatedAt: CREATED_AT
          }
        ],
        summary: 'A durable research record.',
        theme: 'Quality compounders',
        title: 'Durable execution thesis',
        updatedAt: CREATED_AT,
        version: 1
      }
    });
    await expect(service.list()).resolves.toEqual({
      ok: true,
      value: result.ok ? [result.value] : []
    });

    await service.close();
  });

  it('updates with the expected version, adds stable children, and rejects stale writes', async () => {
    const ids = idSequence(
      'thesis-uuid',
      'risk-uuid',
      'catalyst-uuid',
      'new-risk-uuid',
      'new-catalyst-uuid'
    );
    let timestamp = CREATED_AT;
    const service = createLivingThesesStorageService(
      () => createSqliteStorage(),
      { createId: ids, now: () => timestamp }
    );
    const created = await service.create(makeInput());

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    timestamp = UPDATED_AT;
    const updateInput = {
      ...toUpdateInput(created.value),
      lifecycle: 'monitoring' as const,
      risks: [
        { ...toUpdateInput(created.value).risks[0], status: 'retired' as const },
        { severity: 'low' as const, status: 'open' as const, title: 'New risk' }
      ],
      catalysts: [
        ...toUpdateInput(created.value).catalysts,
        { status: 'open' as const, title: 'New catalyst' }
      ]
    };
    const updated = await service.update(updateInput, 1);

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.version).toBe(2);
    expect(updated.value.updatedAt).toBe(UPDATED_AT);
    expect(updated.value.risks.map((risk) => [risk.id, risk.status])).toEqual([
      ['risk-uuid', 'retired'],
      ['new-risk-uuid', 'open']
    ]);
    expect(updated.value.catalysts.map((catalyst) => catalyst.id)).toEqual([
      'catalyst-uuid',
      'new-catalyst-uuid'
    ]);
    expect(updated.value.risks[0]?.updatedAt).toBe(UPDATED_AT);
    expect(updated.value.catalysts[0]?.updatedAt).toBe(CREATED_AT);
    expect(updated.value.catalysts[1]?.updatedAt).toBe(UPDATED_AT);

    await expect(service.update(updateInput, 1)).resolves.toMatchObject({
      code: 'conflict',
      ok: false
    });
    await expect(service.getById(created.value.id)).resolves.toEqual(updated);

    await service.close();
  });

  it('allows separate persisted theses to share a ticker', async () => {
    const service = createLivingThesesStorageService(
      () => createSqliteStorage(),
      {
        createId: idSequence(
          'thesis-one',
          'risk-one',
          'catalyst-one',
          'thesis-two',
          'risk-two',
          'catalyst-two'
        ),
        now: () => CREATED_AT
      }
    );

    expect((await service.create(makeInput())).ok).toBe(true);
    expect(
      (
        await service.create(
          makeInput({ entityName: 'Second Acme thesis', title: 'Second view' })
        )
      ).ok
    ).toBe(true);
    const listed = await service.list();
    expect(listed.ok && listed.value.map((item) => item.ticker)).toEqual([
      'ACME',
      'ACME'
    ]);

    await service.close();
  });

  it('returns safe domain validation errors without writing invalid input', async () => {
    const service = createLivingThesesStorageService(
      () => createSqliteStorage(),
      {
        createId: idSequence('invalid-thesis', 'invalid-risk', 'invalid-catalyst'),
        now: () => CREATED_AT
      }
    );

    const result = await service.create(makeInput({ entityName: '   ' }));
    expect(result).toEqual({
      code: 'validation',
      errors: ['Living Thesis entity name is required.'],
      ok: false
    });
    await expect(service.list()).resolves.toEqual({ ok: true, value: [] });

    await service.close();
  });

  it('rejects child omission without incrementing the saved version', async () => {
    const service = createLivingThesesStorageService(
      () => createSqliteStorage(),
      {
        createId: idSequence('thesis-uuid', 'risk-uuid', 'catalyst-uuid'),
        now: () => CREATED_AT
      }
    );
    const created = await service.create(makeInput());

    if (!created.ok) throw new Error('Expected fixture creation to succeed.');
    const result = await service.update(
      { ...toUpdateInput(created.value), risks: [] },
      1
    );

    expect(result).toMatchObject({ code: 'validation', ok: false });
    const persisted = await service.getById(created.value.id);
    expect(persisted.ok && persisted.value.version).toBe(1);
    expect(persisted.ok && persisted.value.risks).toHaveLength(1);

    await service.close();
  });

  it('retains records after the renderer-facing service closes and reopens storage', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'thesis-board-stage-4-'));
    const filename = join(directory, 'living-theses.sqlite');

    try {
      const firstService = createLivingThesesStorageService(
        () => createSqliteStorage({ filename }),
        {
          createId: idSequence('thesis-uuid', 'risk-uuid', 'catalyst-uuid'),
          now: () => CREATED_AT
        }
      );
      const created = await firstService.create(makeInput());
      expect(created.ok).toBe(true);
      await firstService.close();

      const reopenedService = createLivingThesesStorageService(() =>
        createSqliteStorage({ filename })
      );
      const reopened = await reopenedService.list();
      expect(reopened.ok && reopened.value).toHaveLength(1);
      expect(reopened.ok && reopened.value[0]?.id).toBe('thesis-uuid');
      await reopenedService.close();
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it('returns a safe storage error without exposing an underlying path', async () => {
    const service = createLivingThesesStorageService(async () => {
      throw new Error('C:\\Users\\private\\thesis-investing.sqlite');
    });

    await expect(service.list()).resolves.toEqual({
      code: 'storage',
      errors: ['Living Thesis storage is unavailable. Try again.'],
      ok: false
    });
  });
});

function makeInput(
  overrides: Partial<CreateLivingThesisInput> = {}
): CreateLivingThesisInput {
  return {
    bearCase: 'Execution slows.',
    bullCase: 'Execution compounds.',
    catalysts: [
      {
        detail: 'Durable product cycle.',
        status: 'open',
        title: 'Product launch'
      }
    ],
    conviction: 'medium',
    entityName: 'Acme Research',
    lifecycle: 'active',
    nextReviewAt: '2026-10-01',
    reviewCadenceDays: 30,
    riskLevel: 'medium',
    risks: [
      {
        detail: 'Monitor customer concentration.',
        severity: 'high',
        status: 'open',
        title: 'Customer concentration'
      }
    ],
    summary: 'A durable research record.',
    theme: 'Quality compounders',
    ticker: 'ACME',
    title: 'Durable execution thesis',
    ...overrides
  };
}

function toUpdateInput(thesis: LivingThesis) {
  return {
    bearCase: thesis.bearCase,
    bullCase: thesis.bullCase,
    catalysts: thesis.catalysts.map(({ id, detail, status, title }) => ({
      detail,
      id,
      status,
      title
    })),
    conviction: thesis.conviction,
    entityName: thesis.entityName,
    id: thesis.id,
    lifecycle: thesis.lifecycle,
    nextReviewAt: thesis.nextReviewAt,
    reviewCadenceDays: thesis.reviewCadenceDays,
    riskLevel: thesis.riskLevel,
    risks: thesis.risks.map(({ id, detail, severity, status, title }) => ({
      detail,
      id,
      severity,
      status,
      title
    })),
    summary: thesis.summary,
    theme: thesis.theme,
    ticker: thesis.ticker,
    title: thesis.title
  };
}

function idSequence(...ids: string[]): () => string {
  let index = 0;
  return () => {
    const id = ids[index];
    index += 1;
    if (!id) throw new Error('Test ID sequence exhausted.');
    return id;
  };
}
