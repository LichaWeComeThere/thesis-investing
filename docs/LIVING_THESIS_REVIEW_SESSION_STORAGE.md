# Living Thesis Review Session Storage

Phase 3 Stage 6, part 1 adds durable unfinished reviews. It implements storage
and backup support, with no review screen or renderer IPC yet. A draft save
never changes the current thesis or creates a revision, score, or decision.

## Persisted contract

`LivingThesisReviewSession` in core has an ID, parent thesis ID, schema version
1, independent positive save version, UTC start/update times, optional
abandonment time, and the complete Stage 5 workflow. The workflow retains the
original thesis snapshot and version, editable draft, reason, notes, active
step, confirmed steps, and pending/skipped/partial score choice.

The parser checks unknown input before calling typed workflow validators. It
preserves unfinished text, calendar dates, cadence, and finite score inputs in
unconfirmed sections, including blank fields and out-of-range values. These
must satisfy the existing step validators before confirmation. Non-finite
numbers, malformed shapes, unknown fields, unsupported enums, invalid identity
or timestamps, and inconsistent confirmed steps are rejected. Successful
parsing returns an independent JSON-compatible copy.

Session schema 1 persists only `in_progress` and `abandoned`. A core workflow
marked `completed` cannot be saved through this storage contract. Completion
needs a later schema extension and the atomic transaction described in the
[review workflow](LIVING_THESIS_REVIEW_WORKFLOW.md).

## SQLite and main-process boundary

Migration 5 adds `living_thesis_review_sessions`, with a parent foreign key,
independent optimistic save version, JSON workflow, and a partial unique index
allowing one in-progress session per thesis. Existing schema 4 records remain
intact. Session reads are deterministic by update time descending then ID.

`createReviewSessionStorageService` supplies:

- `start(thesisId)`: load the saved thesis, generate a session ID and timestamps,
  then recheck its baseline inside the creation transaction. Archived theses
  cannot start a review; an existing active review must be resumed or abandoned.
- `saveDraft(id, workflow, expectedVersion)`: validate unknown workflow input,
  retain owned metadata and the original baseline, and increment only the
  session version. Stale saves cannot overwrite newer draft progress.
- `resume(id)`: read the session and current thesis in one transaction, returning
  `current`, `changed`, or `archived` baseline status. Changed/archived parents
  do not erase draft research or silently rebase it.
- `abandon(id, expectedVersion)`: preserve the terminal draft and timestamp with
  a version check, freeing the parent for another review. Abandoned sessions
  cannot resume or be edited.
- `close()`: release storage; reopening can recover the saved session.

Repository creation/update uses `BEGIN IMMEDIATE`. Append-only restore uses a
savepoint so an enclosing backup import can roll back all writes. Parent,
baseline, schema, and start time are immutable; update time cannot move backward.
Risk/catalyst IDs retain one parent and kind across current records and stored
review baselines/drafts, including draft-only children. No hard-delete method
is exposed. Main storage failures return safe retry messages.

Draft persistence is explicit, not automatic capture of unsaved Board fields.
The later UI must call the service through a narrow validated IPC contract,
show save failures, and require conflict resolution before final completion.

## Backups

New exports use format 3 with seven record arrays and counts, adding
`reviewSessions` to the existing five legacy types and `livingTheses`. Export
reads all included records inside one database transaction. Settings shows
saved review counts, including abandoned records.

Historical format 1 and 2 documents remain readable with their original shapes;
missing later record types normalize to empty arrays after validation. Older
formats carrying newer arrays/counts are rejected to prevent silent omission.
Format 3 requires a review array and matching count even when empty.

Every session requires its parent in the same backup. Baselines cannot be ahead
of that parent; equal versions must describe the same saved state. A stale
baseline is preserved and flagged on resume. Baseline children must still be
owned by that parent. At most one active review per source parent is allowed.

Import reserves all incoming IDs before allocating suffixes. Parent and session
IDs get separate maps; one shared child map covers current theses and all
baseline/draft children. Existing draft-only child IDs also participate in
collision detection. Every reference is remapped consistently. Parents are
restored before sessions within the same append-only import transaction. A
later failure rolls back the entire import and leaves the preview retryable.

## Verification and remaining work

Core tests cover malformed input, independent copies, partial edits, confirmed
progress, child identity, and terminal timestamps. SQLite integration tests
cover file restart/recovery, two-connection conflicts and duplicate starts,
changed/archived parents, abandonment, schema 4 upgrades, ID reservation,
format 1/2 compatibility, format 3 file round trips, stale baseline recovery,
and full import rollback after an injected later-session failure.

Remaining Stage 6 work is the review screen and typed IPC, followed by atomic
completion with the minimum revision and linked-score storage. Manual Windows
UI/installer testing remains deferred; automated Windows packaging does not
establish interactive behavior.
