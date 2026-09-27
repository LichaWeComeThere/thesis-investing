import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMainInvokeEvent, WebContents } from 'electron';

const { handle } = vi.hoisted(() => ({ handle: vi.fn() }));
vi.mock('electron', () => ({ ipcMain: { handle } }));
import { getRendererUrl, handleTrustedIpc, secureAppWindow } from './electronSecurity';

const documentUrl = 'file:///app/renderer/index.html';
function fakeWindow(url = documentUrl) {
  const emitter = new EventEmitter();
  const contents = Object.assign(emitter, {
    mainFrame: { url },
    getURL: vi.fn(() => url),
    isDestroyed: vi.fn(() => false),
    setWindowOpenHandler: vi.fn(),
    session: {
      setPermissionCheckHandler: vi.fn(),
      setPermissionRequestHandler: vi.fn(),
      setDevicePermissionHandler: vi.fn()
    }
  });
  const webContents = contents as unknown as WebContents;
  const event = { sender: webContents, senderFrame: contents.mainFrame } as unknown as IpcMainInvokeEvent;
  return { contents, webContents, event };
}
function registration() {
  const listener = vi.fn((_event: IpcMainInvokeEvent, input: unknown) => ({ input }));
  handleTrustedIpc('sensitive:operation', listener);
  return { listener, invoke: handle.mock.calls[0][1] as typeof listener };
}

beforeEach(() => handle.mockClear());

describe('trusted IPC registration', () => {
  it('registers a checked callback and forwards only the known current main frame', () => {
    const { contents, webContents, event } = fakeWindow();
    secureAppWindow(webContents, documentUrl);
    const { listener, invoke } = registration();
    expect(handle.mock.calls[0][0]).toBe('sensitive:operation');
    expect(invoke(event, { thesisId: 'one' })).toEqual({ input: { thesisId: 'one' } });
    contents.mainFrame.url = `${documentUrl}#history`;
    contents.getURL.mockReturnValue(`${documentUrl}#history`);
    expect(invoke(event, 'anchor')).toEqual({ input: 'anchor' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('blocks other windows and subframes even when their URL is identical', () => {
    const allowed = fakeWindow();
    secureAppWindow(allowed.webContents, documentUrl);
    const { listener, invoke } = registration();
    expect(() => invoke(fakeWindow().event, 'secret')).toThrow('Untrusted IPC sender.');
    const child = { ...allowed.event, senderFrame: { url: documentUrl } } as IpcMainInvokeEvent;
    expect(() => invoke(child, 'secret')).toThrow('Untrusted IPC sender.');
    expect(() => invoke({ ...allowed.event, senderFrame: null }, 'secret')).toThrow('Untrusted IPC sender.');
    expect(listener).not.toHaveBeenCalled();
  });

  it.each([
    'file:///app/renderer/other.html',
    'file:///app/renderer/index.html?redirect=anything',
    'https://example.com/',
    'about:blank',
    'not-a-url'
  ])('rejects a replaced document: %s', (url) => {
    const { contents, webContents, event } = fakeWindow();
    secureAppWindow(webContents, documentUrl);
    const { listener, invoke } = registration();
    contents.mainFrame.url = url;
    expect(() => invoke(event, null)).toThrow('Untrusted IPC sender.');
    contents.mainFrame.url = documentUrl;
    contents.getURL.mockReturnValue(url);
    expect(() => invoke(event, null)).toThrow('Untrusted IPC sender.');
    expect(listener).not.toHaveBeenCalled();
  });

  it('fails closed for destroyed/detached windows and revokes a destroyed window', () => {
    const { contents, webContents, event } = fakeWindow();
    secureAppWindow(webContents, documentUrl);
    const { listener, invoke } = registration();
    contents.isDestroyed.mockReturnValue(true);
    expect(() => invoke(event, null)).toThrow('Untrusted IPC sender.');
    contents.isDestroyed.mockReturnValue(false);
    contents.getURL.mockImplementationOnce(() => { throw new Error('detached'); });
    expect(() => invoke(event, null)).toThrow('Untrusted IPC sender.');
    contents.emit('destroyed');
    expect(() => invoke(event, null)).toThrow('Untrusted IPC sender.');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('window boundaries', () => {
  it('denies popups, webviews, subframe navigation, and permission requests/checks', () => {
    const { contents, webContents } = fakeWindow();
    secureAppWindow(webContents, documentUrl);
    expect(contents.setWindowOpenHandler.mock.calls[0][0]({ url: documentUrl })).toEqual({ action: 'deny' });
    for (const name of ['will-attach-webview', 'will-frame-navigate', 'will-redirect']) {
      const event = { preventDefault: vi.fn(), url: documentUrl, isMainFrame: false };
      contents.emit(name, event);
      expect(event.preventDefault).toHaveBeenCalledOnce();
    }
    expect(contents.session.setPermissionCheckHandler.mock.calls[0][0]()).toBe(false);
    expect(contents.session.setDevicePermissionHandler.mock.calls[0][0]()).toBe(false);
    const callback = vi.fn();
    contents.session.setPermissionRequestHandler.mock.calls[0][0](webContents, 'media', callback);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it.each(['will-navigate', 'will-frame-navigate', 'will-redirect'])(
    'allows only the app main document through %s', (name) => {
      const { contents, webContents } = fakeWindow();
      secureAppWindow(webContents, documentUrl);
      for (const url of [documentUrl, `${documentUrl}#history`]) {
        const event = { preventDefault: vi.fn(), url, isMainFrame: true };
        contents.emit(name, event);
        expect(event.preventDefault).not.toHaveBeenCalled();
      }
      for (const url of ['https://example.com', `${documentUrl}?x=1`, 'file:///etc/passwd']) {
        const event = { preventDefault: vi.fn(), url, isMainFrame: true };
        contents.emit(name, event);
        expect(event.preventDefault).toHaveBeenCalledOnce();
      }
    }
  );

  it('ignores the development environment in packaged apps and escapes the file URL', () => {
    expect(getRendererUrl({ isPackaged: true, rendererFile: '/app folder/index.html', developmentUrl: 'https://attacker.example' }))
      .toBe('file:///app%20folder/index.html');
  });

  it('accepts only exact loopback development hosts and a credential-free document', () => {
    for (const developmentUrl of ['http://localhost:5173/', 'http://127.0.0.1:5173/', 'http://[::1]:5173/']) {
      expect(getRendererUrl({ isPackaged: false, rendererFile: '/app/index.html', developmentUrl })).toBe(developmentUrl);
    }
    for (const developmentUrl of ['https://localhost.attacker.example', 'file:///etc/passwd', 'http://user@localhost:5173', 'http://localhost:5173/?x=1', 'http://localhost:5173/#x', 'garbage']) {
      expect(() => getRendererUrl({ isPackaged: false, rendererFile: '/app/index.html', developmentUrl })).toThrow();
    }
  });

  it('does not authorize a different path on the dev server', () => {
    const url = 'http://127.0.0.1:5173/';
    const { contents, webContents, event } = fakeWindow(url);
    secureAppWindow(webContents, url);
    const { listener, invoke } = registration();
    invoke(event, null);
    contents.mainFrame.url = 'http://127.0.0.1:5173/other';
    expect(() => invoke(event, null)).toThrow('Untrusted IPC sender.');
    expect(listener).toHaveBeenCalledOnce();
  });
});
