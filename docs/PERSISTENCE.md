# Persistence

Phase 1, Stage 4 adds the first local-only persistence boundary for the Offline Windows MVP.

The goal is to give future desktop workflows a repository layer for offline data without wiring any real product screens yet. Persistence is intentionally isolated from the visible app shell.

## Package Boundary

Local persistence currently lives in `apps/desktop/src/storage`.

- The storage module depends on `packages/core` domain types and validators.
- `packages/core` does not depend on storage, SQLite, Electron, React, or Node APIs.
- UI code should depend on repository interfaces instead of raw SQLite details when persistence is wired into future screens.
- The current desktop app remains placeholder-only and does not read or write user data yet.

## SQLite Choice

This stage uses Node's built-in `node:sqlite` module for the first SQLite adapter.

This keeps the adapter dependency-free for the early Windows-first repo foundation and avoids adding native third-party SQLite bindings before packaging decisions are clearer. The module is still experimental in Node, so Electron runtime compatibility should be confirmed before wiring persistence into visible app workflows.

The current adapter can create an in-memory database for tests or open a filename-backed SQLite database. Future Electron desktop work can decide the final user-data path, backup approach, and runtime packaging details.

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

This stage does not add:

- Visible product workflows
- SQLite wiring into app screens
- Live stock APIs
- Cloud sync, Supabase, or auth
- AI analyst features
- Brokerage integrations or trading execution
- Personalized financial advice

Thesis Investing remains educational software only.
