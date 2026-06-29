# Local Data Export

Phase 2, Stage 2 adds a safe local JSON export from Settings/About.

The export is non-destructive. It reads persisted local records through the
Electron main/storage layer, asks the user where to save a `.json` file, and
writes a structured copy for recordkeeping. It does not import, restore, reset,
delete, or modify local records.

## Included Data

The export includes user-entered persisted records from:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots

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
- selected route, filters, search, sort, selected rows, or form drafts
- app logs, temp files, build artifacts, `node_modules`, or Git data
- credentials, secrets, tokens, or API keys
- the raw SQLite database file
- the Electron profile folder

## JSON Shape

```json
{
  "format": "thesis-investing-local-data-export",
  "formatVersion": 1,
  "appName": "Thesis Investing",
  "appVersion": "0.0.0",
  "exportedAt": "2026-06-10T12:00:00.000Z",
  "storageAdapter": "node:sqlite",
  "counts": {
    "watchlistItems": 0,
    "thesisNotes": 0,
    "reminders": 0,
    "portfolioRankerItems": 0,
    "mbsScoreSnapshots": 0
  },
  "data": {
    "watchlistItems": [],
    "thesisNotes": [],
    "reminders": [],
    "portfolioRankerItems": [],
    "mbsScoreSnapshots": []
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

## Current Limitations

Phase 2, Stage 3 can append records from valid version 1 export files after a
preview and explicit confirmation. Import is not a destructive restore or merge:
it does not replace the database, overwrite records, or delete existing data.
See [Local Data Import](LOCAL_DATA_IMPORT.md) for validation and collision rules.

Users should treat exported files as private research data and store them in a
location they trust.

Thesis Investing remains educational software only. The export does not add live
stock APIs, AI analyst behavior, brokerage or trading execution, cloud sync, or
personalized financial advice.
