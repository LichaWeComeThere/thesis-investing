# AGENTS.md

Guidance for future Codex tasks in this repository:

- Keep changes small, staged, and aligned to the current phase.
- Run lint, typecheck, tests, and build before finishing when the tooling is available.
- Never add brokerage integrations or trading execution.
- Never hardcode API keys, secrets, tokens, or credentials.
- Keep scoring and domain logic in `packages/core`.
- Keep UI components reusable and shared from `packages/ui`.
- Use pull requests for each phase or stage of work.
- Do not add live stock APIs, Supabase/auth/cloud sync, AI analyst features, or mobile/iOS work until explicitly requested.
