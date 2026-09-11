import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { reviewSessionsStorageChannels as channels } from '../shared/reviewSessionsStorage';
import { createSqliteStorage } from '../storage/sqlite';
import { createReviewSessionStorageService } from './reviewSessionStorageService';
import { createReviewSessionsIpcHandlers } from './reviewSessionsIpcHandlers';

export function registerReviewSessionsIpc(): void {
  const filename = join(app.getPath('userData'), 'thesis-investing.sqlite');
  mkdirSync(dirname(filename), { recursive: true });
  const service = createReviewSessionStorageService(() => createSqliteStorage({ filename }));
  const handlers = createReviewSessionsIpcHandlers(service);
  ipcMain.handle(channels.getActive, (_event, id: unknown) => handlers.getActive(id));
  ipcMain.handle(channels.start, (_event, id: unknown) => handlers.start(id));
  ipcMain.handle(channels.resume, (_event, id: unknown) => handlers.resume(id));
  ipcMain.handle(channels.saveDraft, (_event, id: unknown, workflow: unknown, version: unknown) => handlers.saveDraft(id, workflow, version));
  app.once('before-quit', () => { void service.close(); });
}
