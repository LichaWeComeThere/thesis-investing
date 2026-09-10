# Phase 1 Issues

The following issue bodies are ready to copy into GitHub when labels and issue planning are ready. They intentionally avoid creating issues automatically because repository labels may not exist yet.

## Stage 1: App Navigation Shell

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 1: App navigation shell

## Goal

Create the desktop app structure users will move through as future MVP screens are added.

## Scope

- Add a stable app shell for top-level navigation.
- Define placeholder routes or views for the planned MVP areas.
- Keep navigation local to the desktop app.

## Out of scope

- Real portfolio, scoring, watchlist, or thesis workflows.
- Persistence, live data, sync, AI, or brokerage integrations.

## Acceptance criteria

- [ ] The desktop app launches with a clear navigation shell.
- [ ] Placeholder screens are intentionally minimal and non-advisory.
- [ ] Existing package boundaries remain intact.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 2: Design System

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 2: Design system

## Goal

Establish reusable visual foundations for the Offline Windows MVP.

## Scope

- Add shared UI tokens, component patterns, and reusable primitives in `packages/ui`.
- Keep components framework-compatible with the desktop React app.
- Document basic usage where helpful.

## Out of scope

- Product workflows or feature screens.
- Theme marketplaces, branding experiments, or mobile layouts.

## Acceptance criteria

- [ ] Reusable components live in `packages/ui`.
- [ ] Desktop app usage imports shared UI instead of duplicating component code.
- [ ] UI changes include screenshots in the pull request.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 3: Core Domain Models

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 3: Core domain models

## Goal

Define the deterministic TypeScript models that future offline workflows will share.

## Scope

- Add domain types for stocks, portfolios, holdings, watchlists, thesis notes, scores, theme baskets, and reminders.
- Keep domain logic in `packages/core`.
- Add tests for validation helpers or model utilities when applicable.

## Out of scope

- Database persistence.
- UI workflows.
- Live market data, recommendations, or trading execution.

## Acceptance criteria

- [ ] Shared domain models are exported from `packages/core`.
- [ ] Core types avoid desktop-specific or React-specific dependencies.
- [ ] Tests cover non-trivial helpers.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 4: SQLite Local Persistence

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 4: SQLite local persistence

## Goal

Add local-only persistence behind repository boundaries for future offline data.

## Scope

- Introduce SQLite infrastructure for the desktop app.
- Define storage or repository interfaces that keep persistence isolated.
- Add migration or schema organization appropriate for a small MVP.

## Out of scope

- Cloud sync, auth, Supabase, or account systems.
- Live data caching.
- UI feature workflows beyond persistence wiring needed for validation.

## Acceptance criteria

- [ ] Persistence code is isolated behind a storage/repository layer.
- [ ] Domain logic remains testable without SQLite.
- [ ] Tests cover repository or migration behavior where practical.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 5: MBS Scoring Engine

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 5: MBS scoring engine

## Goal

Implement the deterministic Manual Business Score scoring logic in `packages/core`.

## Scope

- Define the scoring inputs, outputs, weights, and calculation rules.
- Keep calculations pure and deterministic.
- Add tests for scoring boundaries and representative cases.

## Out of scope

- Live financial data imports.
- AI scoring, personalized recommendations, or brokerage actions.
- Full UI screens beyond minimal integration hooks if needed.

## Acceptance criteria

- [ ] MBS scoring logic is exported from `packages/core`.
- [ ] Scoring behavior is covered by tests.
- [ ] Scoring language remains educational and non-advisory.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 6: First-Run Onboarding

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 6: First-run onboarding

## Goal

Add first-run setup that frames the app as educational, offline, and user-directed.

## Scope

- Add local onboarding state.
- Present educational disclaimers and basic setup choices.
- Keep onboarding Windows desktop focused.

## Out of scope

- Auth, cloud accounts, sync, paid plans, or live integrations.
- Personalized financial advice or investment recommendations.

## Acceptance criteria

- [ ] New users see the onboarding flow once.
- [ ] Disclaimers clearly state the app is educational software, not financial advice.
- [ ] Onboarding choices remain local.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 7: Manual MBS Scorer Screen

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 7: Manual MBS Scorer screen

## Goal

Add the first user-facing workflow for manually entering scoring inputs.

## Scope

- Build a manual scorer screen using `packages/ui` components.
- Connect the screen to deterministic scoring logic in `packages/core`.
- Make clear that users provide their own inputs.

## Out of scope

