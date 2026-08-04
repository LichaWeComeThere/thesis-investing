# Phase 2 Closeout

Phase 2 completes the local data foundation for Thesis Investing. The goal was
to make saved local data visible, portable, importable, and easier to
troubleshoot while preserving the offline, educational, non-advisory product
boundary.

Phase 2 is complete as of the Stage 6 closeout QA pass on 2026-08-04.

## Phase 2 Purpose

Phase 2 focused on the local data lifecycle:

- show users where local data lives
- export persisted local records to a JSON backup
- import supported Thesis Investing export files safely
- clarify backup and import behavior
- provide read-only maintenance tools
- validate the full lifecycle before Phase 3 begins

It did not add live data, cloud sync, authentication, AI analyst behavior,
brokerage connections, trading execution, or personalized financial advice.

## Completed Stages

- Stage 1: Local Data Management View
- Stage 2: Local Data Export
- Stage 3: Local Data Import
- Stage 4: Local Data Safety / Backup Hardening
- Stage 5: Local Data Maintenance Tools
- Stage 6: Phase 2 Closeout QA

## Official Persisted Workflows

These user-entered workflows are persisted locally through SQLite:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots

The Dashboard reads persisted local summary counts and latest MBS score
metadata. Settings/About reads local data status and record counts. Both are
read-only summary views.

Theme Baskets remain bundled static educational content. Thesis Board is present
on `main` as an early renderer-only prototype that uses mock/in-memory data and
is visibly labeled as unsaved. It is not yet integrated with the future Living
Thesis model or persistence.

## Local Data Management

Settings/About shows:

- app data folder path
- SQLite database path
- database availability
- storage adapter
- persisted workflows
- persisted record counts
- local-only and transient items
- backup guidance
- troubleshooting guidance

Maintenance tools are read-only:

- Refresh status
- Copy app data folder path
- Copy SQLite database path
- Open data folder

The open-folder action accepts no path from the renderer. Electron main opens
only the trusted app data folder from `app.getPath('userData')`.

## Export Behavior

Export creates a user-selected JSON backup containing:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots
- format metadata
- app metadata
- exported timestamp
- storage adapter label
- record counts

Export does not mutate SQLite data. It does not include Theme Baskets, Thesis
Board mock data, onboarding localStorage, transient UI state, logs, build
artifacts, Git data, credentials, secrets, tokens, API keys, the raw SQLite
file, or the Electron profile folder.

## Import Behavior

Import accepts version 1 Thesis Investing local data export JSON files only.

The flow is preview-first:

1. User selects a JSON file.
2. Electron main reads, parses, and validates the file.
3. Settings/About shows counts, metadata, and warnings.
4. No records are written during preview.
5. User must choose Confirm import before records are appended.

Import is append-only and non-destructive. Existing records are not overwritten
or deleted. ID collisions receive deterministic `-import-N` suffixes, and
Thesis Note references from Watchlist items and MBS Score Snapshots are remapped
with their imported Thesis Notes.

## Architecture Boundaries

- SQLite access remains in Electron main/storage.
- React renderer code does not import `node:sqlite`.
- React renderer code does not import Node filesystem modules.
- Renderer screens use narrow preload APIs under `window.thesisInvesting`.
- Import/export file dialogs, file reads, file writes, parsing, validation, and
  SQLite writes remain in Electron main.
- Dashboard and Local Data Management summary reads are read-only.
- Context isolation remains enabled through the existing preload boundary.

Legitimate `node:sqlite` references are limited to the storage adapter,
runtime verification, shared storage-adapter labels, docs, and tests.
Legitimate filesystem and `shell.openPath` usage is limited to Electron main
local data services and IPC wiring.

## Safety Boundaries

Phase 2 does not include:

- delete-all-data
- database reset
- destructive restore
- overwrite import
- automatic deduplication
- database repair, vacuum, or SQL console
- raw SQLite import
- automatic backup scheduler
- cloud backup or cloud sync
- authentication
- live stock APIs
- AI analyst features or AI-generated investment recommendations
- brokerage connections
- trading execution
- buy/sell/hold recommendations
- personalized financial advice

Thesis Investing remains educational software only.

## Automated Validation Results

Validation run on 2026-08-04 from `codex/phase-2-stage-6-closeout-qa`:

- `pnpm.cmd install --frozen-lockfile`: passed
- `pnpm.cmd lint`: passed
- `pnpm.cmd typecheck`: passed
- `pnpm.cmd test`: passed, 177 tests
- `pnpm.cmd build`: passed
- `pnpm.cmd package:windows`: passed
- `pnpm.cmd verify:storage`: passed

Local Windows packaging produced:

```text
apps/desktop/release/windows/win-arm64-unpacked
```

On GitHub Windows x64 runners, the expected unpacked package path remains:

```text
apps/desktop/release/windows/win-unpacked
```

## Manual QA Results

Live app smoke testing confirmed:

