import { app, dialog, ipcMain } from 'electron';

import { localDataStorageChannels } from '../shared/localDataStorage';
import { createSqliteLocalDataStorageService } from './localDataStorageService';

export function registerLocalDataIpc(): void {
  const service = createSqliteLocalDataStorageService({
    appVersion: app.getVersion(),
    getUserDataPath: () => app.getPath('userData'),
    showSaveDialog: (options) => dialog.showSaveDialog(options)
  });

  ipcMain.handle(localDataStorageChannels.exportToJson, () =>
    service.exportToJson()
  );
  ipcMain.handle(localDataStorageChannels.get, () => service.get());

  app.once('before-quit', () => {
    void service.close();
  });
}
