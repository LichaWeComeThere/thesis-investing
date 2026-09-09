import { BrowserWindow, app } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerDashboardSummariesIpc } from './dashboardSummariesIpc';
import { registerLocalDataIpc } from './localDataIpc';
import { registerLivingThesesIpc } from './livingThesesIpc';
import { registerMbsScoreSnapshotsIpc } from './mbsScoreSnapshotsIpc';
import { registerPortfolioRankerIpc } from './portfolioRankerIpc';
import { registerRemindersIpc } from './remindersIpc';
import { registerThesisNotesIpc } from './thesisNotesIpc';
import { registerWatchlistIpc } from './watchlistIpc';

const mainDirname = dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: '#f7f4ef',
    title: 'Thesis Investing',
    webPreferences: {
      contextIsolation: true,
      preload: join(mainDirname, '../preload/preload.cjs'),
      sandbox: true
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  void mainWindow.loadFile(join(mainDirname, '../renderer/index.html'));
}

void app.whenReady().then(() => {
  registerDashboardSummariesIpc();
  registerLocalDataIpc();
  registerLivingThesesIpc();
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
