# Dashboard

The Dashboard is a Phase 1 offline MVP screen for a local, read-only overview of
the current Thesis Investing workspaces.

## Behavior

The dashboard summarizes the local MVP areas that are available today:

- Manual MBS Scorer
- Portfolio Ranker
- Thesis Monitor
- Watchlist
- Theme Baskets
- Reminders placeholder/status

It also shows static readiness information, including manual workflows
available, live data integrations, brokerage connections, and pending MVP areas.

## Data Source

The dashboard uses static local copy only. It does not aggregate data across
screens yet because most Phase 1 screens currently keep their entries in local
React state rather than shared persisted storage.

## Boundaries

The dashboard is educational and non-advisory. It is not personalized financial
advice, an investment recommendation, a model portfolio, a brokerage dashboard,
or a trading surface.

## Out Of Scope

- live stock APIs or price feeds
- AI summaries or analyst commentary
- brokerage import or trading execution
- Supabase/auth/cloud sync
- full SQLite persistence wiring across all screens
- portfolio allocation advice or buy/sell/hold recommendations

Future stages may connect the dashboard to local persisted data after the MVP
workflows are ready for that shared storage layer.
