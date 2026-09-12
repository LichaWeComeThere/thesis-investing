import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { decisionsStorageChannels as channels } from '../shared/decisionsStorage';
import { createSqliteStorage } from '../storage/sqlite';
import { createDecisionsStorageService } from './decisionsStorageService';
import { createDecisionsIpcHandlers } from './decisionsIpcHandlers';

export function registerDecisionsIpc(): void {
  const filename = join(app.getPath('userData'), 'thesis-investing.sqlite');
  mkdirSync(dirname(filename), { recursive: true });
  const service = createDecisionsStorageService(() => createSqliteStorage({ filename }));
  const handlers = createDecisionsIpcHandlers(service);
  ipcMain.handle(channels.list, (_event, thesisId: unknown) => handlers.list(thesisId));
  ipcMain.handle(channels.listCompletedReviews, (_event, thesisId: unknown) => handlers.listCompletedReviews(thesisId));
  ipcMain.handle(channels.create, (_event, thesisId: unknown, input: unknown, requestId: unknown) => handlers.create(thesisId, input, requestId));
  app.once('before-quit', () => { void service.close(); });
}
