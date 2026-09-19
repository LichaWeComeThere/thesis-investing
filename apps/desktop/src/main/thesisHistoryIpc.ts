import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { thesisHistoryStorageChannels as channels } from '../shared/thesisHistoryStorage';
import { createSqliteStorage } from '../storage/sqlite';
import { createThesisHistoryStorageService } from './thesisHistoryStorageService';
import { createThesisHistoryIpcHandlers } from './thesisHistoryIpcHandlers';

export function registerThesisHistoryIpc(): void {
  const filename = join(app.getPath('userData'), 'thesis-investing.sqlite');
  mkdirSync(dirname(filename), { recursive: true });
  const service = createThesisHistoryStorageService(() => createSqliteStorage({ filename }));
  const handlers = createThesisHistoryIpcHandlers(service);
  ipcMain.handle(channels.get, (_event, thesisId: unknown) => handlers.get(thesisId));
  app.once('before-quit', () => { void service.close(); });
}
