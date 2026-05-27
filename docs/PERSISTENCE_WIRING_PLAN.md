# Persistence Wiring Plan

Phase 1, Stage 16 is a planning stage for safely wiring the existing local storage boundary into the visible Windows MVP screens. It intentionally does not wire SQLite into product screens yet.

Thesis Investing remains offline educational software. This plan does not add live stock APIs, AI analyst features, brokerage integrations, trading execution, Supabase/auth, cloud sync, or personalized financial advice.

## Current Storage Boundary

Local persistence currently lives in `apps/desktop/src/storage`.

The storage boundary includes:

- `repositories.ts`: stable repository interfaces for holdings, watchlist items, thesis notes, reminders, and portfolio ranker items.
- `sqlite.ts`: the first SQLite adapter and `createSqliteStorage()` entrypoint.
- `schema.ts`: migration runner and the initial schema.
- `sqliteRepositories.ts`: SQLite repository implementations that normalize tickers and validate domain data before writes.
- `runtimeVerification.ts`: in-memory repository-bound verification helper for the SQLite adapter.
- `src/main/verifyStorageRuntime.ts`: Electron main-process entry point for storage verification.
- `index.test.ts`: repository boundary, migration, validation, and CRUD coverage.

The initial schema creates:

- `holdings`
- `watchlist_items`
- `thesis_notes`
- `reminders`
- `schema_migrations`

Migration v2 (Phase 1 Stage 21) adds:

- `portfolio_ranker_items`

The adapter currently uses `node:sqlite`. This is an experimental first adapter only. Electron runtime support must be verified before this adapter is wired into user-visible workflows. The repository interfaces are intentionally designed so the adapter can be swapped later if needed.

Phase 1, Stage 17 adds that verification gate through `pnpm verify:storage`. The verification uses an in-memory database, runs in the Electron main process, and performs create/read/update/delete through the repository boundary without touching real user data.

## Current Screen State

The visible MVP screens are still mostly React-state-only:

| Screen | Current state owner | Existing storage fit |
| --- | --- | --- |
| Watchlist | Persisted through `window.thesisInvesting.watchlist`, with transient form/selected state in React | Stage 18 implemented `watchlistItems`; `thesisReference` remains UI-only text |
| Thesis Monitor | Persisted through `window.thesisInvesting.thesisNotes`, with transient form/selected state in React | Stage 19 implemented `thesisNotes`; `checklist` remains UI-only text |
| Reminders | Persisted through `window.thesisInvesting.reminders`, with transient form/selected state in React | Stage 20 implemented `reminders`; UI `completed` maps to persisted `completedAt` |
| Portfolio Ranker | Persisted through `window.thesisInvesting.portfolioRanker`, with transient row order, filters, search, and sort UI state in React | Stage 21 implemented `portfolioRankerItems`; demo rows are display-only until persisted |
| MBS Scorer | `useState` category values and notes | No repository yet; scoring output is deterministic and can be recomputed |
| Dashboard | Static/local overview and route links | Should read summaries only after individual screens are persisted |
| Theme Baskets | Static local data | Should remain static repo data for now |
| Onboarding | `localStorage` preference | Keep as-is for now |

## Recommended Architecture

Keep persistence out of `packages/core`. Core should remain pure TypeScript domain logic and validators.

Recommended runtime boundary:

1. Electron main process owns database open/close, migration execution, and repository instances.
2. Preload exposes a narrow, typed storage API through IPC.
3. Renderer screens depend on a small storage client interface, not raw SQLite or `node:sqlite`.
4. Tests use fake storage clients for renderer behavior and real repositories for storage behavior.

This avoids importing Node SQLite details into React renderer code, preserves sandbox/context isolation, and keeps adapter replacement possible.

## Recommended Wiring Order

Do not wire all persistence in one pull request. Each future stage should ship one screen or data family, with tests and a small migration footprint.

Before visible persistence wiring starts, `pnpm verify:storage` should pass in the target Electron runtime.

### Stage 18: Persist Watchlist

Status: implemented.

Data persisted:

- ticker
- optional company name
- tags
- note

Repository:

- Use `watchlistItems`.

Notes:

- `thesisReference` is free text and is not in the core `WatchlistItem` type or schema, so it remains current-session-only.
- The renderer calls a narrow preload API; SQLite stays in the Electron main process.
- Load persisted items on screen start.
- Save creates/updates through the repository.
- Delete through the repository.
- Keep selected item ID as transient UI state.

### Stage 19: Persist Thesis Notes

Status: implemented.

Data persisted:

- title
- body
- status
- optional ticker
- optional conviction
- optional review due date

Repository:

- Use `thesisNotes`.

Notes:

- `checklist` is currently UI-only text and is not in the core `ThesisNote` type or schema, so it remains current-session-only.
- The renderer calls a narrow preload API; SQLite stays in the Electron main process.
- Preserve user-authored content exactly after validation and trimming rules already used by the form helper.
- Keep selected note ID and selected demo queue item as transient UI state.

### Stage 20: Persist Reminders

Status: implemented.

Data to persist:

- title
- reminder type
- optional ticker
- due date
- optional note
- completion state

Repository:

- Use `reminders`.

Notes:

- The repository stores `completedAt`, while the current UI stores a boolean `completed`. Marking a reminder complete stores a local ISO date in `completedAt`; reopening clears `completedAt`.
- The renderer calls a narrow preload API; SQLite stays in the Electron main process.
- Do not add OS notifications, background scheduling, earnings APIs, or calendar integration.
- Keep selected reminder ID as transient UI state.

