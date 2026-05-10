# Architecture

Thesis Investing is a Windows-first desktop app organized as a pnpm monorepo. The current architecture is intentionally small so the product can grow without mixing UI, domain logic, storage, and future integrations too early.

## Workspace Structure

- `apps/desktop` is the Windows-first Electron app built with Vite, React, and TypeScript.
- `packages/core` contains pure TypeScript domain and scoring logic.
- `packages/ui` contains reusable React UI components shared by app surfaces.

## Domain And Scoring

Scoring logic must remain deterministic and testable. Keep business rules and score calculations in `packages/core`, covered by focused tests, and avoid coupling those rules to React, Electron, storage, or network APIs.

## Persistence Boundary

Future persistence should be isolated behind a storage or repository layer. The desktop app should call that layer rather than importing database details directly into screens or domain logic.

## Data Provider Boundary

Future live data should be isolated behind provider interfaces. Product code should depend on stable internal contracts, not directly on a vendor SDK, endpoint shape, or API response.

## Product Guardrails

Thesis Investing must remain educational software. It is not a brokerage, must not execute trades, and must not present itself as personalized financial advice.
