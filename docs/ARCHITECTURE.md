# Architecture

Thesis Investing is a Windows-first desktop app organized as a pnpm monorepo. The current architecture is intentionally small so the product can grow without mixing UI, domain logic, storage, and future integrations too early.

## Workspace Structure

- `apps/desktop` is the Windows-first Electron app built with Vite, React, and TypeScript.
- `packages/core` contains pure TypeScript domain and scoring logic.
- `packages/ui` contains reusable React UI components shared by app surfaces.

## Domain And Scoring

Scoring logic must remain deterministic and testable. Keep business rules and score calculations in `packages/core`, covered by focused tests, and avoid coupling those rules to React, Electron, storage, or network APIs.

## Persistence Boundary

Local persistence is isolated behind the Electron main/storage repository layer.
The desktop app's React renderer calls narrow preload APIs under
`window.thesisInvesting` rather than importing SQLite, `node:sqlite`,
filesystem helpers, or storage repositories directly.

Current Phase 2 persisted workflows are Watchlist items, Thesis Notes,
Reminders, Portfolio Ranker Inputs, and MBS Score Snapshots. Dashboard summaries
and Settings/About local data status read from persisted local records without
writing them. Export/import file dialogs, file reads/writes, JSON validation,
and SQLite writes stay in Electron main.

Phase 3 Stage 4 connects Thesis Board to the formal Living Thesis repository
through narrow typed renderer, preload, IPC, and Electron main boundaries. The
Board creates and updates current Living Thesis state with optimistic version
checks; IDs and canonical timestamps are generated in Electron main. It does
not expose SQLite or filesystem access to the renderer, auto-seed demo records,
or implement review history, health, queue, or MBS history behavior.

## Data Provider Boundary

Future live data should be isolated behind provider interfaces. Product code should depend on stable internal contracts, not directly on a vendor SDK, endpoint shape, or API response.

## Product Guardrails

Thesis Investing must remain educational software. It is not a brokerage, must not execute trades, and must not present itself as personalized financial advice.
