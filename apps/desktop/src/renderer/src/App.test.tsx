import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App, SettingsAboutScreen } from './App';

const localDataInfo = {
  databaseFileExists: true,
  databasePath:
    'C:\\Users\\Test\\AppData\\Roaming\\Thesis Investing\\thesis-investing.sqlite',
  generatedAt: '2026-06-10T12:00:00.000Z',
  localOnlyItems: [
    'Theme Baskets are static local content',
    'Selected route, filters, search, and sort controls',
    'In-progress form drafts unless explicitly saved',
    'Onboarding completion currently uses localStorage'
  ],
  persistedWorkflows: [
    'Watchlist',
    'Thesis Notes',
    'Reminders',
    'Portfolio Ranker Inputs',
    'MBS Score Snapshots',
    'Dashboard summaries read persisted local data'
  ],
  storageAdapter: 'node:sqlite' as const,
  userDataPath: 'C:\\Users\\Test\\AppData\\Roaming\\Thesis Investing'
};

describe('App onboarding', () => {
  it('renders first-run onboarding before the app shell by default', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('Thesis Investing');
    expect(html).toContain('Build a repeatable thesis workflow.');
    expect(html).toContain('Continue');
  });
});

describe('SettingsAboutScreen', () => {
  it('renders the local data management status section', () => {
    const html = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataInfo={localDataInfo}
        onResetOnboarding={() => undefined}
      />
    );

    expect(html).toContain('Local data status');
    expect(html).toContain('Phase 2 starts with visibility into local data.');
    expect(html).toContain('Watchlist');
    expect(html).toContain('Thesis Notes');
    expect(html).toContain('Reminders');
    expect(html).toContain('Portfolio Ranker Inputs');
    expect(html).toContain('MBS Score Snapshots');
    expect(html).toContain('Dashboard summaries read persisted local data');
    expect(html).toContain('Theme Baskets are static local content');
    expect(html).toContain('In-progress form drafts unless explicitly saved');
    expect(html).toContain('Onboarding completion currently uses localStorage');
    expect(html).toContain('thesis-investing.sqlite');
    expect(html).toContain('Created on this device');
    expect(html).toContain('node:sqlite');
  });

  it('renders a non-crashing local data status error', () => {
    const html = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataErrors={['Unable to read app data path.']}
        onResetOnboarding={() => undefined}
      />
    );

    expect(html).toContain('Unable to load local data status.');
    expect(html).toContain('Unable to read app data path.');
    expect(html).toContain('Persisted locally');
    expect(html).toContain('Still transient or static');
  });
});
