# Persistence

Phase 1, Stage 4 added the first local-only persistence boundary for the Offline Windows MVP.

The goal is to give desktop workflows a repository layer for offline data while keeping database access isolated from React renderer code.

Phase 1, Stages 18 through 23 complete the visible persistence rollout for Watchlist items, Thesis Notes, Reminders, Portfolio Ranker inputs, MBS Score Snapshots, and read-only Dashboard summary reads. Theme Baskets remain static local data, onboarding completion remains in renderer `localStorage`, and a small set of UI-only fields remain transient by design.

Phase 2, Stage 1 adds a read-only local data management/status view in Settings/About. It shows where the app data folder and SQLite database live, whether the local database file exists, which workflows are persisted, and which data remains transient or static.

Phase 2, Stage 2 adds a non-destructive local JSON export action in Settings/About. The export writes a user-selected `.json` file containing persisted Watchlist items, Thesis Notes, Reminders, Portfolio Ranker Inputs, and MBS Score Snapshots, plus metadata and counts. It does not add import, restore, reset/delete database actions, backup scheduling, cloud sync, or raw SQLite export.

## Package Boundary

Local persistence currently lives in `apps/desktop/src/storage`.

- The storage module depends on `packages/core` domain types and validators.
- `packages/core` does not depend on storage, SQLite, Electron, React, or Node APIs.
- UI code should depend on narrow preload/IPC clients instead of raw SQLite details when persistence is wired into screens.
- The Watchlist, Thesis Monitor, Reminders, Portfolio Ranker, and MBS Scorer screens read and write through the local persistence boundary.
- The Dashboard reads local persisted summaries through the same main/preload/renderer boundary, but it does not write or delete records.
- The Settings/About local data status view reads app data path and database file status through a read-only main/preload/renderer boundary, and the local JSON export action reads persisted records through the same Electron main/storage boundary.
- The renderer can request a local JSON export through `window.thesisInvesting.localData.exportToJson()`, but the save dialog, SQLite reads, and file write happen in the Electron main process.

## SQLite Choice

The current adapter uses Node's built-in `node:sqlite` module.

This keeps the adapter dependency-free for the early Windows-first repo foundation and avoids adding native third-party SQLite bindings before packaging decisions are clearer. The module is still experimental in Node, so Electron runtime compatibility should be verified with `pnpm verify:storage` before release-facing changes.

The current adapter can create an in-memory database for tests or open a filename-backed SQLite database. Future Electron desktop work can decide the final user-data path, backup approach, and runtime packaging details.

## Adapter Boundary

`node:sqlite` is currently used only as the first local SQLite adapter. It is experimental, and support inside the target Electron runtime is verified through `pnpm verify:storage`.

The repository interfaces are intentionally the stable boundary. Future work can swap this SQLite adapter for another implementation if packaging, runtime support, or performance requirements make that the better choice.

For the Stage 17 Electron runtime check, see the [storage runtime verification guide](STORAGE_RUNTIME_VERIFICATION.md).

For the staged plan to wire this boundary into visible screens, see the [persistence wiring plan](PERSISTENCE_WIRING_PLAN.md).

## Schema And Migrations

Migrations are defined in `apps/desktop/src/storage/schema.ts`.

The initial schema creates:

- `holdings`
- `watchlist_items`
- `thesis_notes`
- `reminders`
- `schema_migrations`

Migration v2 (Phase 1 Stage 21) adds:

- `portfolio_ranker_items`

Migration v3 (Phase 1 Stage 22) adds:

- `mbs_score_snapshots`

The domain tables include local created/updated date columns where appropriate, but repositories do not generate timestamps as side effects. Dates are accepted as inputs from future application workflows.

## Repositories

The storage module defines repository interfaces for:

- holdings
- watchlist items
- thesis notes
- reminders
- portfolio ranker items
- MBS score snapshots

Repository implementations validate core domain data before writing to SQLite and normalize ticker symbols consistently with `packages/core`.

## Out Of Scope

This persistence layer does not add:

- Incomplete MBS Scorer draft autosave
- Live market data or external dashboard summaries
- Dashboard write/delete behavior
- Named portfolio ranker snapshots or history
- Local data delete/reset actions
- Import, restore, backup scheduling, or raw database export flows
- SQLite-backed local preferences
- Live stock APIs
- Cloud sync, Supabase, or auth
- AI analyst features
- Brokerage integrations or trading execution
- Personalized financial advice

Thesis Investing remains educational software only.
