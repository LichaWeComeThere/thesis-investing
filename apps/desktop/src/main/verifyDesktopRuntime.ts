import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { app, BrowserWindow, safeStorage, session } from 'electron';
import { createCredentialStore } from './dataConnection/credentialStore';
import { secureAppWindow } from './electronSecurity';
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

// Only the Node launcher may supply this disposable profile. Never use normal user data.
const profilePath = process.env.THESIS_RUNTIME_VERIFY_USER_DATA;
if (!profilePath || !basename(profilePath).startsWith('mkii-electron-runtime-')) {
  throw new Error('Run desktop runtime verification through its Node launcher.');
}
const directory: string = profilePath;
app.setPath('userData', directory);
app.setPath('sessionData', directory);
app.setAppLogsPath(join(directory, 'logs'));
app.disableHardwareAcceleration();
const mainDirectory = dirname(fileURLToPath(import.meta.url));
const rendererUrl = pathToFileURL(join(mainDirectory, '../renderer/index.html')).href;
let stage = 'startup';
const deadline = setTimeout(() => {
  console.error(`[desktop verification] Timed out during ${stage}.`);
  app.exit(1);
}, 30_000);

function createWindow(subframeProbe = false): BrowserWindow {
  return new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(mainDirectory, '../preload/preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      webSecurity: true, webviewTag: false, allowRunningInsecureContent: false,
      // Adversarial fixture only: let a subframe reach the real preload so the IPC guard is tested.
      nodeIntegrationInSubFrames: subframeProbe
    }
  });
}

