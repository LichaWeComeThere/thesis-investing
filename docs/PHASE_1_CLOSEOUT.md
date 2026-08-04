# Phase 1 Closeout

Phase 1 delivers the Offline Windows MVP for Thesis Investing: a local,
manual, educational desktop app that helps users organize thesis-driven
research without live data, AI analysis, brokerage connections, cloud sync, or
personalized financial advice.

## Phase 1 Goal

Build a Windows-first Electron app that runs locally, supports core manual
research workflows, persists Phase 1 user-entered records through SQLite, and
can be validated with repeatable local and GitHub Actions checks.

## Completed Stages

- Stage 1: App navigation shell
- Stage 2: Design system
- Stage 3: Core domain models
- Stage 4: SQLite local persistence boundary
- Stage 5: Manual Business Score scoring engine
- Stage 6: First-run onboarding
- Stage 7: Manual MBS Scorer screen
- Stage 8: Portfolio Ranker
- Stage 9: Thesis Monitor and thesis notes
- Stage 10: Watchlist
- Stage 11: Static Theme Baskets
- Stage 12: Dashboard
- Stage 13: Manual reminders
- Stage 14: Windows MVP release build
- Stage 15: Release smoke-test documentation
- Stage 16: Persistence wiring plan
- Stage 17: Electron storage runtime verification
- Stage 18: Watchlist persistence
- Stage 19: Thesis Notes persistence
- Stage 20: Reminders persistence
- Stage 21: Portfolio Ranker input persistence
- Stage 22: MBS Score Snapshot persistence
- Stage 23: Dashboard persisted local summary reads
- Stage 24: Final QA, polish, and Phase 1 closeout

## Current Persisted Workflows

The Phase 1 visible persistence rollout is complete for:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots
- Dashboard persisted summaries, read-only

SQLite remains in the Electron main/storage layer. Renderer screens use narrow
preload APIs under `window.thesisInvesting` and do not import raw SQLite,
`node:sqlite`, or storage repositories directly.

## Validation Commands

Run these from the repository root before marking a Phase 1 build ready:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm package:windows
pnpm verify:storage
pnpm dev
```

## Final QA Checklist

- [ ] App opens as Thesis Investing.
- [ ] First-run onboarding appears in a clean profile and can be completed.
- [ ] Dashboard opens and reads local persisted summary counts.
- [ ] MBS Scorer opens and can save a completed score snapshot.
- [ ] Portfolio Ranker opens and persists manual ranker inputs.
- [ ] Thesis Monitor opens and persists thesis notes.
- [ ] Watchlist opens and persists watchlist items.
- [ ] Theme Baskets opens and remains static educational data.
- [ ] Reminders opens and persists reminder records.
- [ ] Settings/About opens and can reset onboarding.
- [ ] Non-advisory safety note is visible.
- [ ] No screen adds live APIs, AI analyst behavior, brokerage or trading
  execution, cloud sync, or buy/sell/hold recommendation language.
- [ ] `pnpm verify:storage` passes.
- [ ] `pnpm package:windows` produces an unsigned unpacked Windows app folder.
- [ ] The release smoke test checklist is completed before sharing an artifact.

## Windows Packaging Status

`pnpm package:windows` builds an unsigned unpacked Windows app folder through
`electron-builder`. On the GitHub Windows x64 runner the artifact path is:

```text
apps/desktop/release/windows/win-unpacked
```

On ARM64 Windows development machines, local packaging may produce:

```text
apps/desktop/release/windows/win-arm64-unpacked
```

The Phase 1 artifact is not code signed and is not an installer. For manual
release checks, use the [release smoke test checklist](RELEASE_SMOKE_TEST.md).

## Known Limitations

- The Windows app is packaged as an unsigned unpacked folder only.
- No installer, code signing, or auto-update flow exists yet.
- Data is local-only; there is no cloud sync, account system, or auth.
- Import, database backups, and restore flows were not implemented in Phase 1;
  local JSON export begins in Phase 2.
- First-run onboarding completion still uses renderer `localStorage`.
- Selected sidebar route, selected row IDs, search text, filters, sort toggles,
  and in-progress form fields remain transient UI state.
- Watchlist thesis reference text and Thesis Monitor checklist text are UI-only
  fields because they are not represented in the Phase 1 core models or schema.
- Incomplete MBS Scorer draft autosave and MBS snapshot delete/remove are not
  included.
- Dashboard summaries are read-only counts and latest MBS score metadata, not a
  detailed reporting or history workspace.
- Theme Baskets remain static local educational data.

## Intentionally Out Of Scope

Phase 1 does not include:

- live stock APIs, live prices, external news feeds, or brokerage imports
- AI analyst features, generated recommendations, or personalized advice
- brokerage account connections or trading execution
- Supabase, auth, cloud sync, or account systems
- buy, sell, hold, sizing, ranking, allocation, or model-portfolio advice
- background reminders, OS notifications, or calendar integrations
- app-wide preferences stored in SQLite
- local import, backups, restore flows, or broader data movement tooling

## Recommended Phase 2 Path

Phase 2 starts with read-only local data management/status in Settings/About so
users can see where local data lives and what is persisted before broader data
movement, sync, or live data work begins. The next local data step is a
non-destructive JSON export of persisted Phase 1 records.

After that, continue local data safety and release hardening before adding any
external data source:

- database backup and restore guidance
- local import for persisted Phase 1 records
- SQLite-backed local preferences, including onboarding completion if desired
- a release artifact review for installer, icon, metadata, signing, and
  auto-update decisions

After those are stable, live market data or optional sync can be staged behind
explicit provider interfaces while preserving the educational, non-advisory
product boundary.

Phase 2 has since completed through closeout QA. See
[Phase 2 Closeout](PHASE_2_CLOSEOUT.md) for the current local data lifecycle
status and the recommended Phase 3 starting point.
