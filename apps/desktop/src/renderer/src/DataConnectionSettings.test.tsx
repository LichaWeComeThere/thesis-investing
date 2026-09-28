// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ConnectionResult, ConnectionStatus, DataConnectionApi } from '../../shared/companyDetails';
import { DataConnectionSettings } from './DataConnectionSettings';

const disconnected: ConnectionStatus = { provider: 'alpha-vantage', configured: false, secureStorageAvailable: true, adapterAvailable: true };
const connected: ConnectionStatus = { ...disconnected, configured: true };
const ok = (value: ConnectionStatus): ConnectionResult<ConnectionStatus> => ({ ok: true, value });

function createApi(status = disconnected): DataConnectionApi {
  return {
    status: vi.fn(async () => ok(status)),
    saveKey: vi.fn(async () => ok(connected)),
    remove: vi.fn(async () => ok(disconnected))
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function keyInput(): HTMLInputElement { return screen.getByLabelText('Alpha Vantage API key'); }
function enterKey(value = 'synthetic-test-key'): void { fireEvent.change(keyInput(), { target: { value } }); }

function NavigationHarness({ api }: { api: DataConnectionApi }): JSX.Element {
  const [pending, setPending] = useState(false);
  const [left, setLeft] = useState(false);
  return left ? <p>Overview opened</p> : <>
    <button type="button" onClick={() => setPending(true)}>Open Overview</button>
    <DataConnectionSettings api={api} navigationRequest={pending ? {
      destination: 'Overview', onLeave: () => setLeft(true), onStay: () => setPending(false)
    } : undefined} />
  </>;
}

beforeAll(() => {
  // React navigation tests; native dialog trapping is covered by browser QA.
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Data connection settings', () => {
  it('reads status only and keeps saved keys out of the masked field', async () => {
    const api = createApi(connected);
    render(<DataConnectionSettings api={api} />);
    await screen.findByText('Key saved on this device');
    expect(keyInput().type).toBe('password');
    expect(keyInput().value).toBe('');
    expect(screen.getByText(/Saving checks the key’s format, not provider access/)).toBeTruthy();
    expect(api.status).toHaveBeenCalledTimes(1);
    expect(api.saveKey).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });

  it('clears a submitted key immediately, serializes clicks, and makes no validation request', async () => {
    const api = createApi();
    const pending = deferred<ConnectionResult<ConnectionStatus>>();
    vi.mocked(api.saveKey).mockReturnValue(pending.promise);
    render(<DataConnectionSettings api={api} />);
    await screen.findByText('No key saved');
    enterKey();
    expect(api.saveKey).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    expect(keyInput().value).toBe('');
    expect(keyInput().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Saving key…' }));
    expect(api.saveKey).toHaveBeenCalledTimes(1);
    expect(api.saveKey).toHaveBeenCalledWith('synthetic-test-key');
    await act(async () => pending.resolve(ok(connected)));
    expect(await screen.findByText(/It has not been checked with Alpha Vantage/)).toBeTruthy();
    expect(api.status).toHaveBeenCalledTimes(1);
    expect(keyInput().value).toBe('');
  });

  it('clears invalid local format without submitting it', async () => {
    const api = createApi();
    render(<DataConnectionSettings api={api} />);
    await screen.findByText('No key saved');
    enterKey('not a valid key');
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    expect(screen.getByRole('alert').textContent).toContain('no spaces');
    expect(keyInput().value).toBe('');
    expect(api.saveKey).not.toHaveBeenCalled();
  });

  it('does not reveal a rejected call’s secret-bearing exception and permits reentry', async () => {
    const api = createApi();
    vi.mocked(api.saveKey).mockRejectedValueOnce(new Error('https://provider.example/?apikey=secret-do-not-display'));
    render(<DataConnectionSettings api={api} />);
    await screen.findByText('No key saved');
    enterKey();
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Enter it again');
    expect(document.body.textContent).not.toContain('secret-do-not-display');
    expect(keyInput().value).toBe('');
    enterKey('synthetic-replacement');
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    await screen.findByText(/It has not been checked/);
    expect(api.saveKey).toHaveBeenLastCalledWith('synthetic-replacement');
  });

  it('maps failed results without displaying raw messages or restoring the key', async () => {
    const api = createApi();
    vi.mocked(api.saveKey).mockResolvedValue({ ok: false, error: { code: 'invalid-key', message: 'secret-do-not-display' } });
    render(<DataConnectionSettings api={api} />);
    await screen.findByText('No key saved');
    enterKey();
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Enter your API key again');
    expect(document.body.textContent).not.toContain('secret-do-not-display');
    expect(keyInput().value).toBe('');
  });

  it('removes the connection and clears an entered replacement without saving it', async () => {
    const api = createApi(connected);
    render(<DataConnectionSettings api={api} />);
    await screen.findByText('Key saved on this device');
    enterKey('unsaved-replacement');
    fireEvent.click(screen.getByRole('button', { name: 'Remove connection' }));
    expect(keyInput().value).toBe('');
    await screen.findByText('Connection removed. Your saved research is unchanged.');
    expect(api.remove).toHaveBeenCalledTimes(1);
    expect(api.saveKey).not.toHaveBeenCalled();
    expect(screen.getByText('No key saved')).toBeTruthy();
  });

  it('allows removal when secure storage is unavailable but disables key entry', async () => {
    const api = createApi({ ...disconnected, secureStorageAvailable: false });
    render(<DataConnectionSettings api={api} />);
    await screen.findByText(/Protected key storage is unavailable on this device/);
    expect(keyInput().disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Save key' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove connection' }));
    await screen.findByText('Connection removed. Your saved research is unchanged.');
    expect(api.remove).toHaveBeenCalledTimes(1);
  });

  it('recovers a status read failure without exposing its raw exception', async () => {
    const api = createApi();
    vi.mocked(api.status).mockRejectedValueOnce(new Error('secret-do-not-display'));
    render(<DataConnectionSettings api={api} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Connection status could not be read');
    expect(document.body.textContent).not.toContain('secret-do-not-display');
    expect(keyInput().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry connection status' }));
    await screen.findByText('No key saved');
    expect(keyInput().disabled).toBe(false);
  });

  it('keeps the desktop-only fallback usable without a connection API', () => {
    render(<DataConnectionSettings api={null} />);
    expect(screen.getByText(/available in the desktop app/)).toBeTruthy();
    expect(screen.queryByLabelText('Alpha Vantage API key')).toBeNull();
    expect(screen.getByText(/Your theses work without a connection/)).toBeTruthy();
  });

  it('ignores a stale status reply after the API instance changes', async () => {
    const oldApi = createApi();
    const pending = deferred<ConnectionResult<ConnectionStatus>>();
    vi.mocked(oldApi.status).mockReturnValue(pending.promise);
    const { rerender } = render(<DataConnectionSettings api={oldApi} />);
    rerender(<DataConnectionSettings api={createApi(connected)} />);
    await screen.findByText('Key saved on this device');
    await act(async () => pending.resolve(ok(disconnected)));
    expect(screen.getByText('Key saved on this device')).toBeTruthy();
    expect(screen.queryByText('No key saved')).toBeNull();
  });
});

describe('Connection key navigation protection', () => {
  it('keeps an unsaved key when continuing and discards it without a write when leaving', async () => {
    const api = createApi();
    render(<NavigationHarness api={api} />);
    await screen.findByText('No key saved');
    enterKey();
    fireEvent.click(screen.getByRole('button', { name: 'Open Overview' }));
    expect(screen.getByRole('dialog', { name: 'Unsaved connection changes' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));
    expect(keyInput().value).toBe('synthetic-test-key');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open Overview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard edits and leave' }));
    expect(await screen.findByText('Overview opened')).toBeTruthy();
    expect(api.saveKey).not.toHaveBeenCalled();
  });

  it('holds navigation while saving and leaves only after a successful result', async () => {
    const api = createApi();
    const pending = deferred<ConnectionResult<ConnectionStatus>>();
    vi.mocked(api.saveKey).mockReturnValue(pending.promise);
    render(<NavigationHarness api={api} />);
    await screen.findByText('No key saved');
    enterKey();
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Overview' }));
    const dialog = screen.getByRole('dialog');
    expect((within(dialog).getByRole('button', { name: 'Discard edits and leave' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole('button', { name: 'Continue editing' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Overview opened')).toBeNull();
    await act(async () => pending.resolve(ok(connected)));
    expect(await screen.findByText('Overview opened')).toBeTruthy();
  });

  it('stays after Save and leave fails, with the key cleared for safe reentry', async () => {
    const api = createApi();
    vi.mocked(api.saveKey).mockRejectedValueOnce(new Error('sensitive-error'));
    render(<NavigationHarness api={api} />);
    await screen.findByText('No key saved');
    enterKey();
    fireEvent.click(screen.getByRole('button', { name: 'Open Overview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));
    expect((await within(screen.getByRole('dialog')).findByRole('alert')).textContent).toContain('Enter it again');
    expect(screen.queryByText('Overview opened')).toBeNull();
    expect(keyInput().value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    enterKey('second-synthetic-key');
    fireEvent.click(screen.getByRole('button', { name: 'Open Overview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));
    expect(await screen.findByText('Overview opened')).toBeTruthy();
  });

  it('protects a draft and pending save from reload, then releases after success', async () => {
    const api = createApi();
    const pending = deferred<ConnectionResult<ConnectionStatus>>();
    vi.mocked(api.saveKey).mockReturnValue(pending.promise);
    render(<DataConnectionSettings api={api} />);
    await screen.findByText('No key saved');
    function blocksUnload(): boolean {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }
    expect(blocksUnload()).toBe(false);
    enterKey();
    expect(blocksUnload()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    expect(blocksUnload()).toBe(true);
    await act(async () => pending.resolve(ok(connected)));
    await waitFor(() => expect(blocksUnload()).toBe(false));
  });
});
