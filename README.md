# Thesis Investing

Thesis Investing is a Windows-first desktop app for building investment discipline. The goal is to help users score stocks, track portfolios, write thesis notes, and monitor whether an original investment thesis remains intact.

This repository is currently in Phase 1: Offline Windows MVP. The desktop app has onboarding, a navigation shell, a local static dashboard overview, and local manual MVP screens for scoring, ranking, thesis notes, watchlists, static theme baskets, and reminders. It does not connect to brokerage accounts, execute trades, provide personalized financial advice, or use live stock APIs.

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
- [First-Run Onboarding](docs/ONBOARDING.md)
- [Persistence](docs/PERSISTENCE.md)

## Financial Disclaimer

Thesis Investing is educational software. It is not financial advice, investment advice, a brokerage, or a trading execution platform.
