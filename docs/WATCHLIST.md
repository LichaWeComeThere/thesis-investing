# Watchlist

The Watchlist is a Phase 1 offline MVP screen for manually tracking symbols or
companies. It is local, user-entered, persisted on the user's device, and
educational only.

## Behavior

Users can manually add, edit, select, and remove local watchlist items with:

- ticker
- optional company name
- optional comma-separated tags
- optional note
- optional thesis reference text

The screen shows a local table of watchlist items and a selected item detail
view. Ticker, company name, tags, and note are persisted through the local
SQLite storage boundary.

The optional thesis reference field is current-session text only in this stage.
It is not persisted because it is not represented in the core `WatchlistItem`
model or SQLite schema yet.

## Validation

The screen converts form fields into the `WatchlistItem` domain model and
validates with `validateWatchlistItem()` from `packages/core`. Validation covers
ticker format and blank company names when a company value is provided.

## Persistence Boundary

Watchlist persistence is owned by the Electron main process. The React renderer
calls a narrow preload API exposed as `window.thesisInvesting.watchlist`; it does
not import SQLite or `node:sqlite` directly.

The SQLite repository normalizes ticker symbols and validates data before
writing. Storage failures should show an error in the Watchlist screen without
crashing the app or silently deleting user input.

## Boundaries

The Watchlist does not connect to external services. It does not auto-fill
company names, prices, tags, or thesis content.

## Out Of Scope

- live stock APIs or price feeds
- price alerts
- AI analyst features
- brokerage import or trading execution
- Supabase/auth/cloud sync
- full theme basket workflows
- personalized financial advice

## Non-Advisory Notice

Watchlist items are manually entered by the user for educational organization.
They are not financial advice, investment advice, or recommendations to buy,
sell, or hold any security.
