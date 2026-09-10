# Local Data Export

Phase 2, Stage 2 adds a safe local JSON export from Settings/About.

New backups use format version 3. They include Living Theses with structured
risks and catalysts, plus saved review sessions. The importer also accepts the
original version 1 and version 2 formats.

The export is non-destructive. It reads persisted local records through the
Electron main/storage layer, asks the user where to save a `.json` file, and
writes a structured copy for recordkeeping. It does not import, restore, reset,
delete, or modify local records.

## Export A Backup

1. Open **Settings/About** and find **Local data management**.
2. Select **Export local data**.
3. Choose a trusted location and file name for the `.json` backup.
4. After the success message appears, confirm the saved path and record counts.

Exporting copies the records listed below. It does not move, overwrite, or
delete the records stored by Thesis Investing on this computer. Keep the JSON
file somewhere you trust and protect it as you would other private research
notes. Thesis Investing does not upload the backup or provide cloud backup.

## Included Data

The export includes user-entered persisted records from:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots
- Living Theses, including archived records, saved versions, timestamps,
  review scheduling, and nested risks and catalysts
- Saved review sessions, including in-progress and abandoned reviews, original
  thesis baselines, proposed edits, notes, step progress, and partial score inputs

`livingTheses` counts parent thesis records; each record carries its complete
`risks` and `catalysts` arrays. `reviewSessions` counts saved session records,
including abandoned sessions. Export reads all seven record types in one SQLite
transaction so the backup represents a consistent saved state.

Review-session storage is implemented, but review controls are not yet exposed
in the app. Only explicitly saved sessions are included; exporting does not
automatically capture unsaved Board forms or other transient edits. See
[Review Session Storage](LIVING_THESIS_REVIEW_SESSION_STORAGE.md).

The export also includes metadata:

- export format name
- export format version
- app name
- app version, when available
- exported timestamp
- storage adapter label
- counts by record type

## Excluded Data

The export does not include:

- Theme Baskets, because they are static bundled educational content
- onboarding completion from renderer `localStorage`
- selected route, filters, search, sort, selected rows, or unsaved form drafts
- app logs, temp files, build artifacts, `node_modules`, or Git data
- credentials, secrets, tokens, or API keys
- the raw SQLite database file
- the Electron profile folder

## JSON Shape

```json
{
  "format": "thesis-investing-local-data-export",
  "formatVersion": 3,
  "appName": "Thesis Investing",
  "appVersion": "0.0.0",
  "exportedAt": "2026-09-10T12:00:00.000Z",
  "storageAdapter": "node:sqlite",
  "counts": {
    "watchlistItems": 0,
    "thesisNotes": 0,
    "reminders": 0,
    "portfolioRankerItems": 0,
    "mbsScoreSnapshots": 0,
    "livingTheses": 0,
    "reviewSessions": 0
  },
  "data": {
    "watchlistItems": [],
    "thesisNotes": [],
    "reminders": [],
    "portfolioRankerItems": [],
    "mbsScoreSnapshots": [],
    "livingTheses": [],
    "reviewSessions": []
  }
}
```

## Architecture

React renderer code calls the narrow preload API:

```ts
window.thesisInvesting.localData.exportToJson()
```

The renderer does not import SQLite, `node:sqlite`, filesystem helpers, or raw
storage repositories. Electron main owns the save dialog, SQLite reads, export
document creation, and file write.

Canceling the save dialog returns a clean canceled result. File or storage
errors are shown in Settings/About without crashing the app.

Settings/About also includes local data maintenance tools. Users can refresh
status, view persisted record counts, copy known local data paths, and open the
trusted app data folder without changing workflow records. See
[Local Data Maintenance](LOCAL_DATA_MAINTENANCE.md).

## Current Limitations

Import accepts valid version 1, 2, and 3 export files after a preview and
explicit confirmation. Older app builds that support only version 1 or 2 cannot
read version 3 backups; update the destination app before transferring them.
Import is not a destructive restore or merge:
it does not replace the database, overwrite records, or delete existing data.
See [Local Data Import](LOCAL_DATA_IMPORT.md) for validation and collision rules.

Export is manual. This stage does not schedule backups, encrypt export files,
upload them, or manage backup retention. Export files can be used to move saved
records to another computer or local profile through the preview-first import
flow.

For the Phase 2 export/import roundtrip QA record, see
[Phase 2 Closeout](PHASE_2_CLOSEOUT.md).

Thesis Investing remains educational software only. The export does not add live
stock APIs, AI analyst behavior, brokerage or trading execution, cloud sync, or
personalized financial advice.
