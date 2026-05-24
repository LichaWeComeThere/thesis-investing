# Persistence

Phase 1, Stage 4 added the first local-only persistence boundary for the Offline Windows MVP.

The goal is to give desktop workflows a repository layer for offline data while keeping database access isolated from React renderer code.

Phase 1, Stage 18 wires the Watchlist screen as the first visible persisted workflow. Phase 1, Stage 19 adds Thesis Notes persistence. Other visible MVP workflows remain React-state-only until their own stages.

## Package Boundary

Local persistence currently lives in `apps/desktop/src/storage`.

- The storage module depends on `packages/core` domain types and validators.
- `packages/core` does not depend on storage, SQLite, Electron, React, or Node APIs.
- UI code should depend on narrow preload/IPC clients instead of raw SQLite details when persistence is wired into screens.
- The Watchlist and Thesis Monitor screens read and write through the local persistence boundary. Other screens are not persisted yet.

## SQLite Choice

This stage uses Node's built-in `node:sqlite` module for the first SQLite adapter.

This keeps the adapter dependency-free for the early Windows-first repo foundation and avoids adding native third-party SQLite bindings before packaging decisions are clearer. The module is still experimental in Node, so Electron runtime compatibility should be confirmed before wiring persistence into visible app workflows.

The current adapter can create an in-memory database for tests or open a filename-backed SQLite database. Future Electron desktop work can decide the final user-data path, backup approach, and runtime packaging details.

## Adapter Boundary

`node:sqlite` is currently used only as the first local SQLite adapter. It is experimental, and support inside the target Electron runtime must be verified before storage is wired into user-visible workflows.

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

The domain tables include local created/updated date columns where appropriate, but repositories do not generate timestamps as side effects. Dates are accepted as inputs from future application workflows.

## Repositories

The storage module defines repository interfaces for:

- holdings
- watchlist items
- thesis notes
- reminders

Repository implementations validate core domain data before writing to SQLite and normalize ticker symbols consistently with `packages/core`.

## Out Of Scope

This persistence layer does not add:

- Persistence for Reminders, Portfolio Ranker, MBS Scorer, or Dashboard
- Live dashboard summaries from persisted data
- Live stock APIs
- Cloud sync, Supabase, or auth
- AI analyst features
- Brokerage integrations or trading execution
- Personalized financial advice

Thesis Investing remains educational software only.
