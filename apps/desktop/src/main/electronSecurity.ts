import { ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron';
import { pathToFileURL } from 'node:url';

// Object identity matters: another window at the same URL never inherits access.
const trustedWindows = new WeakMap<WebContents, string>();

export function getRendererUrl(options: {
  isPackaged: boolean;
  rendererFile: string;
  developmentUrl?: string;
}): string {
  if (options.isPackaged || !options.developmentUrl) {
    return pathToFileURL(options.rendererFile).href;
  }
  const url = new URL(options.developmentUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username || url.password || url.search || url.hash
  ) {
    throw new Error('The renderer development URL must be a local app document.');
  }
  return url.href;
}

function isAppDocument(candidate: string, expected: string): boolean {
  try {
    const url = new URL(candidate);
    // In-page anchors do not change the trusted document. Queries and other
    // paths do; file:// origins alone are never sufficient authorization.
    url.hash = '';
    return url.href === expected;
  } catch {
    return false;
  }
}

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  try {
    const expected = trustedWindows.get(event.sender);
    return Boolean(
      expected && !event.sender.isDestroyed() &&
      event.senderFrame && event.senderFrame === event.sender.mainFrame &&
      isAppDocument(event.senderFrame.url, expected) &&
      isAppDocument(event.sender.getURL(), expected)
    );
  } catch {
    // Detached/destroyed frames may throw when inspected. Never pass through.
    return false;
  }
}

export const handleTrustedIpc: typeof ipcMain.handle = (channel, listener) => {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
    return listener(event, ...args);
  });
};

export function secureAppWindow(contents: WebContents, rendererUrl: string): void {
  trustedWindows.set(contents, rendererUrl);
  contents.once('destroyed', () => trustedWindows.delete(contents));
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.on('will-navigate', (event) => {
    if (!isAppDocument(event.url, rendererUrl)) event.preventDefault();
  });
  contents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame || !isAppDocument(event.url, rendererUrl)) {
      event.preventDefault();
    }
  });
  contents.on('will-redirect', (event) => {
    if (!event.isMainFrame || !isAppDocument(event.url, rendererUrl)) {
      event.preventDefault();
    }
  });
  contents.session.setPermissionCheckHandler(() => false);
  contents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  contents.session.setDevicePermissionHandler(() => false);
}
