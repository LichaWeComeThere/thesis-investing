# Roadmap

Thesis Investing will be built in small, reviewable phases. Each stage should land in its own pull request and keep product guardrails intact: no brokerage execution, no personalized financial advice, no live data APIs until explicitly planned, and no cloud sync or AI analyst features until their phases.

## Phase 0: GitHub/Codex Foundation

Establish the repository, workspace structure, CI, documentation, and collaboration workflow for future stages.

## Phase 1: Offline Windows MVP

Build a Windows-first desktop MVP that works offline with manual user input and local-only data. Phase 1 is complete through Stage 24 closeout QA.

- Stage 1: App navigation shell
- Stage 2: Design system
- Stage 3: Core domain models
- Stage 4: SQLite local persistence
- Stage 5: MBS scoring engine
- Stage 6: First-run onboarding
- Stage 7: Manual MBS Scorer screen
- Stage 8: Portfolio Ranker
- Stage 9: Thesis Monitor and thesis notes
- Stage 10: Watchlist
- Stage 11: Static Theme Baskets
- Stage 12: Dashboard
- Stage 13: Manual earnings reminders
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

## Phase 2: Local Data Management, Live Data, And Optional Sync

Start with local data management visibility and release hardening before adding live market data or optional sync. Live data should be isolated behind provider interfaces, and sync should remain optional.

- Stage 1: Local Data Management View
- Stage 2: Local Data Export
- Stage 3: Local Data Import
- Future: local restore and backup/restore planning
- Future: optional live market data behind provider interfaces
- Future: optional sync, auth, or cloud features only after explicit staging

## Phase 3: Research/Intelligence Layer

Add research-oriented tools after the core workflow is proven. Intelligence features must remain educational, transparent, and non-advisory.

## Phase 4: Monetization, AI, Backtesting, And Future iOS/Web Expansion

Explore premium packaging, AI-assisted workflows, backtesting, and additional platforms after the Windows MVP and supporting architecture are mature.
