import { app, dialog, ipcMain, shell } from 'electron';

import { localDataStorageChannels } from '../shared/localDataStorage';
import { createSqliteLocalDataStorageService } from './localDataStorageService';

export function registerLocalDataIpc(): void {
  const service = createSqliteLocalDataStorageService({
    appVersion: app.getVersion(),
    getUserDataPath: () => app.getPath('userData'),
    openPath: (path) => shell.openPath(path),
    showOpenDialog: (options) => dialog.showOpenDialog(options),
    showSaveDialog: (options) => dialog.showSaveDialog(options)
  });

  ipcMain.handle(localDataStorageChannels.exportToJson, () =>
    service.exportToJson()
  );
  ipcMain.handle(localDataStorageChannels.get, () => service.get());
  ipcMain.handle(localDataStorageChannels.importFromJson, (_event, previewId) =>
    service.importFromJson(previewId)
  );
  ipcMain.handle(localDataStorageChannels.openDataFolder, () =>
    service.openDataFolder()
  );
  ipcMain.handle(localDataStorageChannels.previewImportFromJson, () =>
    service.previewImportFromJson()
  );

  app.once('before-quit', () => {
    void service.close();
  });
}
