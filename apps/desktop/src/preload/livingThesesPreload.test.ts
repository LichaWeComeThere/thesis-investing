import { describe, expect, it } from 'vitest';

import { livingThesesStorageChannels } from '../shared/livingThesesStorage';
import { createLivingThesesPreloadApi } from './livingThesesPreload';

describe('createLivingThesesPreloadApi', () => {
  it('exposes only the narrow Living Thesis channels with typed arguments', async () => {
    const calls: Array<{ args: readonly unknown[]; channel: string }> = [];
    const api = createLivingThesesPreloadApi(async (channel, ...args) => {
      calls.push({ args, channel });
      return { ok: true, value: [] };
    });
    const input = {
      catalysts: [],
      conviction: 'unrated' as const,
      entityName: 'Private company',
      lifecycle: 'draft' as const,
      riskLevel: 'unrated' as const,
      risks: [],
      summary: 'A locally saved research record.',
      title: 'Tickerless thesis'
    };

    await api.list();
    await api.getById('thesis-id');
    await api.create(input);
    await api.update({ ...input, id: 'thesis-id' }, 3);

    expect(calls).toEqual([
      { args: [], channel: livingThesesStorageChannels.list },
      { args: ['thesis-id'], channel: livingThesesStorageChannels.getById },
      { args: [input], channel: livingThesesStorageChannels.create },
      {
        args: [{ ...input, id: 'thesis-id' }, 3],
        channel: livingThesesStorageChannels.update
      }
    ]);
    expect(Object.keys(api).sort()).toEqual(['create', 'getById', 'list', 'update']);
  });
});
