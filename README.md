# Thesis Investing

Thesis Investing is a Windows-first desktop app for building investment discipline. The goal is to help users score stocks, track portfolios, write thesis notes, and monitor whether an original investment thesis remains intact.

This repository has completed Phase 1: Offline Windows MVP, Phase 2: Local Data Foundation through closeout QA, and Phase 3 Stage 4: Thesis Board Adoption. The desktop app has onboarding, a navigation shell, a local Dashboard summary overview, local manual MVP screens for scoring, ranking, thesis notes, watchlists, static theme baskets, reminders, and a persisted Living Thesis Board. It includes local SQLite persistence for Watchlist items, Thesis Notes, Reminders, Portfolio Ranker inputs, MBS Score Snapshots, and formal Living Thesis current state with structured risks and catalysts. Read-only Dashboard summaries, non-destructive export, preview-first append-only import, and local data maintenance remain available; export/import version 1 does not yet include Living Thesis records. It does not connect to brokerage accounts, execute trades, provide personalized financial advice, or use live stock APIs.

## Windows-first

The first supported target is a Windows desktop app built with Electron, Vite, React, and TypeScript.

## Setup

```bash
pnpm install
pnpm dev
```

## Available Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm package:windows
pnpm verify:storage
```

## Workspace Layout

- `apps/desktop`: Electron + Vite + React + TypeScript desktop app
- `packages/core`: pure TypeScript scoring and domain logic
- `packages/ui`: reusable React UI components
- `.github/workflows`: GitHub Actions workflows

## Documentation

- [Roadmap](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Codex Workflow](docs/CODEX_WORKFLOW.md)
- [Backlog](docs/BACKLOG.md)
- [Definition Of Done](docs/DEFINITION_OF_DONE.md)
- [Issue Labels](docs/ISSUE_LABELS.md)
- [Phase 1 Issues](docs/PHASE_1_ISSUES.md)
- [Phase 1 Closeout](docs/PHASE_1_CLOSEOUT.md)
- [Phase 2 Closeout](docs/PHASE_2_CLOSEOUT.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Dashboard](docs/DASHBOARD.md)
- [Domain Models](docs/DOMAIN_MODELS.md)
- [Manual Business Score](docs/MBS_SCORING.md)
- [Manual MBS Scorer Screen](docs/MANUAL_MBS_SCORER.md)
- [Portfolio Ranker](docs/PORTFOLIO_RANKER.md)
- [Thesis Monitor](docs/THESIS_MONITOR.md)
- [Watchlist](docs/WATCHLIST.md)
- [Theme Baskets](docs/THEME_BASKETS.md)
- [Reminders](docs/REMINDERS.md)
- [Windows Release Prep](docs/WINDOWS_RELEASE.md)
- [Release Smoke Test](docs/RELEASE_SMOKE_TEST.md)
- [First-Run Onboarding](docs/ONBOARDING.md)
- [Persistence](docs/PERSISTENCE.md)
- [Persistence Wiring Plan](docs/PERSISTENCE_WIRING_PLAN.md)
- [Local Data Export](docs/LOCAL_DATA_EXPORT.md)
- [Local Data Import](docs/LOCAL_DATA_IMPORT.md)
- [Local Data Maintenance](docs/LOCAL_DATA_MAINTENANCE.md)
- [Storage Runtime Verification](docs/STORAGE_RUNTIME_VERIFICATION.md)

## Financial Disclaimer

Thesis Investing is educational software. It is not financial advice, investment advice, a brokerage, or a trading execution platform.
