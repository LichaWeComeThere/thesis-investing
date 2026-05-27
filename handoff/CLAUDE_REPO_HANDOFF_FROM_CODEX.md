# Claude Code Handoff From Codex

Generated: 2026-05-26

Repository: https://github.com/LichaWeComeThere/thesis-investing.git

Local checkout inspected: `D:\Thesis Investing GitHub`

This handoff is documentation only. It does not implement product behavior,
start a new feature stage, or change the app runtime.

## 1. Current Git State

Current local state at regeneration time:

- Current branch: `claude/phase-1-stage-21-persisted-portfolio-ranker-inputs`
- Current `HEAD`: `fbfe98f314fa56bc9c066045d854d13288d04f85`
- `origin/main`: `fbfe98f314fa56bc9c066045d854d13288d04f85`
- Local `main` matches `origin/main`: yes
- Open PRs visible through the GitHub connector: none
- Important: the current branch has uncommitted Stage 21 work in progress.

Current uncommitted files observed:

```text
M  README.md
M  apps/desktop/src/main/main.ts
M  apps/desktop/src/preload/preload.ts
M  apps/desktop/src/renderer/src/PortfolioRankerScreen.test.tsx
M  apps/desktop/src/renderer/src/PortfolioRankerScreen.tsx
M  apps/desktop/src/renderer/src/portfolioRankerInput.ts
M  apps/desktop/src/shared/watchlistStorage.ts
M  apps/desktop/src/storage/index.test.ts
M  apps/desktop/src/storage/index.ts
M  apps/desktop/src/storage/repositories.ts
M  apps/desktop/src/storage/schema.ts
M  apps/desktop/src/storage/sqliteRepositories.ts
M  docs/PERSISTENCE.md
M  docs/PERSISTENCE_WIRING_PLAN.md
M  docs/PORTFOLIO_RANKER.md
M  packages/core/src/domain.ts
M  packages/core/src/index.test.ts
M  packages/core/src/index.ts
M  packages/core/src/validation.ts
?? apps/desktop/src/main/portfolioRankerIpc.ts
?? apps/desktop/src/main/portfolioRankerStorageService.test.ts
?? apps/desktop/src/main/portfolioRankerStorageService.ts
?? apps/desktop/src/renderer/src/portfolioRankerStorageClient.test.ts
?? apps/desktop/src/renderer/src/portfolioRankerStorageClient.ts
?? apps/desktop/src/shared/portfolioRankerStorage.ts
```

Recent relevant commits on `origin/main`:

```text
fbfe98f updated beta version and user navigation
c3551d8 Merge pull request #29 from LichaWeComeThere/App-revamping(05/23/26)
4e0a596 Resolve app revamp merge conflicts
4a1ee64 App revamping and space optimization
e318672 Merge pull request #28 from LichaWeComeThere/codex/phase-1-stage-20-persisted-reminders
3c2a5e1 Persist reminders locally
52e6123 Merge pull request #27 from LichaWeComeThere/codex/phase-1-stage-19-persisted-thesis-notes
57004d0 Persist thesis notes locally
a6b5f08 Merge pull request #26 from LichaWeComeThere/codex/phase-1-stage-18-persisted-watchlist
84479c6 Persist watchlist items locally
```

Repo-state notes:

- Phase 1 Stage 20 Reminders persistence is merged into `main`.
- A later UI revamp also landed on `main` in PR #29 plus commit `fbfe98f`.
- The UI revamp added richer dashboard/ranker/scorer presentation and a new
  `InvestmentIdea` core model/helper layer.
- Stage 21 Portfolio Ranker persistence appears to be in progress locally on
  the Claude branch, but this handoff does not validate or complete it.

## 2. Project Architecture

This is a pnpm monorepo.

Top-level structure:

```text
apps/
  desktop/
packages/
  core/
  ui/
.github/
  workflows/
docs/
```

Root scripts in `package.json`:

```text
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm package:windows
pnpm verify:storage
```

Workspace config:

- `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
- `pnpm-workspace.yaml` includes build approvals for `electron` and `esbuild`.

### apps/desktop

`apps/desktop` is the Windows-first Electron app built with Electron, Vite,
React, and TypeScript.

Important layout:

```text
apps/desktop/src/main/
  main.ts
  *Ipc.ts
  *StorageService.ts
  verifyStorageRuntime.ts

