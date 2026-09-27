# Thesis Investing

Thesis Investing is a Windows-first desktop app for building investment discipline. The goal is to help users score stocks, track portfolios, write thesis notes, and monitor whether an original investment thesis remains intact.

This repository has completed Phase 1: Offline Windows MVP, Phase 2: Local Data Foundation through closeout QA, and Phase 3 through Stage 9: Thesis Health, with manual Windows UI verification still pending. The desktop app has onboarding, a navigation shell, a local Dashboard summary overview, local manual MVP screens for scoring, ranking, thesis notes, watchlists, static theme baskets, reminders, and a persisted Living Thesis Board. It includes local SQLite persistence for Watchlist items, Thesis Notes, Reminders, Portfolio Ranker inputs, MBS Score Snapshots, and formal Living Thesis current state with structured risks and catalysts. Read-only Dashboard summaries, non-destructive export, preview-first append-only import, and local data maintenance remain available; new backups use export format version 5 and include Living Theses, their risks and catalysts, review sessions, completed review revisions, and saved decisions, while formats 1–4 remain readable. It does not connect to brokerage accounts, execute trades, provide personalized financial advice, or use live stock APIs.

The [Stage 5 review workflow](docs/LIVING_THESIS_REVIEW_WORKFLOW.md) provides core review steps, proposed-edit previews, and completion validation. [Stage 6, part 1](docs/LIVING_THESIS_REVIEW_SESSION_STORAGE.md) adds durable review draft storage, restart recovery, independent version checks, and backup coverage. [Stage 6, part 2](docs/LIVING_THESIS_REVIEW_SESSION_UI.md) connects that storage to a guided review in Thesis Board: start or resume a review, work through six sections, and save an unfinished draft. **Save draft** keeps the current thesis and score history unchanged. **Complete review** confirms the proposed changes, then saves the updated thesis, immutable review revision, completed session, and any new business score together. Failed writes roll back; retrying an uncertain completion cannot duplicate history.

[Stage 7: Decision Log](docs/LIVING_THESIS_DECISION_LOG.md) adds **Add decision** inside a saved thesis. Record a decision and reason, optionally link a completed review, and browse the saved entries with the newest first. The date is recorded automatically; an entry documents reasoning without changing the thesis or completed review. Saved decisions are immutable and included in backups.

[Stage 8: History](docs/LIVING_THESIS_HISTORY.md) brings completed reviews, decisions, and scores saved through those reviews into one **History** card, with newest-first summaries and expandable details. It derives the view from existing records without changing the database schema or backup format. Direct Board edits are not a complete historical log, and legacy scores are not linked by ticker or a coincidentally matching ID.

[Stage 9: Thesis Health](docs/LIVING_THESIS_HEALTH.md) adds a small assessment based on saved research, with clear reasons and missing-information messages. Research concerns and review timing stay separate: an overdue review does not make the research assessment worse. Recorded high risks and decreases in review-linked scores identify concerns; an empty record is never treated as healthy. The assessment is derived locally without changing stored research or backups. Stage 10, Review Queue, is the next separate task.

## Windows-first

The first supported target is a Windows desktop app built with Electron, Vite, React, and TypeScript.

## Setup

Use Node.js 22.12 or later and pnpm 9.15.4. The desktop runtime is pinned to
Electron 44.4.5. The first `pnpm dev` downloads that runtime if needed before
starting the development app; subsequent starts reuse it.

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
pnpm verify:desktop
pnpm preview:review
```

`pnpm preview:review` opens a browser development server with a separate example
database and fictional research. See the [review UI guide](docs/LIVING_THESIS_REVIEW_SESSION_UI.md#browser-development-preview)
for its scope and data location. `pnpm dev` still launches the Electron app.

`pnpm verify:desktop` runs an automated Electron smoke check using temporary
data, including the built renderer/preload, IPC protections, and encrypted key
storage. See [Electron upgrade verification](docs/ELECTRON_UPGRADE.md) for its
scope and the remaining manual Windows acceptance.

## Workspace Layout

- `apps/desktop`: Electron + Vite + React + TypeScript desktop app
- `packages/core`: pure TypeScript scoring and domain logic
- `packages/ui`: reusable React UI components
- `.github/workflows`: GitHub Actions workflows

## Documentation

- [Roadmap](docs/ROADMAP.md)
- [Living Thesis Decision Log](docs/LIVING_THESIS_DECISION_LOG.md)
- [Living Thesis History](docs/LIVING_THESIS_HISTORY.md)
- [Living Thesis Health](docs/LIVING_THESIS_HEALTH.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Codex Workflow](docs/CODEX_WORKFLOW.md)
- [Definition Of Done](docs/DEFINITION_OF_DONE.md)
- [Issue Labels](docs/ISSUE_LABELS.md)
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
- [Local Data Export](docs/LOCAL_DATA_EXPORT.md)
- [Local Data Import](docs/LOCAL_DATA_IMPORT.md)
- [Local Data Maintenance](docs/LOCAL_DATA_MAINTENANCE.md)
- [Storage Runtime Verification](docs/STORAGE_RUNTIME_VERIFICATION.md)
- [Historical Plans and Prototype Archives](docs/archive/README.md)
- [Guided Review UI](docs/LIVING_THESIS_REVIEW_SESSION_UI.md)
- [Guided Review Design QA](design-qa.md)

## Financial Disclaimer

Thesis Investing is educational software. It is not financial advice, investment advice, a brokerage, or a trading execution platform.
