import { app, ipcMain } from 'electron';

import { localDataStorageChannels } from '../shared/localDataStorage';
import { createLocalDataStorageService } from './localDataStorageService';

export function registerLocalDataIpc(): void {
  const service = createLocalDataStorageService({
    getUserDataPath: () => app.getPath('userData')
  });

  ipcMain.handle(localDataStorageChannels.get, () => service.get());
}
