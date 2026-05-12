# Issue Labels

These labels should be created manually in GitHub when repository label setup is ready. Suggested colors use GitHub's six-character hex format.

| Label | Purpose | Suggested color | When to use |
| --- | --- | --- | --- |
| `phase-0` | Tracks repository foundation and planning work. | `5319E7` | Use for setup, workflow, and planning tasks before product features. |
| `phase-1` | Tracks Offline Windows MVP work. | `1D76DB` | Use for local desktop MVP stages. |
| `phase-2` | Tracks live data and optional sync work. | `0E8A16` | Use only after live data or sync is explicitly in scope. |
| `phase-3` | Tracks research and intelligence layer work. | `FBCA04` | Use for research-oriented features after the MVP is stable. |
| `phase-4` | Tracks monetization, AI, backtesting, and platform expansion. | `B60205` | Use for future expansion work after earlier phases are complete. |
| `stage` | Marks a planned phase/stage task. | `C5DEF5` | Use for stage-sized issues and pull requests. |
| `docs` | Tracks documentation-only work. | `0075CA` | Use when the change primarily updates Markdown, templates, or planning docs. |
| `ui` | Tracks reusable interface and screen work. | `D4C5F9` | Use for React UI components, layout, and app screens. |
| `core` | Tracks domain logic and shared TypeScript code. | `0052CC` | Use for `packages/core` models, scoring, and pure utilities. |
| `desktop` | Tracks Electron desktop app work. | `5319E7` | Use for `apps/desktop` shell, main process, preload, and desktop integration. |
| `storage` | Tracks local persistence work. | `BFDADC` | Use for SQLite, repositories, migrations, and local data access. |
| `scoring` | Tracks MBS and related scoring logic. | `E99695` | Use for deterministic scoring rules, scoring tests, and score display work. |
| `testing` | Tracks test coverage or test infrastructure. | `C2E0C6` | Use for Vitest, CI validation, fixtures, and coverage work. |
| `ci` | Tracks GitHub Actions and automation. | `5319E7` | Use for workflows, build jobs, and repository automation. |
| `safety` | Tracks guardrails and risk controls. | `B60205` | Use for financial disclaimer, non-advisory copy, and no-trading safeguards. |
| `bug` | Tracks confirmed defects. | `D73A4A` | Use when behavior is broken or regressed. |
| `enhancement` | Tracks improvements that are not defects. | `A2EEEF` | Use for planned additions, refinements, and future feature work. |
| `blocked` | Marks work that cannot proceed yet. | `000000` | Use when a dependency, decision, credential, or prior stage is missing. |
