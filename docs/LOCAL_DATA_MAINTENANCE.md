# Local Data Maintenance

Phase 2, Stage 5 adds safe local data maintenance tools in Settings/About.

These tools help users inspect, locate, refresh, and troubleshoot local data.
They are read-only and non-destructive. They do not edit workflow records,
replace the database, reset data, repair SQLite, or create automatic backups.

## Available Tools

Open **Settings/About** and find **Local data management**.

The maintenance area includes:

- **Refresh status**: reloads the app data folder path, SQLite database path,
  database file status, storage adapter, persisted workflow list, and record
  counts.
- **Copy app data folder path**: copies the known Thesis Investing app-data
  folder path to the clipboard.
- **Copy SQLite database path**: copies the known Thesis Investing SQLite
  database path to the clipboard.
- **Open data folder**: asks Electron main to open the trusted Thesis Investing
  app-data folder.

The renderer never sends an arbitrary path for the folder-opening action.
Electron main resolves the app-data folder from `app.getPath('userData')` and
opens only that location.

## Persisted Record Counts

The status view shows counts for persisted local records:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots

Counts are read through the same Electron main/storage boundary used by export
and Dashboard summaries. If the SQLite database file does not exist yet, the
status view reports zero counts without creating a database just to inspect it.

These counts exclude static or transient content:

- Theme Library / Theme Baskets
- selected route, filters, search, sort, and other UI state
- in-progress form drafts unless explicitly saved
- onboarding completion in localStorage
- Thesis Board prototype mock data

## Troubleshooting Guidance

Use **Refresh status** if the local data status, counts, or database file state
look stale. Restarting the app can also clear temporary display issues.

Use **Export local data** before moving computers, reinstalling Windows, or
changing local profiles. Export creates a portable JSON backup of persisted
records. Use **Import local data** on another computer or local profile to
preview and append supported Thesis Investing export files.

Support usually needs export metadata, counts, or screenshots of the local data
status view. Avoid sharing the raw SQLite database unless explicitly necessary,
and avoid manually editing the database file.

## Privacy And Boundaries

Local data stays on this computer unless the user chooses to export a JSON file.
Thesis Investing does not upload the local database or export files.

For the Phase 2 maintenance and local data lifecycle QA record, see
[Phase 2 Closeout](PHASE_2_CLOSEOUT.md).

This stage does not add:

- delete-all-data or database reset
- destructive restore or overwrite import
- database vacuum, repair, or SQL console tools
- raw SQLite import or raw SQLite export
- automatic backup scheduling
- cloud backup or sync
- authentication
- live stock APIs
- AI analyst behavior
- brokerage connections or trading execution
- buy/sell/hold recommendations
- personalized financial advice

Thesis Investing remains educational software only.
