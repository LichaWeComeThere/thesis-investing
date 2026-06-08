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
- Reminders

Phase 1, Stage 23 wires the Dashboard to read local persisted summaries from
the existing SQLite-backed workflows.

The Dashboard currently shows read-only local summary counts for:

- saved Watchlist items
- Thesis Notes by status
- Reminders by open, completed, and overdue status
- saved Portfolio Ranker inputs
- saved MBS Score Snapshots, including the latest saved score when available

The Dashboard keeps navigation shortcuts and static educational context where
useful, but local summary cards now reflect persisted data rather than only demo
copy.

## Data Source

The Dashboard reads summaries through the narrow
`window.thesisInvesting.dashboardSummaries` preload API. SQLite access stays in
the Electron main process, and the React renderer does not import raw SQLite,
`node:sqlite`, or storage repositories.

Summary reads are local-only and deterministic. The Dashboard does not mutate
records and does not add write/delete behavior for persisted workflows.

## Boundaries

The dashboard is educational and non-advisory. It is not personalized financial
advice, an investment recommendation, a model portfolio, a brokerage dashboard,
or a trading surface.

## Out Of Scope

- live stock APIs or price feeds
- AI summaries or analyst commentary
- brokerage import or trading execution
- Supabase/auth/cloud sync
- Dashboard writes or record mutation
- portfolio allocation advice or buy/sell/hold recommendations
