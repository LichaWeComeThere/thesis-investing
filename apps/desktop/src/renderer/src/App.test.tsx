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
    expect(html).toContain('This read-only view shows where local data lives');
    expect(html).toContain('Watchlist');
    expect(html).toContain('Thesis Notes');
    expect(html).toContain('Reminders');
    expect(html).toContain('Portfolio Ranker Inputs');
    expect(html).toContain('MBS Score Snapshots');
    expect(html).toContain('Dashboard summaries read persisted local data');
    expect(html).toContain('Theme Library uses included reference content');
    expect(html).toContain('In-progress form drafts unless explicitly saved');
    expect(html).toContain('Onboarding preference is saved locally');
    expect(html).toContain('thesis-investing.sqlite');
    expect(html).toContain('Created on this device');
    expect(html).toContain('node:sqlite');
    expect(html).toContain('Export local data');
    expect(html).toContain('Save a JSON copy of persisted local records');
    expect(html).toContain('Import local data');
    expect(html).toContain('Select a JSON file created by Thesis Investing');
    expect(html).toContain('never overwrite or delete existing local data');
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

    expect(html).toContain('Local data export saved.');
    expect(html).toContain('thesis-export.json');
    expect(html).toContain('Exported 1 watchlist items');
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

    expect(canceledHtml).toContain('Export canceled. No file was created.');
    expect(errorHtml).toContain('Unable to export local data.');
    expect(errorHtml).toContain('Unable to write export file.');
  });

  it('renders an import preview that requires separate confirmation', () => {
    const html = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataImportState={{
          status: 'preview',
          preview: {
            counts: {
              mbsScoreSnapshots: 5,
              portfolioRankerItems: 4,
              reminders: 3,
              thesisNotes: 2,
              watchlistItems: 1
            },
            exportedAt: '2026-06-10T12:00:00.000Z',
            fileName: 'thesis-export.json',
            formatVersion: 1,
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

    expect(html).toContain('Import preview ready.');
    expect(html).toContain('thesis-export.json');
    expect(html).toContain('Watchlist items');
    expect(html).toContain('MBS Score Snapshots');
    expect(html).toContain('Confirm import');
    expect(html).toContain('Cancel import');
    expect(html).toContain('Existing records remain unchanged');
  });

  it('renders import success, cancel, and error states without crashing', () => {
    const successHtml = renderToStaticMarkup(
      <SettingsAboutScreen
        initialLocalDataImportState={{
          status: 'completed',
          outcome: {
            status: 'completed',
            imported: {
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

    expect(successHtml).toContain('Local data import complete.');
    expect(successHtml).toContain('Imported 1 watchlist items');
    expect(canceledHtml).toContain(
      'Import canceled. No records were changed.'
    );
    expect(errorHtml).toContain('Unable to import local data.');
    expect(errorHtml).toContain('The selected file is not valid JSON.');
  });
});
