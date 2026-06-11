import { describe, expect, it } from 'vitest';

import { getDefaultLocalDataStorageClient } from './localDataStorageClient';

describe('localDataStorageClient', () => {
  it('returns null when the preload local data API is unavailable', () => {
    expect(getDefaultLocalDataStorageClient()).toBeNull();
  });
});