- Live data lookups.
- AI analysis.
- Recommendations to buy, sell, or hold.

## Acceptance criteria

- [ ] Users can enter scoring inputs manually.
- [ ] The screen displays deterministic score output from `packages/core`.
- [ ] UI changes include screenshots in the pull request.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 8: Portfolio Ranker

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 8: Portfolio Ranker

## Goal

Let users rank manually entered holdings using local, deterministic criteria.

## Scope

- Add a local portfolio ranking workflow.
- Use manually entered holdings and existing scoring outputs.
- Keep ranking labels educational and user-directed.

## Out of scope

- Brokerage account import.
- Trade execution.
- Live prices, performance feeds, or personalized advice.

## Acceptance criteria

- [ ] Users can view a local rank ordering of entered holdings.
- [ ] Ranking inputs and outputs are deterministic.
- [ ] The interface avoids advice language.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 9: Thesis Monitor And Thesis Notes

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 9: Thesis Monitor and thesis notes

## Goal

Let users record and review the original thesis behind a holding or watchlist idea.

## Scope

- Add thesis note models and local editing workflows.
- Support user-defined thesis status or monitoring criteria.
- Keep notes local and user-authored.

## Out of scope

- AI-generated analyst commentary.
- Automated news monitoring.
- Live market event detection.

## Acceptance criteria

- [ ] Users can create and update local thesis notes.
- [ ] Thesis status is user-controlled and non-advisory.
- [ ] Core data structures remain reusable.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 10: Watchlist

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 10: Watchlist

## Goal

Add a local watchlist for manually tracked symbols or companies.

## Scope

- Add watchlist models, storage, and UI.
- Allow users to enter symbols or names manually.
- Keep watchlist items linked to local scoring and thesis data where appropriate.

## Out of scope

- Live quote feeds.
- Price alerts.
- Automated recommendations.

## Acceptance criteria

- [ ] Users can add, edit, and remove local watchlist items.
- [ ] Watchlist data persists locally.
- [ ] No live APIs are introduced.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 11: Static Theme Baskets

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 11: Static Theme Baskets

## Goal

Add static educational groupings that help users organize ideas by theme.

## Scope

- Define static theme basket data locally.
- Allow users to browse or reference baskets in the desktop app.
- Use non-advisory copy that frames baskets as educational organization aids.

## Out of scope

- Live basket updates.
- Personalized model portfolios.
- Buy lists, sell lists, or allocation advice.

## Acceptance criteria

- [ ] Theme baskets are static and versioned in the repository.
- [ ] Copy avoids recommendation language.
- [ ] The feature works offline.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 12: Dashboard

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 12: Dashboard

## Goal

Summarize local user-entered data in a useful offline dashboard.

## Scope

- Add a dashboard view over local portfolios, watchlists, scores, notes, and reminders.
- Keep summaries deterministic and based on local data.
- Reuse shared UI components.

## Out of scope

- Live performance metrics.
- Recommendations or personalized advice.
- Cloud dashboards or account sync.

## Acceptance criteria

- [ ] Dashboard cards summarize local data only.
- [ ] Empty states are clear and non-advisory.
- [ ] UI changes include screenshots in the pull request.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 13: Manual Earnings Reminders

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 13: Manual earnings reminders

## Goal

Let users create manual reminders for earnings or other thesis review dates.

## Scope

- Add reminder models, local storage, and desktop UI.
- Support manually entered reminder dates and notes.
- Keep reminder behavior local-first.

## Out of scope

- Live earnings calendars.
- Push notification services.
- Automated market event monitoring.

## Acceptance criteria

- [ ] Users can create, edit, complete, and delete local reminders.
- [ ] Reminder dates are manually entered.
- [ ] No external calendar or live data API is added.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~

## Stage 14: Windows MVP Release Build

~~~markdown
## Phase

Phase 1: Offline Windows MVP

## Stage

Stage 14: Windows MVP release build

## Goal

Prepare the offline MVP for a Windows release build.

## Scope

- Finalize Windows build configuration.
- Validate packaging output and installer or artifact behavior.
- Confirm documentation and disclaimers are current.

## Out of scope

- Mobile, iOS, web expansion, cloud services, or live integrations.
- Auto-update infrastructure unless explicitly planned.
- New product workflows.

## Acceptance criteria

- [ ] Windows build workflow can produce the expected artifact.
- [ ] Release documentation explains setup and limitations.
- [ ] Guardrails remain intact in app copy and docs.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
~~~