apps/desktop/src/preload/
  preload.ts

apps/desktop/src/shared/
  watchlistStorage.ts
  thesisNotesStorage.ts
  remindersStorage.ts

apps/desktop/src/storage/
  repositories.ts
  schema.ts
  sqlite.ts
  sqliteRepositories.ts
  runtimeVerification.ts

apps/desktop/src/renderer/src/
  App.tsx
  DashboardScreen.tsx
  ManualMbsScorerScreen.tsx
  PortfolioRankerScreen.tsx
  ThesisMonitorScreen.tsx
  WatchlistScreen.tsx
  ThemeBasketsScreen.tsx
  RemindersScreen.tsx
  *Input.ts
  *StorageClient.ts
  data/mockTheses.ts
```

### packages/core

`packages/core` owns pure TypeScript domain logic and must stay independent of
React, Electron, SQLite, Node filesystem APIs, and network APIs.

Current responsibilities include:

- domain types in `packages/core/src/domain.ts`
- deterministic IDs in `packages/core/src/ids.ts`
- validation helpers in `packages/core/src/validation.ts`
- Manual Business Score in `packages/core/src/scoring.ts`
- Portfolio Ranker sorting/validation in `packages/core/src/portfolioRanker.ts`
- Investment idea mapping helpers in `packages/core/src/investmentIdea.ts`

Recent UI-revamp work added:

- `InvestmentIdea`
- `InvestmentIdeaDecisionLogEntry`
- `InvestmentIdeaWatchlistStatus`
- helpers that map MBS score, Portfolio Ranker input, and Thesis Notes into
  `InvestmentIdea`

### packages/ui

`packages/ui` owns reusable React UI foundations.

Exports:

- `Badge`
- `Button`
- `Card`
- `PageHeader`
- `tokens`
- `themeCssVariables`

Source files:

```text
packages/ui/src/index.ts
packages/ui/src/tokens.ts
packages/ui/src/components/Badge.tsx
packages/ui/src/components/Button.tsx
packages/ui/src/components/Card.tsx
packages/ui/src/components/PageHeader.tsx
```

### Electron Boundaries

Current boundary pattern:

1. Electron main process owns database creation, migrations, repository
   instances, and IPC registration.
2. Preload exposes a narrow `window.thesisInvesting` API through
   `contextBridge`.
3. Renderer screens call typed storage clients.
4. Renderer code must not import `node:sqlite`, raw SQLite helpers, or
   `createSqliteStorage()`.
5. `packages/core` remains pure and has no Electron/storage dependency.

Current `BrowserWindow` settings in `apps/desktop/src/main/main.ts`:

- `contextIsolation: true`
- `sandbox: true`
- preload path: `../preload/preload.cjs`
- title: `Thesis Investing`

## 3. Current Product State

The app opens to first-run onboarding unless the local onboarding flag is set.
Onboarding completion uses `localStorage` key
`thesis-investing:onboarding-completed`.

Current route IDs and current navigation labels/titles from `App.tsx`:

| Route ID | Current nav label | Current screen |
| --- | --- | --- |
| `dashboard` | `Dashboard` | Implemented dashboard |
| `mbs-scorer` | `MBS Scorer` | Implemented manual MBS scorer |
| `portfolio-ranker` | `Thesis Rankings` | Implemented Portfolio Ranker / Thesis Rankings |
| `thesis-monitor` | `Thesis Monitor` | Implemented Thesis Monitor |
| `watchlist` | `Watchlist` | Implemented Watchlist |
| `theme-baskets` | `Theme Baskets` | Implemented static Theme Baskets |
| `reminders` | `Reminders` | Implemented Reminders |
| `settings-about` | `App Settings` | Implemented Settings/About reset screen |

Implemented screens:

- First-run onboarding
- Dashboard
- MBS Scorer
- Portfolio Ranker / Thesis Rankings
- Thesis Monitor
- Watchlist
- Theme Baskets
- Reminders
- App Settings / Settings/About

Persisted screens on `main`:

- Watchlist
- Thesis Monitor / Thesis Notes
- Reminders

Unpersisted or only partly persisted workflows on `main`:

- Dashboard: static/mock local overview; does not aggregate persisted summaries
- Portfolio Ranker / Thesis Rankings: React state plus demo/mock thesis data
- MBS Scorer: React state plus demo/mock thesis data
- Theme Baskets: static local data
- Onboarding: `localStorage`, not SQLite
- Selected route, selected row IDs, filters, search text, sort state: transient

Recent UI note:

- `apps/desktop/src/renderer/src/data/mockTheses.ts` drives richer demo UI for
  Dashboard, Portfolio Ranker, MBS Scorer, Thesis Monitor, Watchlist, and
  Reminders.
- Some mock/demo content mentions AI as a research theme or headline. This is
  static sample data, not an AI analyst feature or API integration.

Safety notes currently present:

- Sidebar safety note says: `Educational software only. Not financial advice. No brokerage or trading execution.`
- App Settings says the app is not financial advice, not a brokerage, not a
  trading execution platform, and not a recommendation to buy/sell/hold/size/rank/allocate.
- README and docs repeat the no-live-APIs/no-trading/no-AI/no-sync boundaries.

## 4. Persistence Architecture

### SQLite Adapter

SQLite lives in `apps/desktop/src/storage`.

The current adapter uses Node/Electron `node:sqlite`:

- `apps/desktop/src/storage/sqlite.ts`
- `createSqliteStorage()`
- `createSqliteDatabase()`
- `loadNodeSqlite()` via `createRequire(import.meta.url)`

Important limitation:

- `node:sqlite` is experimental.
- Electron 36.9.5 currently provides the runtime used by the app.
- `pnpm verify:storage` verifies the adapter in the Electron main process using
  in-memory data.

### Schema And Migrations

Migrations live in `apps/desktop/src/storage/schema.ts`.

Current migration on `main`:

- version `1`
- name `initial_local_schema`

Tables created on `main`:

- `holdings`
- `watchlist_items`
- `thesis_notes`
- `reminders`
- `schema_migrations`

The schema includes `created_at` and `updated_at` columns on several tables,
but current repositories do not generally generate timestamps as side effects.
Dates are accepted from the app/domain layer.

### Repository Interfaces

Repository interfaces live in `apps/desktop/src/storage/repositories.ts`.

Current interfaces on `main`:

- `HoldingRepository`
- `WatchlistItemRepository`
- `ThesisNoteRepository`
- `ReminderRepository`
- `LocalStorageRepositories`

SQLite implementations live in:

- `apps/desktop/src/storage/sqliteRepositories.ts`

The repositories normalize ticker symbols and validate domain data through
`packages/core` before writing.

### Electron Main IPC Modules

Current IPC modules on `main`:

- `apps/desktop/src/main/watchlistIpc.ts`
- `apps/desktop/src/main/thesisNotesIpc.ts`
- `apps/desktop/src/main/remindersIpc.ts`

Each opens the same SQLite file:

```text
join(app.getPath('userData'), 'thesis-investing.sqlite')
```

Each registers handlers with `ipcMain.handle(...)` and closes its service on
`before-quit`.

Current main-process storage services:

- `apps/desktop/src/main/watchlistStorageService.ts`
- `apps/desktop/src/main/thesisNotesStorageService.ts`
- `apps/desktop/src/main/remindersStorageService.ts`

### Preload API

Preload file:

- `apps/desktop/src/preload/preload.ts`

Exposes on `main`:

```ts
window.thesisInvesting = {
  platform,
  watchlist: {
    list,
    save,
    remove
  },
  thesisNotes: {
    list,
    save
  },
  reminders: {
    list,
    save,
    remove
  }
}
```

Shared channel/type files:

- `apps/desktop/src/shared/watchlistStorage.ts`
- `apps/desktop/src/shared/thesisNotesStorage.ts`
- `apps/desktop/src/shared/remindersStorage.ts`

`ThesisInvestingApi` is currently declared in `watchlistStorage.ts` and imports
the other storage API types.

### Renderer Storage Clients

Renderer clients on `main`:

- `apps/desktop/src/renderer/src/watchlistStorageClient.ts`
- `apps/desktop/src/renderer/src/thesisNotesStorageClient.ts`
- `apps/desktop/src/renderer/src/remindersStorageClient.ts`

These clients:

- resolve default clients from `window.thesisInvesting`
- map UI-local types to persisted domain types
- keep renderer code away from SQLite details

### Current Persisted Workflows

#### Watchlist

Screen:

- `apps/desktop/src/renderer/src/WatchlistScreen.tsx`

Input/helper:

- `apps/desktop/src/renderer/src/watchlistInput.ts`

Storage path:

- renderer client: `watchlistStorageClient.ts`
- shared IPC channels/types: `shared/watchlistStorage.ts`
- main IPC: `main/watchlistIpc.ts`
- service: `main/watchlistStorageService.ts`
- repository: `storage.repositories.watchlistItems`

Persisted fields:

- ticker
- optional company name
- tags
- note
- `thesisNoteId` if present in the model

UI-only/transient:

- selected item
- form state
- mock thesis selection
- free text `thesisReference` if not represented as `thesisNoteId`

#### Thesis Notes

Screen:

- `apps/desktop/src/renderer/src/ThesisMonitorScreen.tsx`

Input/helper:

- `apps/desktop/src/renderer/src/thesisMonitorInput.ts`

Storage path:

- renderer client: `thesisNotesStorageClient.ts`
- shared IPC channels/types: `shared/thesisNotesStorage.ts`
- main IPC: `main/thesisNotesIpc.ts`
- service: `main/thesisNotesStorageService.ts`
- repository: `storage.repositories.thesisNotes`

Persisted fields:

- title
- body
- status
- optional ticker
- optional conviction
- optional review due date
- created/updated dates if supplied

Known limitation:

- checklist text remains UI-only/current-session-only unless a future schema
  migration adds it.
- no delete IPC is exposed for thesis notes at present.

#### Reminders

Screen:

- `apps/desktop/src/renderer/src/RemindersScreen.tsx`

Input/helper:

- `apps/desktop/src/renderer/src/reminderInput.ts`

Storage path:

- renderer client: `remindersStorageClient.ts`
- shared IPC channels/types: `shared/remindersStorage.ts`
- main IPC: `main/remindersIpc.ts`
- service: `main/remindersStorageService.ts`
- repository: `storage.repositories.reminders`

Persisted fields:

- title
- reminder type
- optional ticker
- due date
- optional note
- completion state via `completedAt`

Completion mapping:

- UI uses boolean `completed`.
- Storage uses `completedAt`.
- Marking complete sets a local ISO date (`YYYY-MM-DD`) if missing.
- Reopening clears `completedAt`.

Out of scope:

- system notifications
- background scheduling
- calendar integration
- earnings APIs

## 5. Important Files To Inspect

Package/workspace:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `apps/desktop/package.json`
- `packages/core/package.json`
- `packages/ui/package.json`

Electron/Vite:

- `apps/desktop/electron.vite.config.ts`
- `apps/desktop/electron-builder.yml`
- `apps/desktop/src/main/main.ts`
- `apps/desktop/src/preload/preload.ts`

Storage:

- `apps/desktop/src/storage/repositories.ts`
- `apps/desktop/src/storage/schema.ts`
- `apps/desktop/src/storage/sqlite.ts`
- `apps/desktop/src/storage/sqliteRepositories.ts`
- `apps/desktop/src/storage/runtimeVerification.ts`
- `apps/desktop/src/main/verifyStorageRuntime.ts`

Main IPC/services:

- `apps/desktop/src/main/watchlistIpc.ts`
- `apps/desktop/src/main/watchlistStorageService.ts`
- `apps/desktop/src/main/thesisNotesIpc.ts`
- `apps/desktop/src/main/thesisNotesStorageService.ts`
- `apps/desktop/src/main/remindersIpc.ts`
- `apps/desktop/src/main/remindersStorageService.ts`

Shared preload API types:

- `apps/desktop/src/shared/watchlistStorage.ts`
- `apps/desktop/src/shared/thesisNotesStorage.ts`
- `apps/desktop/src/shared/remindersStorage.ts`

Renderer clients:

- `apps/desktop/src/renderer/src/watchlistStorageClient.ts`
- `apps/desktop/src/renderer/src/thesisNotesStorageClient.ts`
- `apps/desktop/src/renderer/src/remindersStorageClient.ts`

Current screens:

- `apps/desktop/src/renderer/src/App.tsx`
- `apps/desktop/src/renderer/src/DashboardScreen.tsx`
- `apps/desktop/src/renderer/src/ManualMbsScorerScreen.tsx`
- `apps/desktop/src/renderer/src/PortfolioRankerScreen.tsx`
- `apps/desktop/src/renderer/src/ThesisMonitorScreen.tsx`
- `apps/desktop/src/renderer/src/WatchlistScreen.tsx`
- `apps/desktop/src/renderer/src/ThemeBasketsScreen.tsx`
- `apps/desktop/src/renderer/src/RemindersScreen.tsx`
- `apps/desktop/src/renderer/src/MarketPulseFeed.tsx`
- `apps/desktop/src/renderer/src/data/mockTheses.ts`

Current screen input helpers:

- `apps/desktop/src/renderer/src/manualMbsScorerInput.ts`
- `apps/desktop/src/renderer/src/portfolioRankerInput.ts`
- `apps/desktop/src/renderer/src/thesisMonitorInput.ts`
- `apps/desktop/src/renderer/src/watchlistInput.ts`
- `apps/desktop/src/renderer/src/reminderInput.ts`

Core:

- `packages/core/src/domain.ts`
- `packages/core/src/index.ts`
- `packages/core/src/scoring.ts`
- `packages/core/src/portfolioRanker.ts`
- `packages/core/src/investmentIdea.ts`
- `packages/core/src/validation.ts`
- `packages/core/src/ids.ts`

UI package:

- `packages/ui/src/index.ts`
- `packages/ui/src/tokens.ts`
- `packages/ui/src/components/Button.tsx`
- `packages/ui/src/components/Badge.tsx`
- `packages/ui/src/components/Card.tsx`
- `packages/ui/src/components/PageHeader.tsx`

Tests:

- `packages/core/src/*.test.ts`
- `packages/ui/src/index.test.tsx`
- `apps/desktop/src/storage/*.test.ts`
- `apps/desktop/src/main/*StorageService.test.ts`
- `apps/desktop/src/renderer/src/*.test.tsx`
- `apps/desktop/src/renderer/src/*StorageClient.test.ts`

Relevant docs:

- `AGENTS.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/BACKLOG.md`
- `docs/DOMAIN_MODELS.md`
- `docs/MBS_SCORING.md`
- `docs/PORTFOLIO_RANKER.md`
- `docs/PERSISTENCE.md`
- `docs/PERSISTENCE_WIRING_PLAN.md`
- `docs/STORAGE_RUNTIME_VERIFICATION.md`
- `docs/WINDOWS_RELEASE.md`
- `docs/RELEASE_SMOKE_TEST.md`
- `docs/DEFINITION_OF_DONE.md`

## 6. Validation Commands

Run from the repository root:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd package:windows
pnpm.cmd verify:storage
pnpm.cmd dev
```

Expected packaging output:

```text
apps/desktop/release/windows/win-unpacked
```

Expected dev behavior:

- Electron opens as Thesis Investing.
- Onboarding appears if not completed.
- Sidebar loads after onboarding.
- All route buttons open without crashing.
- Safety note remains visible in the sidebar.

This regenerated handoff did not rerun the full validation suite. It focused on
recovering the handoff file content from current repo inspection.

## 7. Current Known Limitations

- `node:sqlite` is experimental.
- SQLite adapter has been verified through `pnpm verify:storage`, but adapter
  replacement remains possible behind repository interfaces.
- Portfolio Ranker inputs are not persisted on `main`.
- MBS Scorer drafts/snapshots are not persisted yet.
- Dashboard does not read persisted summaries yet.
- Theme Baskets are static local data.
- Onboarding completion uses `localStorage`, not SQLite.
- No code signing.
- No installer target; Windows packaging produces an unsigned unpacked app.
- No auto-update.
- No live stock APIs or price feeds.
- No earnings APIs.
- No system notifications or background scheduling.
- No AI analyst features.
- No brokerage import or trading execution.
- No Supabase/auth/cloud sync.
- Several docs still describe Stage 14 as the original Phase 1 endpoint even
  though later persistence stages 15-20 now exist.

## 8. Next Recommended Stage

Recommended next stage from clean `main`:

```text
Phase 1, Stage 21: Persist Portfolio Ranker Inputs
```

Important current-local caveat:

- This stage appears to have already been started locally on branch
  `claude/phase-1-stage-21-persisted-portfolio-ranker-inputs`.
- Do not overwrite or discard those uncommitted changes without first reviewing
  and protecting them.

### Why Portfolio Ranker should likely get its own repository/table

Do not force Portfolio Ranker rows into `holdings`.

Reasons:

- `Holding` in `packages/core/src/domain.ts` represents an owned or manually
  entered position and requires `shares`.
- The Portfolio Ranker screen currently supports research ideas, not just owned
  holdings.
- Ranker rows include `manualScore` and `notes`, which fit idea comparison
  better than holdings.
- Persisting ranker rows as holdings would imply ownership/portfolio semantics
  the screen does not currently have.
- The persistence plan already recommends a dedicated `portfolioRankerItems`
  repository/table or a named ranker snapshot repository.
- Recent `InvestmentIdea` core helpers may be useful, but there is no merged
  `InvestmentIdeaRepository` or schema table on `main`. Decide deliberately
  whether Stage 21 should persist minimal ranker rows or introduce an
  investment idea table. Keep scope small.

### Current Portfolio Ranker UI fields

Current row state in `apps/desktop/src/renderer/src/portfolioRankerInput.ts`:

```ts
type PortfolioRankerRowState = {
  id: string;
  ticker: string;
  companyName: string;
  manualScore: string;
  notes: string;
};
```

Current UI in `PortfolioRankerScreen.tsx`:

- default rows are derived from `mockTheses`
- users can add a row
- users can edit ticker, company name, manual score, notes
- users can remove a row
- users can clear entries back to default mock thesis rows
- search/filter controls are present but currently read-only/default-only
- ranking output is derived by `rankManualPortfolioItems()`

Core input type:

```ts
type ManualPortfolioRankerItemInput = {
  id: EntityId;
  ticker: TickerSymbol;
  companyName?: string;
  manualScore?: number;
  notes?: string;
};
```

Current ranking behavior:

- valid entries are ranked highest manual score first
- missing score means incomplete
- invalid ticker or out-of-range score means invalid
- deterministic tie behavior comes from `packages/core/src/portfolioRanker.ts`

### Files likely to change for Stage 21

Storage/domain:

- `packages/core/src/domain.ts`
- `packages/core/src/index.ts`
- `packages/core/src/validation.ts`
- maybe `packages/core/src/portfolioRanker.ts`
- `apps/desktop/src/storage/repositories.ts`
- `apps/desktop/src/storage/schema.ts`
- `apps/desktop/src/storage/sqliteRepositories.ts`
- `apps/desktop/src/storage/index.test.ts`

Electron boundary:

- add `apps/desktop/src/shared/portfolioRankerStorage.ts`
- add `apps/desktop/src/main/portfolioRankerIpc.ts`
- add `apps/desktop/src/main/portfolioRankerStorageService.ts`
- update `apps/desktop/src/main/main.ts`
- update `apps/desktop/src/preload/preload.ts`
- update the shared `ThesisInvestingApi` type, currently in
  `apps/desktop/src/shared/watchlistStorage.ts`

Renderer:

- add `apps/desktop/src/renderer/src/portfolioRankerStorageClient.ts`
- update `apps/desktop/src/renderer/src/PortfolioRankerScreen.tsx`
- possibly update `apps/desktop/src/renderer/src/portfolioRankerInput.ts`

Docs:

- `docs/PORTFOLIO_RANKER.md`
- `docs/PERSISTENCE.md`
- `docs/PERSISTENCE_WIRING_PLAN.md`
- `README.md` only if the high-level persisted workflow summary changes

### Tests to add for Stage 21

Recommended test coverage:

- core validation for any new persisted ranker item type
- migration/schema test for the new table
- repository CRUD test for ranker items
- repository validation failure test
- service test for list/save/remove
- renderer storage client mapping test
- Portfolio Ranker screen test with fake storage client:
  - loads persisted rows
  - saves added/edited rows
  - removes rows
  - shows storage errors without crashing
  - preserves form/row data on failed write
- confirm existing Watchlist, Thesis Notes, and Reminders persistence tests
  still pass
- confirm renderer does not import `node:sqlite`, `DatabaseSync`, or
  `createSqliteStorage`

### Stage 21 out of scope

Keep out of scope:

- MBS Scorer persistence
- Dashboard persisted summaries
- Holdings/owned-position workflows
- brokerage import
- trading execution
- live prices
- allocation advice
- recommendations to buy/sell/hold
- AI analysis
- Supabase/auth/cloud sync
- system notifications
- background jobs
- installer/code signing/autoupdate
- broad UI redesign

## 9. Safety And Product Guardrails

Keep these guardrails in every future task:

- Thesis Investing is educational software only.
- Do not present output as personalized financial advice.
- Do not add buy/sell/hold recommendations.
- Do not add allocation, position sizing, or model portfolio advice.
- Do not add brokerage integrations.
- Do not add trading execution.
- Do not add live stock APIs or earnings APIs until explicitly requested.
- Do not add AI analyst features until explicitly requested.
- Do not add Supabase/auth/cloud sync until explicitly requested.
- Do not hardcode API keys, secrets, tokens, or credentials.
- Keep scoring/domain logic in `packages/core`.
- Keep reusable UI in `packages/ui`.
- Keep SQLite/database access in Electron main process.
- Keep renderer access behind narrow preload/IPC clients.
- Prefer one stage per PR.
- Run validation before finishing a PR.

## 10. Claude Start Prompt

Paste this into Claude Code if starting from the current dirty local branch:

```text
We are continuing the Thesis Investing project.

Repository:
https://github.com/LichaWeComeThere/thesis-investing.git

Local project folder:
D:\Thesis Investing GitHub

Current local state:
- Branch: claude/phase-1-stage-21-persisted-portfolio-ranker-inputs
- HEAD: fbfe98f314fa56bc9c066045d854d13288d04f85
- origin/main: fbfe98f314fa56bc9c066045d854d13288d04f85
- There are uncommitted Stage 21 persistence changes in progress. Do not discard them.
- Watchlist, Thesis Notes, and Reminders are persisted through local SQLite using Electron main/preload/renderer boundaries.
- Portfolio Ranker / Thesis Rankings is implemented and appears to be the current in-progress persistence stage.
- MBS Scorer is implemented but not persisted yet.
- Dashboard is implemented but does not read persisted summaries yet.
- No live APIs, no AI analyst features, no brokerage/trading execution, and no Supabase/auth/cloud sync exist.

Before coding:
1. Read handoff/CLAUDE_REPO_HANDOFF_FROM_CODEX.md.
2. Run:
   git status
   git diff --stat
   pnpm.cmd verify:storage
3. Inspect the uncommitted Stage 21 changes before editing.

Task:
Safely continue or validate Phase 1, Stage 21: Persist Portfolio Ranker Inputs.

Important constraints:
- Keep scope limited to Portfolio Ranker input persistence only.
- Do not persist MBS Scorer yet.
- Do not make Dashboard read persisted summaries yet.
- Do not modify Watchlist, Thesis Notes, or Reminders persistence unless needed for shared storage safety.
- Do not use Holdings for ranker rows unless there is a very explicit reason. Holdings require shares and represent owned positions; ranker rows are manually scored research ideas.
- Prefer a dedicated portfolio ranker repository/table or a small named ranker snapshot repository.
- Keep SQLite access in Electron main. Renderer must use a narrow typed preload/IPC API.
- Do not import node:sqlite or raw storage helpers in renderer code.
- No live stock APIs, no AI analyst features, no brokerage/trading execution, no Supabase/auth/cloud sync, and no personalized financial advice.
- Do not redesign the UI.
- Open a new PR for this stage only after validation passes.

Useful files:
- apps/desktop/src/renderer/src/PortfolioRankerScreen.tsx
- apps/desktop/src/renderer/src/portfolioRankerInput.ts
- packages/core/src/portfolioRanker.ts
- packages/core/src/domain.ts
- apps/desktop/src/storage/repositories.ts
- apps/desktop/src/storage/schema.ts
- apps/desktop/src/storage/sqliteRepositories.ts
- apps/desktop/src/main/*StorageService.ts
- apps/desktop/src/main/*Ipc.ts
- apps/desktop/src/preload/preload.ts
- apps/desktop/src/shared/*
- docs/PERSISTENCE_WIRING_PLAN.md

Validation before finishing:
pnpm.cmd install --frozen-lockfile
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd package:windows
pnpm.cmd verify:storage
pnpm.cmd dev
```

