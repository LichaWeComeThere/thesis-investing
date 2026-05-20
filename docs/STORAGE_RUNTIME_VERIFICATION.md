# Storage Runtime Verification

Phase 1, Stage 17 verifies that the current local SQLite adapter can initialize inside the Electron runtime before any visible MVP screen is wired to persistence.

Thesis Investing remains offline educational software. This verification does not add live stock APIs, AI analyst features, brokerage integrations, trading execution, Supabase/auth, cloud sync, or personalized financial advice.

## What It Verifies

The runtime verification runs a small storage smoke test through the existing repository boundary:

- Start Electron without opening a visible app window.
- Create an isolated in-memory SQLite storage instance.
- Run the existing migrations.
- Create, read, update, and delete one temporary watchlist record through `watchlistItems`.
- Close the in-memory storage connection.

The verifier uses `createSqliteStorage()` and repository methods. It does not import raw SQLite into React renderer code.

The desktop app currently uses Electron `36.9.5` so the Electron main process includes a Node runtime with `node:sqlite` available.

## How To Run It

From the repository root:

```bash
pnpm verify:storage
```

The script builds the Electron app and then runs:

```bash
electron ./out/main/verifyStorageRuntime.js
```

from `apps/desktop`.

## Data Safety

The verification uses an in-memory database only.

It does not:

- Open or create a user database file.
- Read real user data.
- Write real user data.
- Persist anything after the process exits.
- Wire storage into visible screens.

## Current Limitations

- The adapter still uses experimental `node:sqlite`.
- The verifier confirms Electron runtime initialization for the unpackaged development build path.
- `pnpm package:windows` should still be run before release-facing changes, but packaging alone does not mean visible screens are ready to use SQLite.
- Full renderer-to-main storage IPC is still future work.

## Gate Before Stage 18+

Before wiring persistence into Watchlist, Thesis Monitor, Reminders, Portfolio Ranker, MBS Scorer, or Dashboard, the following should pass:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm package:windows
pnpm verify:storage
pnpm dev
```

If `pnpm verify:storage` fails because `node:sqlite` is not supported in the target Electron runtime, swap the SQLite adapter behind the existing repository interfaces before wiring any user-visible persistence.
