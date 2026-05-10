# Codex Workflow

Codex work should keep the project disciplined, reviewable, and aligned to the current phase.

## Pull Request Discipline

- Use one stage per pull request.
- Keep changes small and scoped to the stated stage.
- Update docs when behavior, architecture, or workflow expectations change.
- Include screenshots only when UI changes.
- Always summarize known limitations in the PR description.

## Validation

Run these commands before finishing a stage:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Never skip tests. If a command cannot be run, explain exactly why in the PR description and final summary.

## Safety Rules

- Never hardcode secrets, API keys, tokens, or credentials.
- Never add brokerage integrations or trading execution.
- Never add live stock APIs, Supabase/auth/cloud sync, or AI analyst features unless the current stage explicitly calls for them.
- Keep scoring logic deterministic, testable, and located in `packages/core`.
- Keep UI components reusable and located in `packages/ui` when they are shared.
