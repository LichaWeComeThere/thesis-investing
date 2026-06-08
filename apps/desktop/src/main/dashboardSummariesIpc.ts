import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { dashboardSummariesStorageChannels } from '../shared/dashboardSummariesStorage';
import { createSqliteDashboardSummariesStorageService } from './dashboardSummariesStorageService';

export function registerDashboardSummariesIpc(): void {
  const databaseFile = getDatabaseFilePath();
  const service = createSqliteDashboardSummariesStorageService(databaseFile);

  ipcMain.handle(dashboardSummariesStorageChannels.get, () => service.get());

  app.once('before-quit', () => {
    void service.close();
  });
}

function getDatabaseFilePath(): string {
  const databaseFile = join(app.getPath('userData'), 'thesis-investing.sqlite');
  mkdirSync(dirname(databaseFile), { recursive: true });
  return databaseFile;
}
