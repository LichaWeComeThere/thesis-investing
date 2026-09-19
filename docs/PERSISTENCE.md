# Persistence

Phase 1, Stage 4 added the first local-only persistence boundary for the Offline Windows MVP.

The goal is to give desktop workflows a repository layer for offline data while keeping database access isolated from React renderer code.

Phase 1, Stages 18 through 23 complete the visible persistence rollout for Watchlist items, Thesis Notes, Reminders, Portfolio Ranker inputs, MBS Score Snapshots, and read-only Dashboard summary reads. Theme Baskets remain static local data, onboarding completion remains in renderer `localStorage`, and a small set of UI-only fields remain transient by design.

Phase 2, Stage 1 adds a read-only local data management/status view in Settings/About. It shows where the app data folder and SQLite database live, whether the local database file exists, which workflows are persisted, and which data remains transient or static.

Phase 2, Stage 2 adds a non-destructive local JSON export action in Settings/About. The export writes a user-selected `.json` file containing persisted Watchlist items, Thesis Notes, Reminders, Portfolio Ranker Inputs, and MBS Score Snapshots, plus metadata and counts. It does not add import, restore, reset/delete database actions, backup scheduling, cloud sync, or raw SQLite export.

Phase 2, Stage 3 adds a validated local JSON import for Stage 2 export files. File selection produces a read-only preview, and a separate confirmation appends records through existing repositories. ID collisions are remapped so existing records are never overwritten. Import does not replace the database, delete records, or act as a destructive restore.

Phase 2, Stage 4 hardens the user-facing safety guidance around local data transfer. Settings/About now explains that exports are manual JSON backups stored wherever the user chooses, import accepts Thesis Investing exports only, previews do not write workflow records, and confirmed imports append without overwriting or deleting existing records. This stage adds no new data actions, schema changes, or storage APIs.

Phase 2, Stage 5 adds read-only local data maintenance tools in Settings/About.
Users can refresh local data status, view persisted record counts, copy known
local data paths, and open the trusted app data folder. These tools are
non-destructive and do not add reset, delete, repair, overwrite, restore, or
schema-changing behavior.

Phase 2, Stage 6 completes closeout QA for the local data lifecycle. Automated
validation, route smoke testing, disposable SQLite lifecycle checks,
export/import validation, and export/import roundtrip testing are documented in
the [Phase 2 closeout](PHASE_2_CLOSEOUT.md).

Phase 3, Stage 3 adds the formal Living Thesis SQLite persistence foundation.
It stores current Living Thesis state plus normalized risk and catalyst
children behind a transactional repository.

Phase 3, Stage 4 adopts that repository in Thesis Board through narrow typed
renderer, preload, IPC, and Electron main APIs. Electron main generates opaque
UUIDs and canonical timestamps, creates version 1 aggregates, and submits
updates with the renderer's expected version. A successful save returns the
repository-incremented version; a stale save returns an explicit conflict and
the renderer retains its draft until the user chooses to reload saved state.

Phase 3, Stage 6 part 1 adds durable review session storage with independent
draft versions, original thesis baselines, restart recovery, and abandonment.
Part 2 connects guided review through typed IPC. Stage 6 completion now saves
the updated thesis, completed session, immutable revision, and optional linked
score in one transaction, with exact retry protection. Draft saves still leave
the current thesis unchanged. Migration 6 retains schema 1 sessions, while new
sessions and completions use schema 2. Format 4 backups include this history. See
[Review Session Storage](LIVING_THESIS_REVIEW_SESSION_STORAGE.md).

Phase 3, Stage 7 adds immutable documentary decisions for saved Living Theses,
including archived theses. A decision contains a title, reason, automatic save
date, and optional link to a completed review of the same thesis. Migration 7
adds the table; format 5 adds backup coverage. Saving a decision does not modify
the current thesis or a completed session. See
[Decision Log](LIVING_THESIS_DECISION_LOG.md).

Phase 3, Stage 8 adds a read-only History view over the saved thesis, completed
review sessions and revisions, decisions, and validated review-linked scores.
It adds no persisted timeline table, schema migration, or backup version.
Database migration 7 and export format 5 remain current. See
[Living Thesis History](LIVING_THESIS_HISTORY.md).

## Package Boundary

Local persistence currently lives in `apps/desktop/src/storage`.

