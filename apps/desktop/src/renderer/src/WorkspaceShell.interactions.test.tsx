// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalDataInfo, LocalDataStorageResult } from '../../shared/localDataStorage';
import { App, SettingsAboutScreen } from './App';
import type { LocalDataStorageClient } from './localDataStorageClient';
import { markOnboardingCompleted } from './onboardingState';

const localDataInfo: LocalDataInfo = {
  databaseFileExists: true,
  databasePath: '/example/thesis-investing.sqlite',
  generatedAt: '2026-09-26T18:00:00.000Z',
  localOnlyItems: [],
  persistedWorkflows: ['Watchlist'],
  recordCounts: {
    livingTheses: 1,
    reviewSessions: 0,
    thesisRevisions: 0,
    thesisDecisions: 0,
    mbsScoreSnapshots: 0,
    portfolioRankerItems: 0,
    reminders: 0,
    thesisNotes: 0,
    watchlistItems: 2
  },
  storageAdapter: 'node:sqlite',
  userDataPath: '/example'
};

beforeEach(() => {
  localStorage.clear();
  markOnboardingCompleted();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Workspace shell navigation', () => {
  // jsdom verifies menu state and focus transitions. Responsive visibility and
  // native modal behavior are verified separately in the browser.
  it('focuses navigation when opening the compact menu and returns focus on Escape', () => {
    render(<App />);
    const menu = screen.getByRole('button', { name: 'Menu' });
    const navigation = screen.getByRole('complementary', { name: 'Primary navigation' });

    fireEvent.click(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(navigation.classList.contains('sidebar--open')).toBe(true);
    expect(document.activeElement).toBe(within(navigation).getByRole('button', { name: 'Overview' }));

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(navigation.classList.contains('sidebar--open')).toBe(false);
    expect(document.activeElement).toBe(menu);
  });

  it('closes the menu and focuses the current content when selecting the active view', () => {
    render(<App />);
    const menu = screen.getByRole('button', { name: 'Menu' });
    const navigation = screen.getByRole('navigation', { name: 'Research workspaces' });
    fireEvent.click(menu);
    fireEvent.click(within(navigation).getByRole('button', { name: 'Overview' }));

    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(screen.getByRole('main', { name: 'Overview' }));
    expect(within(navigation).getByRole('button', { name: 'Overview' }).getAttribute('aria-current')).toBe('page');
  });

  it('moves focus to the new workspace and exposes one matching page heading', () => {
    render(<App />);
    const menu = screen.getByRole('button', { name: 'Menu' });
    const navigation = screen.getByRole('complementary', { name: 'Primary navigation' });
    fireEvent.click(menu);
    fireEvent.click(within(navigation).getByRole('button', { name: 'Settings' }));

    const main = screen.getByRole('main', { name: 'Settings' });
    expect(document.activeElement).toBe(main);
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(within(main).getByRole('heading', { name: 'Settings', level: 1 })).toBeTruthy();
    expect(within(navigation).getByRole('button', { name: 'Settings' }).getAttribute('aria-current')).toBe('page');
    expect(within(navigation).getByRole('button', { name: 'Overview' }).hasAttribute('aria-current')).toBe(false);
  });
});

describe('Settings backup and storage hierarchy', () => {
  it('keeps backup actions before collapsed technical details', () => {
    render(<SettingsAboutScreen initialLocalDataInfo={localDataInfo} localDataClient={null} onResetOnboarding={() => undefined} />);
    const summary = screen.getByText('Storage details and troubleshooting');
    const details = summary.closest('details')!;
    const exportButton = screen.getByRole('button', { name: 'Export local data' });
    const importButton = screen.getByRole('button', { name: 'Import local data' });

    expect(details.open).toBe(false);
    expect(exportButton.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(importButton.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(details.contains(exportButton)).toBe(false);
    expect(details.contains(importButton)).toBe(false);
  });

  it('keeps error details open throughout refresh and successful recovery', async () => {
    let resolveStatus!: (result: LocalDataStorageResult<LocalDataInfo>) => void;
    const get = vi.fn<LocalDataStorageClient['get']>(() => new Promise((resolve) => { resolveStatus = resolve; }));
    const unavailable = async () => ({ ok: false as const, errors: ['Unused operation.'] });
    const client: LocalDataStorageClient = {
      get,
      exportToJson: unavailable,
      importFromJson: unavailable,
      openDataFolder: unavailable,
      previewImportFromJson: unavailable
    };
    render(<SettingsAboutScreen initialLocalDataInfo={localDataInfo} initialLocalDataErrors={['Temporary storage error.']} localDataClient={client} onResetOnboarding={() => undefined} />);
    const details = screen.getByText('Storage details and troubleshooting').closest('details')!;
    expect(details.open).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('Temporary storage error.');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(details.open).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByRole('button', { name: 'Refreshing status' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Loading local data status.')).toBeTruthy();

    await act(async () => { resolveStatus({ ok: true, value: localDataInfo }); });
    expect(details.open).toBe(true);
    expect(screen.getByText(/Status refreshed/).closest('[role="status"]')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Refresh status' }) as HTMLButtonElement).disabled).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