### Stage 21: Persist Portfolio Ranker Inputs

Status: implemented.

Data persisted:

- stable row ID
- ticker (normalized to upper case through the repository)
- optional company name
- optional manual score (0 to 100)
- optional notes

Repository:

- Uses a dedicated `portfolioRankerItems` repository and migration v2 `portfolio_ranker_items` table. The existing `HoldingRepository` was intentionally not reused because `Holding` requires `shares` and represents owned positions, while ranker rows are manually scored research ideas.

Notes:

- Rows persist when a row's ticker field blurs with a non-empty ticker.
- Demo rows from `mockTheses` are shown only when storage is empty; once any row is persisted, subsequent loads show only persisted rows.
- Ranking output continues to be derived from current in-memory rows through `rankManualPortfolioItems()`. Ranking has no storage dependency.
- Row order, filters, search text, and sort toggles remain transient UI state.
- Named ranker snapshots, history, and ranker-to-thesis-note linking are intentionally out of scope for this stage.

### Stage 22: Persist MBS Scorer Drafts Or Snapshots

Data to persist:

- manual category inputs
- optional notes
- optional ticker/company link if a future screen adds it
- calculated output snapshot only if needed for audit/history

Repository:

- Add a dedicated MBS draft or score snapshot repository and migration.

Notes:

- Do not duplicate scoring logic in storage. Persist inputs and recompute with `calculateMbsScore()` unless a future audit/history requirement needs immutable output snapshots.
- Keep incomplete drafts separate from completed score snapshots.
- Do not add live fundamentals or AI scoring.

### Stage 23: Dashboard Reads Persisted Local Summaries

Data to read:

- watchlist count
- thesis note count by status
- reminder count by due/completed status
- portfolio ranker item count after Stage 21
- MBS draft/snapshot count after Stage 22

Repository:

- Read from the repositories wired in earlier stages. Add summary query helpers only if repeated renderer aggregation becomes awkward.

Notes:

- Dashboard should remain local and non-advisory.
- Do not show live prices, performance, account balances, allocation advice, or recommendations.

## What Should Remain Local-Only For Now

Do not persist these yet:

- selected sidebar route
- selected item IDs
- search text, filters, and sort toggles
- static theme basket data
- Market Pulse demo feed state
- onboarding completion storage, which can remain in `localStorage` until a preferences stage
- free-text `thesisReference` unless it becomes a structured `thesisNoteId`
- thesis checklist text unless a migration explicitly adds it
- MBS scorer drafts before a dedicated MBS persistence stage
- named ranker snapshots, history, or ranker-to-thesis-note linking

## Migration Risks

Key risks:

- `node:sqlite` may not be available in the target Electron runtime.
- Renderer code cannot safely import raw Node database modules under the current Electron sandbox.
- Existing form helpers include UI-only fields not represented in the current schema.
- Future migrations could accidentally drop or rewrite user-authored notes.
- Date fields are strings today; any timestamp policy must be consistent before broad persistence wiring.
- The current schema includes created/updated columns in several tables, but repositories do not generate timestamps as side effects.

Mitigations:

- Verify `createSqliteStorage()` inside the packaged Electron runtime before wiring visible workflows.
- Keep storage in the main process and expose typed IPC methods.
- Use additive migrations whenever possible.
- Back up the database file before any migration that changes existing tables.
- Keep repository validation as the final gate before writes.
- Add migration tests that start from older schema fixtures once real user data exists.

## Testing Strategy

Each wiring stage should include:

- Storage repository tests for create/read/update/delete behavior.
- Migration idempotency tests.
- Validation tests for rejected writes.
- Renderer tests using a fake storage client.
- A screen smoke render test with loaded persisted data.
- A manual dev route check after `pnpm dev`.
- A Windows package smoke test with `pnpm package:windows` before release-facing changes.

The Stage 17 storage runtime verification proves the selected SQLite adapter can initialize inside Electron before visible screen wiring starts. If `node:sqlite` fails in Electron, swap the adapter behind the repository interfaces before wiring screens.

## Rollback Strategy

Each future persistence wiring stage should be reversible without data loss:

- Keep one screen per PR.
- Prefer additive schema changes.
- Never remove existing columns in a feature stage.
- Back up the database file before new migrations in release builds.
- If a screen load fails, show an error state and keep the app usable instead of crashing.
- If a write fails validation, keep the user-entered form data in React state.
- Keep repository interfaces stable so an adapter swap does not affect screen code.

## User Data Safety Rules

Future wiring should follow these rules:

- Validate before writing.
- Normalize tickers consistently.
- Use transactions for multi-step writes.
- Avoid destructive migrations.
- Avoid silent data deletion.
- Preserve user-authored thesis text and notes.
- Keep IDs stable after creation.
- Treat database open or migration failure as a recoverable app state.
- Do not sync local data to any cloud service in Phase 1.

## Out Of Scope For This Plan

This plan does not add:

- SQLite wiring beyond the Watchlist, Thesis Monitor, Reminders, and Portfolio Ranker screens.
- Full app-wide persistence.
- Installer, updater, or code-signing changes.
- Live stock APIs or price feeds.
- Brokerage import or trading execution.
- AI analyst features.
- Supabase/auth/cloud sync.
- Personalized financial advice.
