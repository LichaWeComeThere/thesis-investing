import { describe, expect, it } from 'vitest';

import type { LivingThesesStorageService } from './livingThesesStorageService';
import { createLivingThesesIpcHandlers } from './livingThesesIpcHandlers';

describe('createLivingThesesIpcHandlers', () => {
  it('maps list, get, create, and versioned update to the storage service', async () => {
    const calls: string[] = [];
    const input = {
      catalysts: [],
      conviction: 'unrated' as const,
      entityName: 'Entity',
      lifecycle: 'draft' as const,
      riskLevel: 'unrated' as const,
      risks: [],
      summary: 'Summary',
      title: 'Title'
    };
    const service: LivingThesesStorageService = {
      async close() {},
      async create() {
        calls.push('create');
        return { code: 'validation', errors: ['test'], ok: false };
      },
      async getById(id) {
        calls.push(`get:${id}`);
        return { code: 'not-found', errors: ['test'], ok: false };
      },
      async list() {
        calls.push('list');
        return { ok: true, value: [] };
      },
      async update(_update, expectedVersion) {
        calls.push(`update:${expectedVersion}`);
        return { code: 'conflict', errors: ['test'], ok: false };
      }
    };
    const handlers = createLivingThesesIpcHandlers(service);

    await handlers.list();
    await handlers.getById('thesis-id');
    await handlers.create(input);
    await handlers.update({ ...input, id: 'thesis-id' }, 2);

    expect(calls).toEqual(['list', 'get:thesis-id', 'create', 'update:2']);
  });
});
