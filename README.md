# Thesis Investing

Thesis Investing is a Windows-first desktop app for building investment discipline. The goal is to help users score stocks, track portfolios, write thesis notes, and monitor whether an original investment thesis remains intact.

This repository is currently entering Phase 1: Offline Windows MVP. The desktop app has a navigation shell with placeholder views only. It does not connect to brokerage accounts, execute trades, provide personalized financial advice, or use live stock APIs.

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
- [Domain Models](docs/DOMAIN_MODELS.md)
- [Persistence](docs/PERSISTENCE.md)

## Financial Disclaimer

Thesis Investing is educational software. It is not financial advice, investment advice, a brokerage, or a trading execution platform.
