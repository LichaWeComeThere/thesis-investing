import { BrowserWindow, app } from 'electron';
import { appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** ESM-safe __dirname (avoid relying on bundler-only `import.meta.dirname` semantics). */
const __dirname = dirname(fileURLToPath(import.meta.url));

// #region agent log
function agentLog(
  hypothesisId: string,
  message: string,
  data: Record<string, unknown>
): void {
  const payload = {
    sessionId: '39ece8',
    runId: 'runtime',
    hypothesisId,
    location: 'src/main/main.ts',
    message,
    data: { ...data, processCwd: process.cwd() },
    timestamp: Date.now()
  };
  const line = `${JSON.stringify(payload)}\n`;
  process.stderr.write(`[agent-debug-ndjson]${line}`);
  /** Repo-root log from bundle path + cwd fallback (pnpm may use package cwd). */
  const logTargets = [
    join(__dirname, '../../../../debug-39ece8.log'),
    join(process.cwd(), 'debug-39ece8.log')
  ];
  const seen = new Set<string>();
  for (const logPath of logTargets) {
    const key = resolve(logPath);
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      appendFileSync(logPath, line, 'utf8');
    } catch {
      /* ignore */
    }
  }
  fetch('http://127.0.0.1:7485/ingest/0b6c64f0-7106-477a-8ec6-1ca53003e3d2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '39ece8'
    },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

agentLog('H-main-boot', 'main process module loaded', {
  cwd: process.cwd(),
  electron: process.versions.electron,
  node: process.versions.node
});
// #endregion

function createWindow(): void {
  const preloadPath = join(__dirname, '../preload/preload.mjs');
  // #region agent log
  agentLog('H-main-window', 'createWindow', {
    __dirname,
    preloadPath,
    rendererUrl: process.env.ELECTRON_RENDERER_URL ?? null
  });
  // #endregion

  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: '#f7f4ef',
    title: 'Thesis Investing',
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
      sandbox: true
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
}

void app.whenReady().then(() => {
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
