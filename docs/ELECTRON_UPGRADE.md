# Electron 44 upgrade

This focused follow-up to Phase 4 Stage 2A upgrades Electron from 36.9.5 to
**44.4.5**, the stable release verified on September 27, 2026. It does not enable
a live provider or change the app's interface, research schema, or backup format.

## Runtime and tooling

- Electron is pinned exactly in the desktop manifest and dependency lock.
  The release embeds Chromium 152.0.7977.130 and Node.js 24.21.0.
- Development requires Node.js 22.12 or later and pnpm 9.15.4. The existing Vite
  and packaging toolchain is retained; a broader toolchain update is separate.
- Electron 42+ downloads its binary on first CLI use instead of during package
  postinstall. The development script runs `install-electron` before
  `electron-vite dev`, because the existing launcher reads the installed binary
  path directly. First launch needs access to the Electron download service.
- Windows packaging remains x64. No Windows 32-bit build is introduced.
- Current main/preload calls remain supported. Existing synchronous
  `safeStorage` handling and ciphertext are retained, including rejection of
  unavailable encryption and Linux plaintext fallback. Key migration is not
  required.

One visible platform behavior changes: a native import dialog without an
explicit starting directory now starts in Downloads. Users can still choose any
supported backup file. This does not change import preview or data validation.

## Verification

Normal checks remain `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
The existing research tests include file-backed restart/export/import coverage.

Windows CI additionally runs the actual upgraded Electron before packaging:

1. `verifyStorageRuntime` exercises the existing SQLite repository checks using
   Electron's embedded Node runtime, including Living Thesis persistence.
2. `verify:desktop` loads the built renderer and real sandboxed preload, checks
   application rendering and allowed IPC, rejects IPC from an untrusted window,
   and exercises native encrypted key storage. It uses a temporary profile and
   synthetic records and removes that profile after the Electron process exits.

These checks must fail the Windows workflow on a runtime error; successful
packaging alone is not sufficient. No live provider calls or real API keys are
used. Linux environments without a supported credential backend cannot validate
Windows DPAPI and must not claim to do so.

## Remaining manual acceptance

Automated runtime verification supplements the previously deferred Windows
checks. Before a connected release, use the packaged Windows app to check normal
startup, all navigation, native import/export dialog selection and cancellation,
research restart/recovery, and key lifecycle through the forthcoming Settings UI.
The full human review of layout, keyboard behavior, and OS interactions remains
outstanding. Provider entitlement and retention rights remain separate Stage 2B
requirements.

## Official references

- [Electron 44.4.5 release](https://releases.electronjs.org/release/v44.4.5)
- [Supported release schedule](https://releases.electronjs.org/schedule)
- [Electron breaking changes](https://www.electronjs.org/docs/latest/breaking-changes)
- [Electron installation](https://www.electronjs.org/docs/latest/tutorial/installation)
- [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)

Check current support and release notes before future runtime updates. Keep
dependency updates isolated and preserve research/backup compatibility.
