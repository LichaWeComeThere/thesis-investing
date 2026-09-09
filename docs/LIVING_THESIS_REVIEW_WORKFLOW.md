# Living Thesis Review Workflow

Phase 3 Stage 5 implements the pure review workflow in
`packages/core/src/livingThesisReviewWorkflow.ts`. Its public types and helpers
are exported from `@thesis-investing/core`. This is the logic foundation for the
Stage 6 review screen and durable Review Sessions.

## State and ownership

Starting a review captures an independent copy of a valid saved `LivingThesis`
as `baseline`. Its `id` and `version` identify the thesis and the version being
reviewed. Tickers remain optional metadata. Archived records must be explicitly
unarchived before a review starts; draft, active, monitoring, and paused records
can be reviewed.

`draft` contains only editable current-state fields. Parent IDs, versions,
creation/update/archive timestamps, authoritative scores, and history are not
draft fields. Nested risks and catalysts retain their model-defined identities
and metadata. A caller creating a new child supplies its ID and timestamps;
core never reads the clock or generates IDs. Existing child timestamps remain
the baseline values until a future save operation assigns the actual changes'
timestamps.

The workflow also contains its active step, an ordered prefix of completed
steps, a trimmed free-form review reason, review notes, and a separate score
draft. It starts `in_progress` and can become `completed` or `abandoned`.
All editing and transition helpers reject either terminal state. Helpers return
new values and copy nested records and score input so caller-owned objects do
not mutate the captured baseline or another returned value.

These are typed domain helpers, not parsers for arbitrary JSON or IPC input.
Stage 6 must validate untrusted payload shapes before calling them and define
the durable session schema, session ID, timestamps, and any reason codes.

## Ordered steps

| Step | Confirmation rule |
| --- | --- |
| Start review | A nonblank review reason is required. |
| Review thesis summary and cases | Entity, title, summary, ticker, and optional case/theme fields satisfy current-model validation. |
| Review risks and catalysts | Children are valid, have unique IDs across both kinds, and reference this thesis. Existing children stay in their original kind; use `retired` instead of omitting them. |
| Review MBS score | Explicitly choose to skip a new score or provide all seven valid Manual Business Score factors. |
| Review assessment and schedule | Lifecycle, conviction, risk level, cadence, and calendar date satisfy current-model validation. |
| Preview changes | Revalidate the reason, all proposed fields, and score choice together. |
| Complete review | Require every preceding confirmation, valid content, and the same saved thesis ID and baseline version. |

`completeLivingThesisReviewWorkflowStep` accepts only the active step and cannot
perform the final completion. `completeLivingThesisReviewWorkflow` always calls
`validateLivingThesisReviewCompletion` itself and requires the current saved
thesis. A readiness check earlier in the interaction cannot bypass a later
version conflict.

## Editing and preview

`updateLivingThesisReviewSection` replaces one complete section, including
clearing omitted optional fields. It selects only that section's allowed keys.
Invalid intermediate text, child values, and score input may remain in a draft
while the user edits; they cannot pass their confirmation gates.

Changing an already reviewed section reopens that section and removes its and
all later confirmations. Changing the reason reopens Start review; changing the
score reopens the MBS step; changing notes invalidates the preview. If the
affected step has not been reached yet, editing does not jump forward.
Submitting the same values preserves progress. Returning to an earlier step
also invalidates that step and subsequent confirmations.

`getLivingThesisReviewPreview` provides independent `before` and `after` draft
copies, changed field names in a stable order, the reason, notes, and the score
choice. A review may conclude with no thesis edits and no new score; reviewing
unchanged evidence is valid. Completing a review may propose archival, but the
workflow does not assign an archival timestamp or modify the saved record.

## Scoring

The score draft is a discriminated union: `pending`, `skip`, or `score` with
`ManualBusinessScoreInput`. The initial state is `pending`, so skipping is an
explicit choice. `score` is checked with the existing `calculateMbsScore`
function: all seven factors must be present, finite, and between 0 and 10.
Zero-valued factors are valid. No factor is fabricated from an aggregate score,
and no snapshot is written or inferred from a ticker or legacy relationship.

## Stage 6 integration boundary

A core `completed` value is an in-memory result, not a committed Review Session.
The future main-process completion service must load the current thesis inside
the same transaction that checks the baseline version and performs all writes.
Only a successful transaction may be reported by the UI as saved completion.
On failure, keep the durable session in progress and retain its proposed edits.

That transaction must apply normalized current-state changes, assign parent and
changed-child timestamps and the next saved version, append the revision and
completed-session record, and create the linked MBS snapshot or explicit
decision entry when applicable. Bring forward the minimum history/link storage
needed for these writes in Stage 6; the later history and decision interfaces
can follow in their planned stages. Review scheduling policy and session
export/import coverage also belong to that persistence work.

Stage 5 adds no migrations, repository writes, IPC, renderer screen, backup
format, or live data integration. Existing Board saves and backup behavior
continue to use their current contracts.

## Verification

Tests exercise a complete review, invalid drafts, step-order bypass attempts,
explicit score skipping, incomplete/out-of-range factors, zero scores, child
retirement and relationships, preview invalidation, identity/version conflicts,
terminal workflows, metadata boundaries, and independence from caller mutation.
