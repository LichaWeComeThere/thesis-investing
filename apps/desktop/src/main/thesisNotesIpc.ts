import type { ThesisNote } from '@thesis-investing/core';
import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { thesisNotesStorageChannels } from '../shared/thesisNotesStorage';
import { createSqliteThesisNotesStorageService } from './thesisNotesStorageService';

export function registerThesisNotesIpc(): void {
  const databaseFile = getDatabaseFilePath();
  const service = createSqliteThesisNotesStorageService(databaseFile);

  ipcMain.handle(thesisNotesStorageChannels.list, () => service.list());

  ipcMain.handle(thesisNotesStorageChannels.save, (_event, note: ThesisNote) =>
    service.save(note)
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
