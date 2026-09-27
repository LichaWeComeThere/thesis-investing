import { handleTrustedIpc } from './electronSecurity';
import type { MbsScoreSnapshot } from '@thesis-investing/core';
import { app } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { mbsScoreSnapshotsStorageChannels } from '../shared/mbsScoreSnapshotsStorage';
import { createSqliteMbsScoreSnapshotsStorageService } from './mbsScoreSnapshotsStorageService';

export function registerMbsScoreSnapshotsIpc(): void {
  const databaseFile = getDatabaseFilePath();
  const service = createSqliteMbsScoreSnapshotsStorageService(databaseFile);

  handleTrustedIpc(mbsScoreSnapshotsStorageChannels.list, () => service.list());

  handleTrustedIpc(
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