async function verify(): Promise<void> {
  await app.whenReady();
  console.log(`[desktop verification] Electron ${process.versions.electron}; Node ${process.versions.node}.`);
  let networkAttempt = false;
  // The provider transport uses Node fetch, outside Electron's session hooks.
  globalThis.fetch = async () => { networkAttempt = true; throw new Error('Live requests are disabled during runtime verification.'); };
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_details, callback) => {
    networkAttempt = true;
    callback({ cancel: true });
  });
  [registerDataConnectionIpc, registerDashboardSummariesIpc, registerDecisionsIpc,
    registerThesisHistoryIpc, registerLocalDataIpc, registerLivingThesesIpc,
    registerReviewSessionsIpc, registerReviewQueueIpc, registerMbsScoreSnapshotsIpc,
    registerPortfolioRankerIpc, registerRemindersIpc, registerThesisNotesIpc,
    registerWatchlistIpc].forEach((register) => register());

  stage = 'built renderer and real sandboxed preload';
  const window = createWindow();
  let preloadFailed = false;
  window.webContents.on('preload-error', () => { preloadFailed = true; });
  secureAppWindow(window.webContents, rendererUrl);
  await window.loadURL(rendererUrl);
  const rendered = await window.webContents.executeJavaScript(`new Promise((resolve) => {
    const check = () => {
      const main = document.querySelector('#root main');
      if (main && main.textContent.trim()) resolve(true);
      else setTimeout(check, 50);
    };
    check();
  })`);
  assert.equal(rendered, true);
  assert.equal(preloadFailed, false);
  const boundary = await window.webContents.executeJavaScript(`({
    api: typeof window.thesisInvesting?.watchlist?.list,
    require: typeof window.require, process: typeof window.process,
    style: [...document.styleSheets].some((sheet) => sheet.href?.startsWith('file:')),
    csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content
  })`);
  assert.equal(boundary.api, 'function');
  assert.equal(boundary.require, 'undefined');
  assert.equal(boundary.process, 'undefined');
  assert.equal(boundary.style, true);
  assert.match(boundary.csp, /script-src 'self';/);
  assert.match(boundary.csp, /connect-src 'none';/);
  console.log('[desktop verification] Built renderer, CSS, CSP, and isolated preload loaded.');

  stage = 'trusted research IPC';
  const research = await window.webContents.executeJavaScript(`(async () => {
    const api = window.thesisInvesting;
    const item = { id: 'runtime-smoke', ticker: 'msft', companyName: 'Runtime smoke', tags: [], note: 'Temporary verification' };
    const saved = await api.watchlist.save(item);
    const listed = await api.watchlist.list();
    const data = await api.localData.get();
    const removed = await api.watchlist.remove(item.id);
    return { saved, listed, data, removed };
  })()`);
  assert.equal(research.saved.ok, true);
  assert.equal(research.saved.value.ticker, 'MSFT');
  assert.equal(research.listed.ok, true);
  assert.equal(research.listed.value.some((item: { id: string }) => item.id === 'runtime-smoke'), true);
  assert.equal(research.data.ok, true);
  assert.equal(research.data.value.userDataPath, directory);
  assert.equal(research.removed.ok, true);
  console.log('[desktop verification] Trusted preload IPC persisted/read/removed temporary research in SQLite.');

  stage = 'foreign window and frame IPC rejection';
  const rejectionProbe = `(async () => {
    if (!window.thesisInvesting?.watchlist) return 'missing-preload';
    try { await window.thesisInvesting.watchlist.list(); return 'unexpected-access'; }
    catch (error) { return String(error).includes('Untrusted IPC sender.') ? 'rejected' : 'wrong-error'; }
  })()`;
  const foreign = createWindow();
  await foreign.loadURL(rendererUrl); // Same app URL must not grant another window access.
  assert.equal(await foreign.webContents.executeJavaScript(rejectionProbe), 'rejected');
  foreign.destroy();
  const fixture = join(directory, 'frame-probe.html');
  await writeFile(fixture, '<!doctype html><html><body><iframe srcdoc="<p>Untrusted frame</p>"></iframe></body></html>');
  const frameWindow = createWindow(true);
  await frameWindow.loadFile(fixture);
  // Trust only the fixture's main frame after loading; child IPC must remain rejected.
  secureAppWindow(frameWindow.webContents, pathToFileURL(fixture).href);
  const frame = frameWindow.webContents.mainFrame.frames[0];
  assert.ok(frame);
  assert.equal(await frame.executeJavaScript(rejectionProbe), 'rejected');
  frameWindow.destroy();
  console.log('[desktop verification] Same-URL foreign window and trusted-window subframe IPC rejected.');

  stage = 'native encrypted credentials';
  const available = safeStorage.isEncryptionAvailable() &&
    (process.platform !== 'linux' || !['basic_text', 'unknown'].includes(safeStorage.getSelectedStorageBackend()));
  if (!available) {
    assert.equal(process.platform, 'linux', 'Native secure storage is required on Windows/macOS.');
    console.log('[desktop verification] SKIP native credentials: Linux secure backend unavailable.');
  } else {
    const credentialDirectory = join(directory, 'data-connection');
    const store = createCredentialStore({ directory: credentialDirectory, encryption: {
      isAvailable: () => available,
      encrypt: (value) => safeStorage.encryptString(value),
      decrypt: (value) => safeStorage.decryptString(value)
    } });
    const fakeKey = `runtime-test-${randomUUID()}`;
    const result = await window.webContents.executeJavaScript(`window.thesisInvesting.dataConnection.saveKey(${JSON.stringify(fakeKey)})`);
    assert.equal(result.ok, true);
    assert.equal(result.value.configured, true);
    assert.equal(result.value.adapterAvailable, true);
    assert.equal((await readFile(join(credentialDirectory, 'api-key.enc'))).includes(Buffer.from(fakeKey)), false);
    assert.equal(await store.readKey(), fakeKey);
    const removed = await window.webContents.executeJavaScript('window.thesisInvesting.dataConnection.remove()');
    assert.equal(removed.ok, true);
    assert.equal(await store.readKey(), null);
    console.log('[desktop verification] Native safeStorage ciphertext roundtrip and preload removal passed.');
  }
  assert.equal(networkAttempt, false, 'Unexpected network request.');
  console.log('[desktop verification] Passed; no live network calls or real user data used.');
}

void verify().then(() => {
  clearTimeout(deadline);
  // Normal quit runs storage service shutdown hooks. The launcher removes the profile after exit.
  process.exitCode = 0;
  setTimeout(() => app.exit(1), 5000).unref();
  app.quit();
}).catch(() => {
  clearTimeout(deadline);
  // Assertion values can contain the throwaway credential; only emit the failing stage.
  console.error(`[desktop verification] Failed during ${stage}.`);
  app.exit(1);
});
