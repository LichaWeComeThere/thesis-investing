import { app, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { reviewQueueStorageChannels as channels } from '../shared/reviewQueueStorage';
import { createSqliteStorage } from '../storage/sqlite';
import { createReviewQueueStorageService } from './reviewQueueStorageService';
import { createReviewQueueIpcHandlers } from './reviewQueueIpcHandlers';

export function registerReviewQueueIpc(): void {
  const filename = join(app.getPath('userData'), 'thesis-investing.sqlite');
  mkdirSync(dirname(filename), { recursive: true });
  const service = createReviewQueueStorageService(() => createSqliteStorage({ filename }));
  const handlers = createReviewQueueIpcHandlers(service);
  ipcMain.handle(channels.get, (_event, today: unknown, ...extraArguments: unknown[]) =>
    handlers.get(today, ...extraArguments)
  );
  app.once('before-quit', () => { void service.close(); });
}
