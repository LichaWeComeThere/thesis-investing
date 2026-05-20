# Windows Release Prep

Phase 1, Stage 14 prepares Thesis Investing for a simple Windows-first MVP build flow. The app is still offline, educational software. It does not use live stock APIs, AI analyst features, brokerage connections, trading execution, Supabase/auth, or cloud sync.

## Developer Setup

Clone the repository and install dependencies from the repo root:

```bash
git clone https://github.com/LichaWeComeThere/thesis-investing.git
cd thesis-investing
pnpm install --frozen-lockfile
```

Run the Electron development app:

```bash
pnpm dev
```

The app should open as Thesis Investing and show the first-run onboarding or the main desktop shell.

## Build

Build all workspaces:

```bash
pnpm build
```

This compiles the shared packages and produces the Electron/Vite output for the desktop app.

## Package Windows

Create an unsigned unpacked Windows build:

```bash
pnpm package:windows
```

The package command uses `electron-builder` with a conservative `dir` target. It creates an unpacked x64 Windows app folder under:

```text
apps/desktop/release/windows/win-unpacked
```

This is intended as an MVP validation artifact, not a signed installer.

Executable signing and Windows resource editing are disabled for this early artifact so local packaging can run without code-signing certificates or symlink privileges for `electron-builder` signing helpers. A later release stage should revisit installer metadata, icons, and signing.

## GitHub Actions

The `Windows Build` workflow runs on Windows, installs dependencies with the frozen lockfile, builds the workspaces, packages the unpacked Windows app, and uploads the unpacked app folder as a workflow artifact named `thesis-investing-windows-unpacked`.

## Release Readiness Checklist

- [ ] `pnpm install --frozen-lockfile` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm dev` opens Electron as Thesis Investing.
- [ ] Dashboard opens from the sidebar.
- [ ] MBS Scorer opens from the sidebar.
- [ ] Portfolio Ranker opens from the sidebar.
- [ ] Thesis Monitor opens from the sidebar.
- [ ] Watchlist opens from the sidebar.
- [ ] Theme Baskets opens from the sidebar.
- [ ] Reminders opens from the sidebar.
- [ ] Settings/About opens from the sidebar.
- [ ] No live APIs, trading execution, brokerage integration, AI analyst behavior, sync, or personalized financial advice behavior is present.
- [ ] Windows package artifact is produced or the package limitation is documented.

## Known Limitations

- Windows builds are not code signed yet.
- No installer target is configured yet; Stage 14 produces an unpacked app folder.
- Windows executable metadata and icons are not finalized yet.
- No auto-update flow exists yet.
- Several MVP workflows still use local React state and are not fully persisted through SQLite.
- Storage uses the existing local boundary, but broad app-wide persistence wiring is intentionally out of scope.
- No live APIs, AI analyst features, brokerage connections, trading execution, Supabase/auth, or cloud sync are included.
