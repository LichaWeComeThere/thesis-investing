import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { livingThesesStorageChannels } from '../shared/livingThesesStorage';
import { createLivingThesesIpcHandlers } from './livingThesesIpcHandlers';
import { createSqliteLivingThesesStorageService } from './livingThesesStorageService';

export function registerLivingThesesIpc(): void {
  const databaseFile = getDatabaseFilePath();
  const service = createSqliteLivingThesesStorageService(databaseFile);
  const handlers = createLivingThesesIpcHandlers(service);

  ipcMain.handle(livingThesesStorageChannels.create, (_event, input) =>
    handlers.create(input)
  );
  ipcMain.handle(livingThesesStorageChannels.getById, (_event, id) =>
    handlers.getById(id)
  );
  ipcMain.handle(livingThesesStorageChannels.list, () => handlers.list());
  ipcMain.handle(
    livingThesesStorageChannels.update,
    (_event, input, expectedVersion) =>
      handlers.update(input, expectedVersion)
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
