import { handleTrustedIpc } from './electronSecurity';
import { app, dialog, shell } from 'electron';

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

  handleTrustedIpc(localDataStorageChannels.exportToJson, () =>
    service.exportToJson()
  );
  handleTrustedIpc(localDataStorageChannels.get, () => service.get());
  handleTrustedIpc(localDataStorageChannels.importFromJson, (_event, previewId) =>
    service.importFromJson(previewId)
  );
  handleTrustedIpc(localDataStorageChannels.openDataFolder, () =>
    service.openDataFolder()
  );
  handleTrustedIpc(localDataStorageChannels.previewImportFromJson, () =>
    service.previewImportFromJson()
  );

  app.once('before-quit', () => {
    void service.close();
  });
}
