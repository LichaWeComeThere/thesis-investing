# Release Smoke Test

Use this checklist before sharing a Windows MVP artifact. Thesis Investing is educational software only. It does not provide personalized financial advice, connect to brokerage accounts, execute trades, use live stock APIs, use AI analyst features, or sync to cloud services.

## Update Local Main

From the repository root:

```bash
git checkout main
git pull --ff-only origin main
```

## Install Dependencies

```bash
pnpm install --frozen-lockfile
```

## Run The Development App

```bash
pnpm dev
```

Expected result:

- Electron opens successfully.
- The visible app brand is Thesis Investing.
- First-run onboarding or the main app shell appears.
- The sidebar loads after onboarding is complete.

## Package Windows Locally

```bash
pnpm package:windows
```

Expected output folder:

```text
apps/desktop/release/windows/win-unpacked
```

Run the unpacked executable:

```text
apps/desktop/release/windows/win-unpacked/Thesis Investing.exe
```

The packaged app should open as Thesis Investing. This is an unsigned unpacked app folder, not an installer.

## Download The GitHub Actions Artifact

1. Open the repository on GitHub.
2. Go to the Actions tab.
3. Select the Windows Build workflow.
4. Open the latest successful run for the commit or branch you want to test.
5. In the Artifacts section, download `thesis-investing-windows-unpacked`.
6. Unzip the downloaded artifact.
7. Open the unzipped folder.
8. Run `Thesis Investing.exe`.

Windows may warn that the publisher is unknown because the MVP artifact is not code signed yet.

## Manual Route Checklist

After opening either the development app or the unpacked artifact, complete onboarding if prompted, then verify:

- [ ] App title or visible brand is Thesis Investing.
- [ ] Dashboard opens from the sidebar.
- [ ] MBS Scorer opens from the sidebar.
- [ ] Portfolio Ranker opens from the sidebar.
- [ ] Thesis Monitor opens from the sidebar.
- [ ] Watchlist opens from the sidebar.
- [ ] Theme Baskets opens from the sidebar.
- [ ] Reminders opens from the sidebar.
- [ ] Settings/About opens from the sidebar.
- [ ] Non-advisory safety note is visible.
- [ ] No screen presents buy, sell, or hold recommendations.
- [ ] No screen offers brokerage connection or trading execution.

## Command Checklist

Run these from the repository root before marking the artifact ready for review:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm package:windows
pnpm dev
```

## Release Limitations

- The Windows artifact is an unsigned unpacked app folder only.
- There is no installer yet.
- Windows may warn about an unknown publisher.
- Code signing is not configured yet.
- Auto-update is not configured yet.
- Several workflows still use local React state and are not fully persisted yet.
- No live stock APIs or price feeds are included.
- No brokerage import or trading execution is included.
- No AI analyst features are included.
- No Supabase/auth/cloud sync is included.
- The app remains educational and non-advisory.
