import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  portfolioRankerStorageChannels,
  type PortfolioRankerStorageResult
} from '../shared/portfolioRankerStorage';
import { createSqlitePortfolioRankerStorageService } from './portfolioRankerStorageService';
import type { PortfolioRankerItem } from '@thesis-investing/core';

export function registerPortfolioRankerIpc(): void {
  const databaseFile = getDatabaseFilePath();
  const service = createSqlitePortfolioRankerStorageService(databaseFile);

  ipcMain.handle(portfolioRankerStorageChannels.list, () => service.list());

  ipcMain.handle(
    portfolioRankerStorageChannels.save,
    (_event, item: PortfolioRankerItem) => service.save(item)
  );

  ipcMain.handle(
    portfolioRankerStorageChannels.remove,
    (_event, id: string): Promise<PortfolioRankerStorageResult<boolean>> =>
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
