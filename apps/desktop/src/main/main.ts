import { BrowserWindow, app } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRendererUrl, secureAppWindow } from './electronSecurity';
import { registerDataConnectionIpc } from './dataConnectionIpc';
import { registerDashboardSummariesIpc } from './dashboardSummariesIpc';
import { registerDecisionsIpc } from './decisionsIpc';
import { registerThesisHistoryIpc } from './thesisHistoryIpc';
import { registerLocalDataIpc } from './localDataIpc';
import { registerLivingThesesIpc } from './livingThesesIpc';
import { registerReviewSessionsIpc } from './reviewSessionsIpc';
import { registerReviewQueueIpc } from './reviewQueueIpc';
import { registerMbsScoreSnapshotsIpc } from './mbsScoreSnapshotsIpc';
import { registerPortfolioRankerIpc } from './portfolioRankerIpc';
import { registerRemindersIpc } from './remindersIpc';
import { registerThesisNotesIpc } from './thesisNotesIpc';
import { registerWatchlistIpc } from './watchlistIpc';

const mainDirname = dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  const rendererUrl = getRendererUrl({
    isPackaged: app.isPackaged,
    rendererFile: join(mainDirname, '../renderer/index.html'),
    developmentUrl: process.env.ELECTRON_RENDERER_URL
  });
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: '#f7f4ef',
    title: 'Thesis Investing',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: join(mainDirname, '../preload/preload.cjs'),
      sandbox: true
    }
  });

  secureAppWindow(mainWindow.webContents, rendererUrl);
  void mainWindow.loadURL(rendererUrl);
}

void app.whenReady().then(() => {
  registerDataConnectionIpc();
  registerDashboardSummariesIpc();
  registerDecisionsIpc();
  registerThesisHistoryIpc();
  registerLocalDataIpc();
  registerLivingThesesIpc();
  registerReviewSessionsIpc();
  registerReviewQueueIpc();
  registerMbsScoreSnapshotsIpc();
  registerPortfolioRankerIpc();
  registerRemindersIpc();
  registerThesisNotesIpc();
  registerWatchlistIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
