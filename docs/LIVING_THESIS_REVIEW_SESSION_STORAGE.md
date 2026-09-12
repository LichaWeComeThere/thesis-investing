# Living Thesis Review Session Storage

Phase 3 Stage 6 implements durable drafts, guided review, and atomic completion.
The [guided UI](LIVING_THESIS_REVIEW_SESSION_UI.md) exposes this contract through
validated typed IPC. **Save draft** keeps progress for later. **Complete review**
applies the confirmed changes and records their history. Stage 7 adds a separate
[Decision Log](LIVING_THESIS_DECISION_LOG.md) with optional completed-review
links; completion never creates a decision automatically. Manual Windows UI
verification remains pending.

## Persisted contract

`LivingThesisReviewSession` has an ID, parent thesis ID, schema version,
independent positive save version, UTC start/update times, and the complete
core workflow. The workflow retains the original thesis snapshot and version,
editable draft, reason, notes, active/confirmed steps, and score choice.

New sessions use schema 2. Existing schema 1 `in_progress` and `abandoned`
sessions remain readable without rewriting their drafts; ordinary saves keep
their schema. Completion upgrades a schema 1 session to schema 2.

A completed session requires a valid terminal workflow, `completedAt` equal to
`updatedAt` and no earlier than `startedAt`, and a `revisionId`. A
`scoreSnapshotId` is required exactly when the review includes a new score.
Completion metadata cannot appear on unfinished or abandoned sessions.
Abandonment retains its final draft and matching terminal timestamp.

The parser validates unknown shapes before typed workflow validation. It
preserves unfinished text, dates, cadence, and finite partial/out-of-range
ratings in unconfirmed sections. Each section must be valid before confirmation.
Malformed shapes, unknown fields, unsupported enums, invalid identity or
timestamps, and inconsistent confirmed steps are rejected. Parsing returns an
independent JSON-compatible copy.

`LivingThesisRevision` schema 1 is immutable history: ID, thesis/session IDs,
completion time, full `before` and `after` thesis snapshots, and an optional
score reference. Its parser requires one version increment, preserved thesis
identity/creation time, valid snapshots, and stable child identity and kind.
Retained children keep their creation time; their update time changes only for
material content changes. New children receive the completion time. Baseline
children must be retained or retired rather than removed.

## SQLite and main-process boundary

Migration 5 introduced review draft storage. Migration 6 preserves those rows
while adding completed-session metadata and `living_thesis_revisions`. Foreign
keys retain parent/session/score relationships; unique constraints allow one
active session per thesis, one revision per session, and one revision per
resulting thesis version. Database triggers prevent updates/deletion of ended
sessions and revisions. No hard-delete method is exposed.

`createReviewSessionStorageService` supplies:

- `getActive(thesisId)`: read the current thesis and active session together,
  with `current`, `changed`, or `archived` baseline status.
- `start(thesisId)`: capture the current saved thesis and create a schema 2
  session. The repository rechecks the baseline inside its transaction. Archived
  theses cannot start a review; another active review must be resumed or abandoned.
- `saveDraft(id, workflow, expectedVersion)`: validate unknown input, retain
  owned metadata and the original baseline, and increment only the session
  version. Stale writes cannot replace newer draft progress.
- `resume(id)`: recover an unfinished session without replacing its baseline
  with newer parent research. Changed/archived parents remain explicitly flagged.
- `complete(id, workflow, expectedVersion)`: perform the transaction below and
  return the saved session, thesis, revision, and optional score snapshot.
- `abandon(id, expectedVersion)`: retain the terminal draft and timestamp with a
  version check, freeing the parent for another review. This remains a service
  operation; the guided UI does not expose an abandonment action.
- `close()`: release storage; reopening recovers persisted records.

Repository writes use `BEGIN IMMEDIATE` and nested savepoints so completion and
append-only backup import own the enclosing commit. Parent, original baseline,
and start time remain immutable. Update time cannot move backward. A child ID
has one parent and kind across current theses and historical/draft snapshots.

## Atomic completion and retry

The main service owns generated IDs and completion metadata; IPC supplies only
the session ID, proposed workflow, and expected draft version. A single
transaction:

1. Reloads the saved session and parent, rejects a replaced baseline, and checks
   the session version, parent identity/version, archived state, ordered
   confirmations, and complete content.
2. Builds the canonical updated thesis in core, preserving identity and
   creation metadata and advancing its version once. The chosen schedule is
   retained; no automatic review date or decision is generated.
3. Creates a linked MBS snapshot only when all seven new ratings are complete.
   Historical score dates remain supported; review scores use the exact UTC
   completion time. Skipping a new score creates no score record.
4. Saves the current thesis, marks the session complete, and appends the
   immutable before/after revision with matching references and timestamps.

Any failed write rolls back every write in this operation. The previous saved
draft remains intact; the renderer retains unsaved edits after a rejected
completion. A changed or archived thesis cannot be silently overwritten.

If a response is lost after commit, the renderer retains the exact submitted
workflow and version and pauses editing. Retrying that request returns the
already saved result when its terminal workflow and previous version match;
it creates no second revision, score, or version increment. A different request
cannot revise an ended review. Normal save/resume operations also reject ended
sessions.

## Backups

Stage 6 introduced format 4 with review history. Current exports use format 5
with nine record arrays and matching counts:
`watchlistItems`, `thesisNotes`, `reminders`, `portfolioRankerItems`,
`mbsScoreSnapshots`, `livingTheses`, `reviewSessions`, `thesisRevisions`, and
`thesisDecisions`. Export reads them in one transaction. Settings includes
review, revision, and decision counts. Formats 1–4 retain their historical shapes and normalize absent later
record types to empty arrays after validation. New record types in older
formats are rejected instead of silently omitted.

Every session requires its parent in the same backup. Each completed session
requires its matching revision and any chosen score snapshot. Before/after
snapshots, computed score, references, timestamps, and resulting versions must
agree; duplicate transitions and orphaned history are rejected. Older/stale
baselines remain preserved and are flagged when an unfinished review resumes.

Import reserves incoming IDs before allocating collision suffixes. Separate
maps cover parents, sessions, revisions, scores, and decisions; one shared child map covers
current, baseline, draft, and revision snapshots. Every reference is remapped
consistently. Explicitly linked review scores use the Living Thesis map;
legacy score references retain their existing Thesis Note remapping behavior.
Parents, scores, sessions, revisions, and decisions restore in dependency order within one
append-only transaction. A later failure rolls back the full import and leaves
its preview retryable. See [Export](LOCAL_DATA_EXPORT.md) and
[Import](LOCAL_DATA_IMPORT.md) for user-facing backup guidance.

## Verification and next stage

Core tests cover schema compatibility, malformed/partial drafts, terminal
metadata, canonical revisions, child identity/timestamps, and legacy date/UTC
score compatibility. Storage and app integration coverage includes restart,
stale versions, forged baselines, duplicate requests, exact retry, immutable
history, migration, and rollback after failed writes. Backup coverage includes
formats 1–5, completed-review and decision links, collision remapping, and import rollback.

Stage 6 implementation is complete. Manual Windows UI/installer testing remains
deferred; automated packaging does not establish interactive behavior. Stage 7
adds explicit, separate Decision Log entries without rewriting completed
sessions. A history/timeline browsing interface remains Stage 8 work.
