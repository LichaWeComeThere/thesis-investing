import type { Reminder } from '@thesis-investing/core';
import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  remindersStorageChannels,
  type RemindersStorageResult
} from '../shared/remindersStorage';
import { createSqliteRemindersStorageService } from './remindersStorageService';

export function registerRemindersIpc(): void {
  const databaseFile = getDatabaseFilePath();
  const service = createSqliteRemindersStorageService(databaseFile);

  ipcMain.handle(remindersStorageChannels.list, () => service.list());

  ipcMain.handle(remindersStorageChannels.save, (_event, reminder: Reminder) =>
    service.save(reminder)
  );

  ipcMain.handle(
    remindersStorageChannels.remove,
    (_event, id: string): Promise<RemindersStorageResult<boolean>> =>
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
