import { handleTrustedIpc } from './electronSecurity';
import { app } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  watchlistStorageChannels,
  type WatchlistStorageResult
} from '../shared/watchlistStorage';
import { createSqliteWatchlistStorageService } from './watchlistStorageService';
import type { WatchlistItem } from '@thesis-investing/core';

export function registerWatchlistIpc(): void {
  const databaseFile = getDatabaseFilePath();
  const service = createSqliteWatchlistStorageService(databaseFile);

  handleTrustedIpc(watchlistStorageChannels.list, () => service.list());

  handleTrustedIpc(
    watchlistStorageChannels.save,
    (_event, item: WatchlistItem) => service.save(item)
  );

  handleTrustedIpc(
    watchlistStorageChannels.remove,
    (_event, id: string): Promise<WatchlistStorageResult<boolean>> =>
      service.remove(id)
  );

  app.once('before-quit', () => {
    void service.close();
  });
}

function getDatabaseFilePath(): string {
  const databaseFile = join(app.getPath('userData'), 'thesis-investing.sqlite');
  mkdirSync(dirname(databaseFile), { recursive: true });
  return databaseFile;
}