- The storage module depends on `packages/core` domain types and validators.
- `packages/core` does not depend on storage, SQLite, Electron, React, or Node APIs.
- UI code should depend on narrow preload/IPC clients instead of raw SQLite details when persistence is wired into screens.
- The Watchlist, Thesis Monitor, Reminders, Portfolio Ranker, and MBS Scorer screens read and write through the local persistence boundary.
- The Dashboard reads local persisted summaries through the same main/preload/renderer boundary, but it does not write or delete records.
- The Settings/About local data status view reads app data path and database file status through a read-only main/preload/renderer boundary, and the local JSON export action reads persisted records through the same Electron main/storage boundary.
- The Settings/About maintenance view can refresh status and counts through the same read-only local data API. Counts cover persisted Watchlist items, Thesis Notes, Reminders, Portfolio Ranker Inputs, MBS Score Snapshots, Living Theses (including archived records), saved review sessions (including abandoned/completed records), thesis revisions, and saved decisions. Static Theme Library content is excluded.
- Thesis Board uses `window.thesisInvesting.livingTheses` for only `list`,
  `getById`, `create`, and expected-version `update`. No repository, raw SQL,
  database handle, filesystem method, or arbitrary path crosses preload.
- Decision Log uses `window.thesisInvesting.decisions` for `list`,
  `listCompletedReviews`, and `create`. The renderer supplies the title, reason,
  optional review link, and a stable UUID for retrying the same request. Electron
  main assigns the save timestamp and derives the stored ID and entry kind.
- History uses a narrow typed preload read operation for the selected thesis.
  Main reads its related records consistently and validates completed-review
  relationships before core derives the timeline and score comparisons. Reading
  History writes no thesis, session, decision, revision, or score records.
- The renderer can request a local JSON export through `window.thesisInvesting.localData.exportToJson()`, but the save dialog, SQLite reads, and file write happen in the Electron main process.
- The renderer can request import preview and confirmation through `window.thesisInvesting.localData.previewImportFromJson()` and `window.thesisInvesting.localData.importFromJson(previewId)`. Electron main owns file reading, parsing, validation, pending preview data, and transactional repository writes.
- The renderer can request `window.thesisInvesting.localData.openDataFolder()` without passing a path. Electron main opens only the trusted app data folder from `app.getPath('userData')`.
- Settings/About provides backup guidance and status messaging without bypassing or widening these existing preload APIs.

## SQLite Choice

The current adapter uses Node's built-in `node:sqlite` module.

This keeps the adapter dependency-free for the early Windows-first repo foundation and avoids adding native third-party SQLite bindings before packaging decisions are clearer. The module is still experimental in Node, so Electron runtime compatibility should be verified with `pnpm verify:storage` before release-facing changes.

The current adapter can create an in-memory database for tests or open a filename-backed SQLite database. Future Electron desktop work can decide the final user-data path, backup approach, and runtime packaging details.

## Adapter Boundary

`node:sqlite` is currently used only as the first local SQLite adapter. It is experimental, and support inside the target Electron runtime is verified through `pnpm verify:storage`.

The repository interfaces are intentionally the stable boundary. Future work can swap this SQLite adapter for another implementation if packaging, runtime support, or performance requirements make that the better choice.

For the Stage 17 Electron runtime check, see the [storage runtime verification guide](STORAGE_RUNTIME_VERIFICATION.md).

For the completed Phase 1 rollout, see the [archived persistence wiring plan](archive/phase-1/PERSISTENCE_WIRING_PLAN.md). It records historical implementation state; the current boundaries are described here and in the Living Thesis guides.

For the Settings/About maintenance controls, see [Local Data Maintenance](LOCAL_DATA_MAINTENANCE.md).

For the Phase 2 closeout QA record, see [Phase 2 Closeout](PHASE_2_CLOSEOUT.md).

## Schema And Migrations

Migrations are defined in `apps/desktop/src/storage/schema.ts`.

The initial schema creates:

- `holdings`
- `watchlist_items`
- `thesis_notes`
- `reminders`
- `schema_migrations`

Migration v2 (Phase 1 Stage 21) adds:

- `portfolio_ranker_items`

Migration v3 (Phase 1 Stage 22) adds:

- `mbs_score_snapshots`

Migration v4 (Phase 3 Stage 3) adds:

- `living_theses`
- `living_thesis_risks`
- `living_thesis_catalysts`

Risks and catalysts use stable IDs and restrictive foreign keys to their
parent thesis. Storage connections explicitly enable SQLite foreign-key
enforcement. The parent table stores no MBS value, snapshot pointer, health,
review priority, or historical workflow arrays.

Migration v5 (Phase 3 Stage 6 part 1) adds:

- `living_thesis_review_sessions`

