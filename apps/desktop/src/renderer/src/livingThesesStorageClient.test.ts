import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getDefaultLivingThesesStorageClient } from './livingThesesStorageClient';

describe('getDefaultLivingThesesStorageClient', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {}
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('returns only the Living Thesis preload API', () => {
    const livingTheses = {
      create: async () => ({ code: 'validation' as const, errors: [], ok: false as const }),
      getById: async () => ({ code: 'not-found' as const, errors: [], ok: false as const }),
      list: async () => ({ ok: true as const, value: [] }),
      update: async () => ({ code: 'conflict' as const, errors: [], ok: false as const })
    };
    window.thesisInvesting = {
      livingTheses
    } as unknown as Window['thesisInvesting'];

    expect(getDefaultLivingThesesStorageClient()).toBe(livingTheses);
  });
});
