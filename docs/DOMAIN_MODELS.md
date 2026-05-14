# Domain Models

The `packages/core` workspace contains pure TypeScript domain models and helper functions for Thesis Investing. These models are shared by future offline MVP workflows and intentionally avoid React, Electron, storage, network, and operating-system dependencies.

## Purpose

- Define common types for the offline Windows MVP.
- Keep domain and scoring logic deterministic and testable.
- Provide validation helpers that can be reused by future UI and persistence stages.
- Keep the app educational and non-advisory.

## Models Added

- `StockIdentity`: stock or company identity metadata entered or referenced by the user.
- `Portfolio`: a local portfolio container for future holdings.
- `Holding`: a manually entered holding record.
- `WatchlistItem`: a manually tracked company or ticker.
- `ThesisNote`: a user-authored thesis note.
- `ThesisStatus`: supported lifecycle states for a thesis note.
- `ManualBusinessScoreInput` and `ManualBusinessScoreOutput`: deterministic Manual Business Score input and output models.
- `ThemeBasket`: static educational grouping metadata with rationale, tags, examples, and non-advisory copy.
- `Reminder`: a manually entered reminder such as earnings or thesis review.

## Helpers Added

- `normalizeTickerSymbol()`
- `isValidTickerSymbol()`
- `createId()`
- `validateHolding()`
- `validateWatchlistItem()`
- `validateThesisNote()`
- `validateReminder()`
- `isValidIsoDate()`

`createId()` is deterministic and seed-based. It does not use randomness, current time, storage, or network access.

## Out Of Scope

- UI screens or product workflows.
- SQLite or any other persistence layer.
- Live stock APIs or market data providers.
- Supabase, auth, cloud sync, or account systems.
- AI analyst features.
- Brokerage integrations or trading execution.
- Personalized financial advice.

These models are offline, deterministic, and non-advisory foundations for later stages.

See [Manual Business Score](MBS_SCORING.md) for the scoring categories, weights, and rating bands.
