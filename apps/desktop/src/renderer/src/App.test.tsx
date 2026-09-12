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
    'Living Thesis records',
    'Dashboard summaries read persisted local data'
  ],
  recordCounts: {
    livingTheses: 6,
    reviewSessions: 0, thesisRevisions: 0, thesisDecisions: 0,
    mbsScoreSnapshots: 5,
    portfolioRankerItems: 4,
    reminders: 3,
    thesisNotes: 2,
    watchlistItems: 1
  },
  storageAdapter: 'node:sqlite' as const,
  userDataPath: 'C:\\Users\\Test\\AppData\\Roaming\\Thesis Investing'
};

const zeroLocalDataInfo = {
  ...localDataInfo,
  databaseFileExists: false,
  recordCounts: {
    livingTheses: 0,
    reviewSessions: 0, thesisRevisions: 0, thesisDecisions: 0,
    mbsScoreSnapshots: 0,
    portfolioRankerItems: 0,
    reminders: 0,
    thesisNotes: 0,
    watchlistItems: 0
  }
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

    expect(html).toContain('Local data management');
    expect(html).toContain(
      'Your saved Thesis Investing records are stored locally on this computer'
    );
    expect(html).toContain('Watchlist');
    expect(html).toContain('Thesis Notes');
    expect(html).toContain('Reminders');
    expect(html).toContain('Portfolio Ranker Inputs');
    expect(html).toContain('MBS Score Snapshots');
    expect(html).toContain('Living Thesis records');
    expect(html).toContain('Dashboard summaries read persisted local data');
    expect(html).toContain('Theme Library uses included reference content');
    expect(html).toContain('In-progress form drafts unless explicitly saved');
    expect(html).toContain('Onboarding preference is saved locally');
    expect(html).toContain('thesis-investing.sqlite');
    expect(html).toContain('Created on this device');
    expect(html).toContain('node:sqlite');
    expect(html).toContain('Refresh status');
    expect(html).toContain('Copy app data folder path');
    expect(html).toContain('Copy SQLite database path');
    expect(html).toContain('Open data folder');
    expect(html).toContain('Persisted record counts');
    expect(html).toContain('Watchlist items');
    expect(html).toContain('Portfolio Ranker Inputs');
    expect(html).toContain(
      'Living Thesis counts include active and archived records.'
    );
    expect(html).toContain('Export local data');
    expect(html).toContain('Create a JSON backup of persisted local records');
    expect(html).toContain('Import local data');
    expect(html).toContain('Choose a JSON backup created by Thesis Investing');
    expect(html).toContain('no records are written during preview');
    expect(html).toContain('never overwrite or delete existing local data');
    expect(html).toContain('Backup guidance');
    expect(html).toContain('does not upload them or provide cloud backup');
    expect(html).toContain('another computer or local profile');
    expect(html).toContain('Local data troubleshooting');
    expect(html).toContain('Avoid manually editing the database file');
  });

  it('renders zero local record counts clearly', () => {
    const html = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataInfo={zeroLocalDataInfo}
        onResetOnboarding={() => undefined}
      />
    );

    expect(html).toContain('Not created yet');
    expect(html).toContain('Persisted record counts');
    expect(html).toContain('<dd>0</dd>');
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
    expect(html).toContain('Local-only items');
  });

  it('renders a local data export success state', () => {
    const html = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataExportState={{
          status: 'completed',
          outcome: {
            status: 'completed',
            counts: {
              livingTheses: 2,
              reviewSessions: 0, thesisRevisions: 0, thesisDecisions: 0,
              mbsScoreSnapshots: 1,
              portfolioRankerItems: 1,
              reminders: 1,
              thesisNotes: 1,
              watchlistItems: 1
            },
            exportedAt: '2026-06-10T12:00:00.000Z',
            filePath: 'C:\\Users\\Test\\Documents\\thesis-export.json'
          }
        }}
        initialLocalDataInfo={localDataInfo}
        onResetOnboarding={() => undefined}
      />
    );

    expect(html).toContain('Backup JSON saved.');
    expect(html).toContain('thesis-export.json');
    expect(html).toContain(
      'Your records in Thesis Investing were not changed.'
    );
    expect(html).toContain('Exported 1 watchlist items');
    expect(html).toContain('2 Living Theses (including risks and catalysts)');
  });

  it('renders local data maintenance success states', () => {
    const refreshedHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataInfo={localDataInfo}
        initialLocalDataMaintenanceState={{
          generatedAt: '2026-06-10T12:30:00.000Z',
          status: 'refreshed'
        }}
        onResetOnboarding={() => undefined}
      />
    );
    const copiedHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataInfo={localDataInfo}
        initialLocalDataMaintenanceState={{
          label: 'App data folder path',
          status: 'copied'
        }}
        onResetOnboarding={() => undefined}
      />
    );
    const folderOpenedHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataInfo={localDataInfo}
        initialLocalDataMaintenanceState={{
          folderPath: 'C:\\Users\\Test\\AppData\\Roaming\\Thesis Investing',
          status: 'folder-opened'
        }}
        onResetOnboarding={() => undefined}
      />
    );

    expect(refreshedHtml).toContain('Status refreshed');
    expect(copiedHtml).toContain('App data folder path copied.');
    expect(folderOpenedHtml).toContain('Opened local data folder');
  });

  it('renders local data maintenance error states without crashing', () => {
    const html = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataInfo={localDataInfo}
        initialLocalDataMaintenanceState={{
          status: 'error',
          errors: ['Clipboard access is unavailable in this window.']
        }}
        onResetOnboarding={() => undefined}
      />
    );

    expect(html).toContain('Local data maintenance action failed.');
    expect(html).toContain('Clipboard access is unavailable in this window.');
  });

  it('renders local data export cancel and error states without crashing', () => {
    const canceledHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataExportState={{ status: 'canceled' }}
        initialLocalDataInfo={localDataInfo}
        onResetOnboarding={() => undefined}
      />
    );
    const errorHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataExportState={{
          status: 'error',
          errors: ['Unable to write export file.']
        }}
        initialLocalDataInfo={localDataInfo}
        onResetOnboarding={() => undefined}
      />
    );

    expect(canceledHtml).toContain(
      'Export canceled. Nothing was changed and no backup file was created.'
    );
    expect(errorHtml).toContain('Unable to export local data.');
    expect(errorHtml).toContain(
      'The backup file could not be saved. Choose another location and try again.'
    );
    expect(errorHtml).toContain('Unable to write export file.');
  });

  it('renders an import preview that requires separate confirmation', () => {
    const html = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataImportState={{
          status: 'preview',
          preview: {
            counts: {
              livingTheses: 6,
              reviewSessions: 2, thesisRevisions: 0, thesisDecisions: 0,
              mbsScoreSnapshots: 5,
              portfolioRankerItems: 4,
              reminders: 3,
              thesisNotes: 2,
              watchlistItems: 1
            },
            exportedAt: '2026-06-10T12:00:00.000Z',
            fileName: 'thesis-export.json',
            formatVersion: 2,
            previewId: 'preview-test',
            warnings: [
              '1 imported record ID already exists and will be remapped.'
            ]
          }
        }}
        initialLocalDataInfo={localDataInfo}
        onResetOnboarding={() => undefined}
      />
    );

    expect(html).toContain(
      'Import preview ready. No records have been written.'
    );
    expect(html).toContain('thesis-export.json');
    expect(html).toContain('Watchlist items');
    expect(html).toContain('MBS Score Snapshots');
    expect(html).toContain('<dt>Living Theses</dt><dd>6</dd>');
    expect(html).toContain('<dt>Saved review sessions</dt><dd>2</dd>');
    expect(html).toContain('Confirm import');
    expect(html).toContain('Cancel import');
    expect(html).toContain('Existing records will not be overwritten');
  });

  it('renders import success, cancel, and error states without crashing', () => {
    const successHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataImportState={{
          status: 'completed',
          outcome: {
            status: 'completed',
            imported: {
              livingTheses: 2,
              reviewSessions: 0, thesisRevisions: 0, thesisDecisions: 0,
              mbsScoreSnapshots: 1,
              portfolioRankerItems: 1,
              reminders: 1,
              thesisNotes: 1,
              watchlistItems: 1
            },
            warnings: []
          }
        }}
        initialLocalDataInfo={localDataInfo}
        onResetOnboarding={() => undefined}
      />
    );
    const canceledHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataImportState={{ status: 'canceled' }}
        initialLocalDataInfo={localDataInfo}
        onResetOnboarding={() => undefined}
      />
    );
    const errorHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataImportState={{
          status: 'error',
          errors: ['The selected file is not valid JSON.']
        }}
        initialLocalDataInfo={localDataInfo}
        onResetOnboarding={() => undefined}
      />
    );

    expect(successHtml).toContain('Backup import complete.');
    expect(successHtml).toContain('Existing records were not overwritten.');
    expect(successHtml).toContain('Imported 1 watchlist items');
    expect(canceledHtml).toContain(
      'Import canceled. No records were added or changed.'
    );
    expect(errorHtml).toContain('Unable to import local data.');
    expect(errorHtml).toContain(
      'Choose a JSON backup created by Thesis Investing and try again.'
    );
    expect(errorHtml).toContain('The selected file is not valid JSON.');
  });
});