- App opens as Thesis Investing.
- Sidebar loads.
- Dashboard opens.
- MBS Scorer opens.
- Portfolio Ranker opens.
- Thesis Monitor opens.
- Watchlist opens.
- Theme Baskets opens.
- Reminders opens.
- Thesis Board opens.
- Settings/About opens.
- No startup crash or blank route was observed.
- Safety note is visible.
- Thesis Board prototype/unsaved notice is visible.
- Local Data Management is visible.
- Refresh status works.
- Export and import actions remain visible.
- Backup and troubleshooting guidance remain visible.
- Dashboard summaries load.

Write-heavy lifecycle QA was performed against disposable SQLite files through
the same main-process storage services used by the app. This avoided modifying
real user records while covering the local data lifecycle.

## Persistence Lifecycle Results

The disposable SQLite QA pass confirmed:

- one Watchlist item can be created, read after service restart, updated, and
  deleted/re-added through the supported workflow API
- one Thesis Note can be created, read after service restart, and updated
- one Reminder can be created, read after service restart, updated, and
  deleted/re-added
- one Portfolio Ranker Input can be created, read after service restart,
  updated, and deleted/re-added
- one MBS Score Snapshot can be created and read after service restart
- Dashboard summary counts reflect persisted records
- Settings/About local data record counts reflect persisted records

MBS Score Snapshot delete/update behavior remains out of scope because that
workflow currently supports save/list only.

## Export And Import QA Results

Export QA confirmed:

- cancel path returns cleanly
- empty export produces valid Thesis Investing JSON
- populated export produces valid Thesis Investing JSON
- metadata and counts match persisted records
- export does not mutate SQLite data
- export excludes credentials, secrets, Git data, logs, build output, Theme
  Baskets, and Thesis Board mock data

Import QA confirmed:

- cancel path returns cleanly
- invalid JSON fails safely
- wrong application format fails safely
- unsupported format version fails safely
- missing or malformed arrays fail safely
- preview shows correct counts
- preview does not mutate persisted counts
- confirmation is separate and explicit
- import is append-only and non-destructive
- ID collisions receive safe new IDs
- Thesis Note references are remapped for imported Watchlist items and MBS Score
  Snapshots
- imported records survive service restart
- Dashboard summaries and maintenance counts reflect imported records

## Roundtrip Results

Roundtrip QA used two disposable profiles:

- Profile A started empty, received one record in each persisted workflow, and
  exported JSON.
- Profile B started empty, previewed the Profile A export, confirmed import,
  and then showed all five record types.

The roundtrip preserved expected fields and relationships. Watchlist
`thesisNoteId` and MBS snapshot `thesisId` references remained intact on the
first import and were safely remapped during collision import testing.

## Known Limitations

- The Windows package is unsigned and unpacked; no installer, code signing, or
  auto-update flow exists yet.
- There is no cloud sync, account system, or authentication.
- There is no database reset, repair, vacuum, destructive restore, or raw SQLite
  import/export UI.
- Export is manual; there is no automatic backup scheduler.
- Import is append-only; there is no semantic merge, record-by-record selection,
  or automatic deduplication.
- First-run onboarding completion still uses renderer `localStorage`.
- Transient route, search, filter, sort, selected-row, and form-draft state is
  not persisted unless a workflow explicitly saves it.
- Theme Baskets are static bundled content.
- Thesis Board is a mock/in-memory prototype and does not persist data.
- MBS Scorer incomplete draft autosave and MBS snapshot removal remain out of
  scope.
- During closeout QA, overriding `APPDATA` did not reliably redirect Electron's
  app `userData` path in the dev launch. Write-heavy QA therefore used
  disposable SQLite files through the main storage services rather than writing
  test records through the normal app profile.

## Expected Runtime Warnings

These warnings were observed during validation and are non-blocking for Phase 2:

- pnpm reports a newer version is available; the repo remains on the pinned
  package manager version.
- Corepack/Node may emit a `url.parse()` deprecation warning during install.
- Electron emits an experimental `node:sqlite` warning during storage
  verification and dev launch.
- electron-builder may emit a child-process argument deprecation warning during
  local Windows packaging.
- Vite highlights the renderer bundle size around 515 kB; build still passes.

## Deferred Features

Deferred until explicitly staged:

- Phase 3 Living Thesis OS architecture and model work
- Thesis Board adoption of the future Living Thesis model
- review workflow, review sessions, decision log, score history, and thesis
  timeline
- local preferences in SQLite
- installer, code signing, auto-update, and release packaging hardening
- live data provider interfaces
- optional sync or cloud features
- AI or advanced intelligence features

## Readiness For Phase 3

Phase 2 is ready to close. The next phase is:

```text
Phase 3 - Living Thesis OS
```

The preserved future branches `feature/review-workflow` and
`feature/thesis-board-adopt-model` remain separate prototype/reference work and
were not modified during Phase 2 closeout.
