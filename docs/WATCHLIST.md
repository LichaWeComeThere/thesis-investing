# Watchlist

The Watchlist is a Phase 1 offline MVP screen for manually tracking symbols or
companies. It is local, user-entered, and educational only.

## Behavior

Users can manually add, edit, select, and remove local watchlist items with:

- ticker
- optional company name
- optional comma-separated tags
- optional note
- optional thesis reference text

The screen shows a local table of watchlist items and a selected item detail
view. Items are held in React state only for this stage.

## Validation

The screen converts form fields into the `WatchlistItem` domain model and
validates with `validateWatchlistItem()` from `packages/core`. Validation covers
ticker format and blank company names when a company value is provided.

## Boundaries

The Watchlist does not persist to SQLite yet and does not connect to external
services. It does not auto-fill company names, prices, tags, or thesis content.

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
