# Thesis Library

Phase 3 Stage 11 adds a full saved catalog inside **Theses**. It uses the same
Living Thesis records as the editing workspace and Overview's review queue.

## Navigation

- **Browse library** opens the catalog from the thesis workspace.
- **Open thesis** loads the selected ID and focuses its company heading.
- **View history** loads that same thesis and focuses its existing History section.
- **Back to workspace** returns to the last selected saved thesis.
- **New thesis** opens a blank creation form. Browsing and entering this form do
  not create a database record; an explicit save is still required.

Search, status, and sort choices survive opening a thesis and returning to the
catalog during the same visit to Theses. Leaving the sidebar destination resets
these temporary browsing choices. No user data or preference is written by browsing.

The workspace's existing Save, Discard, and Continue editing flow protects an
edited thesis before opening the Library. Decision entry protections also remain
in force. Guided reviews retain their existing Return to theses flow and draft
protection. A sidebar navigation request takes precedence over an internal view
change, so canceling it cannot cause a later unexpected jump to the Library.

Requested records are loaded from storage when opened. If an ID has disappeared,
the workspace reports it instead of silently selecting another thesis. History
retains its existing loading, validation, error, and retry behavior. Overview
queue links continue to enter the exact thesis or saved review directly.

## Catalog

The catalog includes every saved lifecycle: draft, active, monitoring, paused,
and archived. Search covers company name, ticker, thesis title, summary, and
theme. A status filter narrows the catalog without changing records. Available
sorts are recently updated, company name, and next review date.

Each row shows saved context and provides separate thesis and history actions.
Dates are descriptive; the Library does not rank investments or invent review
dates. Archived and paused theses remain browsable. Existing review eligibility
rules still apply when they are opened in the workspace.

The list is read on entry and can be refreshed. Loading, unavailable storage,
empty catalog, no search matches, and failed reads have distinct messages. A
failed refresh cannot pass stale rows off as current actionable results.

## Architecture and scope

`ThesesWorkspace` coordinates the catalog and existing Board. `ThesisLibraryScreen`
uses the existing `livingTheses.list()` client. No database schema, main/preload
API, migration, dependency, or backup format is added. Format 5 backups already
contain all records shown here. The Library introduces no automatic archiving,
deletion, review, score, or decision writes.

History access exposes the existing saved record history. Direct edits are not
retroactively turned into revisions; the Stage 8 history limitations still apply.

## Verification

Automated coverage includes catalog filtering and error recovery, exact thesis
and history selection, retained browsing choices, new-thesis entry, and guarded
navigation. Browser checks use only fictional records in the isolated preview.
`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed. The 14 new
catalog and navigation tests also pass as a focused run, including decision-entry
protection and the delayed new-thesis load regression.

Browser verification covered retained search/status/sort choices, exact History
focus, Save and leave updating the catalog, archived filtering, blank new-thesis
entry, and keyboard access at desktop and 860 × 560 window sizes.

- [Desktop Library](screenshots/thesis-library-desktop.jpg)
- [Compact Library with keyboard focus](screenshots/thesis-library-small.jpg)

Hands-on Windows interaction remains deferred. GitHub CI and Windows Build
results are recorded in the pull request.
