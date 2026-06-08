import type { MbsScoreSnapshot } from '@thesis-investing/core';
import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { mbsScoreSnapshotsStorageChannels } from '../shared/mbsScoreSnapshotsStorage';
import { createSqliteMbsScoreSnapshotsStorageService } from './mbsScoreSnapshotsStorageService';

export function registerMbsScoreSnapshotsIpc(): void {
  const databaseFile = getDatabaseFilePath();
  const service = createSqliteMbsScoreSnapshotsStorageService(databaseFile);

  ipcMain.handle(mbsScoreSnapshotsStorageChannels.list, () => service.list());

  ipcMain.handle(
    mbsScoreSnapshotsStorageChannels.save,
    (_event, snapshot: MbsScoreSnapshot) => service.save(snapshot)
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
