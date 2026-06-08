import { describe, expect, it } from 'vitest';

import { getDefaultDashboardSummariesStorageClient } from './dashboardSummariesStorageClient';

describe('dashboardSummariesStorageClient', () => {
  it('returns null when the preload dashboard summaries API is unavailable', () => {
    expect(getDefaultDashboardSummariesStorageClient()).toBeNull();
  });
});
