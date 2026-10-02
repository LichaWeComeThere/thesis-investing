// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataConnectionApi } from '../../shared/companyDetails';
import { App } from './App';
import { markOnboardingCompleted } from './onboardingState';

const status = { provider: 'alpha-vantage' as const, configured: false, secureStorageAvailable: true, adapterAvailable: true };
let api: DataConnectionApi;
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(() => {
  localStorage.clear(); markOnboardingCompleted();
  api = {
    status: vi.fn(async () => ({ ok: true as const, value: status })),
    saveKey: vi.fn(async () => ({ ok: true as const, value: { ...status, configured: true } })),
    remove: vi.fn(async () => ({ ok: true as const, value: status }))
  };
  vi.stubGlobal('thesisInvesting', { dataConnection: api });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function enterDraft() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  const input = screen.getByLabelText('Alpha Vantage API key') as HTMLInputElement;
  await waitFor(() => expect(input.disabled).toBe(false));
  fireEvent.change(input, { target: { value: 'synthetic-key-only' } });
  return input;
}
describe('connection draft navigation through the app shell', () => {
  it('protects a key when leaving Settings and saves before completing navigation', async () => {
    const input = await enterDraft();
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(await screen.findByRole('dialog', { name: 'Unsaved connection changes' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));
    expect(input.value).toBe('synthetic-key-only');
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));
    await screen.findByRole('main', { name: 'Overview' });
    expect(api.saveKey).toHaveBeenCalledTimes(1);
    expect(api.saveKey).toHaveBeenCalledWith('synthetic-key-only');
  });
  it('protects a key when returning to the welcome screen', async () => {
    await enterDraft();
    fireEvent.click(screen.getByRole('button', { name: 'Reset onboarding' }));
    expect(await screen.findByRole('dialog', { name: 'Unsaved connection changes' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Discard edits and leave' }));
    await screen.findByRole('button', { name: 'Open my workspace' });
    expect(api.saveKey).not.toHaveBeenCalled();
  });
});