Sessions reference a saved Living Thesis and store a validated workflow with its
original baseline. A partial unique index permits one in-progress review per
thesis. Session versions advance independently of the parent thesis version.

Migration v6 (Phase 3 Stage 6 completion) adds `living_thesis_revisions`,
completed-session metadata, and immutability checks. It preserves schema 1
sessions; new sessions and completed sessions use schema 2. Each completed
review has one immutable revision and an optional linked MBS snapshot, saved
with the thesis update in one transaction.

Migration v7 (Phase 3 Stage 7) adds `living_thesis_decisions`, using decision
schema version 1. Foreign keys and insert validation require a saved parent
thesis and, when linked, a completed review of that same thesis. The decision
date cannot precede the thesis or linked review. Update/delete triggers protect
saved entries. An index supports ordering by thesis, newest timestamp, then ID.
No fields or version counters on existing theses or sessions are rewritten.

The domain tables include local created/updated date columns where appropriate,
but repositories do not generate timestamps as side effects. Electron main
assigns timestamps for interactive writes; validated imports preserve saved
timestamps.

## Repositories

The storage module defines repository interfaces for:

- holdings
- watchlist items
- thesis notes
- reminders
- portfolio ranker items
- MBS score snapshots
- Living Theses with normalized current risk and catalyst children
- Living Thesis review sessions with immutable baselines and version-checked drafts
- immutable Living Thesis review revisions
- immutable Living Thesis decisions with optional completed-review links

Repository implementations validate core domain data before writing to SQLite and normalize ticker symbols consistently with `packages/core`.

Living Thesis creation and updates are aggregate transactions. New records
start at version 1. Updates require the stored expected version, increment it
once, and reject stale writes without partial parent or child changes. Reads
order children by creation timestamp then ID; lists order theses by updated
timestamp descending then ID. Existing children cannot be omitted from an
update and are retired by status rather than deleted. No Living Thesis
hard-delete API exists.

Direct Board saves update current state but do not append review revisions.
The existing revision repository records completed-review before/after changes
only. History therefore cannot reconstruct every direct edit or earlier
archive/unarchive cycle from the current thesis row. The creation date and
current `archivedAt` are limited markers, not an original-content snapshot or a
complete lifecycle event log.

The existing `mbs_score_snapshots.thesis_id` column is unchanged. Legacy values
are not inferred, migrated, or automatically reinterpreted. Stage 6 review
completion explicitly links its new snapshots to `LivingThesis.id`; their
completed session/revision references distinguish them from legacy values.
Scores remain canonical snapshots rather than fields duplicated on the thesis.

Stage 8 derives eligible score history only through validated completed-session
and revision links to the same snapshot and thesis. Equal `thesisId` strings or
tickers alone are insufficient: legacy scorer/import references remain
excluded. Eligible scores sort by `createdAt` descending, then snapshot ID
ascending; current, previous, and historical score changes all use that order.
The first score has no previous comparison, and a review that skips scoring
creates no score event or synthetic zero change.

Decision creation runs in a transaction and is idempotent for an exact request
retry: `decision_<request UUID>` identifies the saved result. Reusing that
request with different content is rejected. Repository reads order entries by
creation timestamp descending, then ID ascending. An archived parent remains
eligible for a documentary entry; no thesis version check is needed because
the entry does not change current state.

Current backups use format 5, including Living Theses, saved review sessions,
immutable thesis revisions, and `thesisDecisions`. Formats 1–4 remain readable
without inventing later record types or reinterpreting legacy MBS references.
Import validates the entire backup and completion/decision links, remaps
parent/session/revision/score/child/decision IDs together, and restores all nine record types
in one transaction. Internal append-only restore methods retain saved versions
and use savepoints without committing the outer import. See the
[export guide](LOCAL_DATA_EXPORT.md) and [import guide](LOCAL_DATA_IMPORT.md).
The derived History view is rebuilt from these records after restart or import;
it is not exported as a separate array or mutable cache.

## Out Of Scope

This persistence layer does not add:

- Incomplete MBS Scorer draft autosave
- Live market data or external dashboard summaries
- Dashboard write/delete behavior
- Named portfolio ranker snapshots or history
- Local data delete/reset actions
- Database restore/replacement, backup scheduling, or raw database export flows
- Destructive local data maintenance actions, database reset, repair, vacuum, or SQL console tools
- Semantic merge or duplicate detection beyond collision-safe ID remapping
- SQLite-backed local preferences
- Live stock APIs
- Cloud sync, Supabase, or auth
- AI analyst features
- Brokerage integrations or trading execution
- Personalized financial advice

Thesis Investing remains educational software only.
