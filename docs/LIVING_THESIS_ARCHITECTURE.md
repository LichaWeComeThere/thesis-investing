# Living Thesis OS Architecture

## Status

This document began as the Phase 3 Stage 1 architecture plan. Phase 3 Stage 0
reconciled the renderer prototype and its data-provenance labels. Phase 3 Stage
2 now implements the framework-independent `LivingThesis` current-state model,
structured risk and catalyst types, and validation in `packages/core`.
Phase 3 Stage 3 adds the SQLite persistence foundation for that current-state
aggregate. Phase 3 Stage 4 connects Thesis Board to that repository through
narrow typed main, IPC, preload, and renderer boundaries.
Phase 3 Stage 5 adds the pure review workflow, proposed-edit preview, and
guarded completion validation in core. Stage 6 part 1 adds durable review session
storage and backup support. Part 2 adds the guided review UI and typed IPC.
Stage 6 implements explicit atomic completion, immutable before/after revisions,
optional linked scores, and history backups. Stage 7 adds the append-only
Decision Log, optional links to completed reviews, and format 5 backup coverage.
Stage 8 adds the read-only History card with completed reviews, decisions, and
validated review-linked scores. Manual Windows UI verification remains pending;
Thesis Health Engine is the next separate Stage 9 task. See [Review Session Storage](LIVING_THESIS_REVIEW_SESSION_STORAGE.md),
[Guided Review UI](LIVING_THESIS_REVIEW_SESSION_UI.md), and
[Decision Log](LIVING_THESIS_DECISION_LOG.md), plus the
[History contract](LIVING_THESIS_HISTORY.md).

Sections describing later entities and workflows remain architectural plans,
not claims that those features are implemented.

The original plan was based on `main` at
`46fe0b65a248b449f5246f266ea96e4758af94b7` and on a read-only review of the
preserved `feature/review-workflow` and `feature/thesis-board-adopt-model`
branches. Those branches are reference material, not code selected for merge.

## Goals

The Living Thesis OS should let a user maintain a thesis as an evolving local
research record while preserving the evidence of how it changed. It should:

- provide one stable current record for each thesis;
- preserve reviews, scores, decisions, and material edits as history;
- support multiple theses for the same ticker without conflating identity;
- reuse the existing deterministic MBS scorer and score snapshots;
- keep all persistence local and behind the Electron boundary;
- make every health and review-priority result deterministic and explainable;
- remain educational and analytical, without trade instructions or advice.

This plan does not add live data, cloud sync, authentication, AI, brokerage
connectivity, trading execution, or a recommendation engine.

The five logical decisions required before the shared model are locked in
[Living Thesis Shared-Model Decisions](LIVING_THESIS_MODEL_DECISIONS.md).

## Current-State Audit

### Current thesis concepts

The application currently has three different thesis-shaped concepts. They
must not be treated as one source of truth.

| Concept | Current role | Persistence | Architectural disposition |
| --- | --- | --- | --- |
| `ThesisNote` | User-authored title, body, status, conviction, ticker, and review date | SQLite | Keep as an existing workflow. Do not silently convert notes into Living Thesis records. Provide an explicit link or creation flow later. |
| `InvestmentIdea` | Early core aggregation and mapping helpers for notes, ranker input, and MBS input | Not wired as a persisted aggregate | Treat as a predecessor/reference type. Do not extend it into the formal model without first defining migration and deprecation semantics. |
| Renderer `MockThesis` | Eight shared demo records used by Dashboard, MBS Scorer, Portfolio Ranker, Thesis Monitor, Watchlist, and Reminders | React memory only | Retain as clearly named demo fixtures for screens that have not adopted formal Living Thesis data. Never import them as user data automatically. |

The current `MockThesis` includes identity, ticker/company, theme, idea and
thesis status, current and previous MBS score, conviction, risk level, thesis
summary, bull/bear cases, risks, catalysts, review dates, review triggers, and a
small decision-log-like array. Dashboard health and review priority are derived
from those mock fields using a fixed demo date. None of those renderer values is
formal persisted Living Thesis intelligence.

### Current workflow relationships

- Dashboard has a real SQLite summary section and separate demo thesis
  analytics.
- MBS Scorer persists completed `MbsScoreSnapshot` records. Its selected demo
  thesis and current/previous mock score remain in renderer memory.
- Portfolio Ranker persists independent ranker rows. Mock thesis status,
  conviction, risk, and score-change context is presentation data.
- Thesis Monitor persists `ThesisNote` records and uses demo theses only as an
  empty-state preview.
- Watchlist persists `WatchlistItem` records and displays separate demo thesis
  context.
- Reminders persists `Reminder` records and displays separate demo review
  dates.
- Thesis Board lists, creates, and updates formal persisted Living Thesis
  current state. It no longer reads `MockThesis` in production and does not
  seed fixtures into SQLite.

### Existing MBS relationship ambiguity

`MbsScoreSnapshot` already has an optional `thesisId`, but there is no persisted
Living Thesis repository. The Phase 2 version 1 importer currently remaps that
field through imported Thesis Note IDs, while the MBS Scorer may write a
renderer `MockThesis` ID. These are legacy references, not formal Living Thesis
links. For formal code, the retained `thesisId` field has one future meaning: a
stable `LivingThesis.id`. Legacy values must not be silently inferred into that
relationship from ticker, a Thesis Note ID, or a coincidentally matching
string.

## Preserved Branch Assessment

### `feature/review-workflow`

The preserved branch contains two prototype commits:

- `a48026d74d74d661280d31bc543202268c4d31f9` adds a shared `LivingThesis`
  model.
- `b9ba5aba987c11b0c93c22b0dfda7d63075ff337` adds a pure review-workflow
  state machine and four tests.

Useful concepts include lower-case domain enums, ordered review steps,
immutable workflow transitions, an explicit review reason, a score draft, and
a completion-readiness check. These should inform later stages.

The branch should not be merged unchanged because:

- decision, score, and review histories are embedded as arrays in the current
  thesis aggregate;
- current, previous, and changed MBS scores are duplicated inside the thesis;
- health and review status are stored as facts even though they should normally
  be derived;
- the workflow has no session ID, baseline revision, persistence contract, or
  atomic completion result;
- calling the completion transition is not itself guarded by the readiness
  predicate;
- the example record is exported from the core production module;
- no repository, import/export, or current Stage 0 UI assumptions are covered.

Recommendation: adapt the vocabulary and pure transition approach during the
Shared Living Thesis Model and Review Workflow stages. Reimplement against the
approved model rather than cherry-picking the branch wholesale.

### `feature/thesis-board-adopt-model`

This preserved branch also contains two prototype commits:

- `ba7eb306848ff330a6ba000aa3b6e8b62e7566c7` adds the same proposed model
  under a different commit.
- `4d8dd622d0b011b50a876eb7f992c728b12a8e1c` adapts the older Thesis Board
  and mock data to that model.

The adapter demonstrates a useful transition pattern: normalize a source model
before mapping it into a board-specific view model. The implementation should
not be reused directly because it predates Stage 0 UI/provenance work, fabricates
identical category scores from an overall score, synthesizes sector and history
records, and accepts a union of formal and mock domain types in production UI.
It has no focused test update for the adapter.

Recommendation: preserve as reference only. Reimplement the adapter after the
formal model and repository client exist, while retaining the current Board UI
and Stage 0 provenance behavior.

## Terminology

The architecture uses these terms consistently:

- **Living Thesis**: the user's current, persisted thesis record.
- **Lifecycle status**: a user-controlled record state: `draft`, `active`,
  `monitoring`, `paused`, or `archived`.
- **Thesis health**: a deterministic assessment derived from local evidence,
  not a recommendation and not the lifecycle status.
- **Review state**: a derived scheduling state such as current, due soon,
  overdue, or in review.
- **Review Session**: a persisted draft and eventual immutable completion
  record for one structured review.
- **Decision Log entry**: an append-only documentary record of research
  reasoning or a thesis-state decision, never a trading instruction.
- **Revision**: an append-only record of committed changes to current thesis
  state.
- **Score history**: completed MBS snapshots linked to a Living Thesis.

## Proposed Domain Model

Stage 2 implements the following conceptual shape as shared TypeScript types
and pure validators in `packages/core`. Physical persistence remains Stage 3.

### Living Thesis current state

| Field | Requirement | Notes |
| --- | --- | --- |
| `id` | Required, immutable | Stable opaque ID; never derived from ticker. |
| `ticker` | Optional | Normalized metadata when present; never identity and not unique. |
| `entityName` | Required | User-maintained company, fund, theme, or subject label independent of ticker. |
| `title` | Required | Names the particular thesis, not merely the company. |
| `theme` | Optional | User-assigned research grouping; not the static Theme Library object. |
| `summary` | Required | Current thesis statement. |
| `bullCase` | Optional | Current supporting case. |
| `bearCase` | Optional | Current disconfirming case. |
| `lifecycle` | Required | `draft`, `active`, `monitoring`, `paused`, or `archived`; separate from health and review state. |
| `conviction` | Required | `unrated`, `low`, `medium`, or `high`; user-entered analytical context. |
| `riskLevel` | Required | `unrated`, `low`, `medium`, or `high`; user-entered summary, not an automated recommendation. |
| `reviewCadenceDays` | Optional | Positive integer used for deterministic scheduling. |
| `nextReviewAt` | Optional | Calendar date in `YYYY-MM-DD` format; user-controlled or calculated when a review completes. |
| `version` | Required | Monotonic revision used to detect stale review completion or concurrent edits. |
| `createdAt` / `updatedAt` | Required | Canonical UTC ISO timestamps in `YYYY-MM-DDTHH:mm:ss.sssZ` format. |
| `archivedAt` | Optional | Canonical UTC ISO timestamp; archival is preferred to deletion. |

Ticker changes must not change `id`. More than one thesis may use the same
ticker, and a thesis may have no ticker. Identity and relationships use the
stable thesis ID.

### Current risk and catalyst items

Current risks and catalysts should be structured child entities rather than a
single renderer-formatted string. Each item should have its own stable ID,
thesis ID, title, optional detail, status, and timestamps. Risk may also have a
user-entered severity. Catalyst status may distinguish open, observed, and
retired.

The Living Thesis aggregate presented to core/UI code may include these child
arrays. Stage 3 must decide whether SQLite begins with normalized child tables
or validated JSON storage. Removing an item from current state must create a
revision and mark or retire the child item; history must not be erased.

The Stage 2 shared types use `open`, `resolved`, and `retired` for risk status;
`open`, `observed`, and `retired` for catalyst status; and `unrated`, `low`,
`medium`, and `high` for user-entered risk severity. These logical values do
not select a Stage 3 storage representation.

Risk and catalyst `createdAt` and `updatedAt` fields use the same canonical UTC
ISO timestamp format as the parent thesis. This is distinct from the
date-only `nextReviewAt` scheduling field.

### Values that are derived, not authoritative fields

The following should not be primary mutable columns on `living_theses`:

- current numeric MBS score and score change;
- thesis health;
- review state;
- review priority;
- last completed review time;
- decision, score, review, or revision history arrays.

Queries may return these as a read model assembled from the current record and
specialized history repositories.

## Stable Identity

New durable records should receive collision-resistant opaque IDs such as
`thesis_<uuid>` from an injected ID factory at the main/service boundary. Core
constructors should accept the ID rather than reading runtime globals. Tests can
inject deterministic IDs.

Identity rules:

- ticker and entity name are attributes, not keys;
- no unique constraint should prevent multiple theses for one ticker;
- changing a ticker does not rewrite child or history IDs;
- every child and history record has its own stable ID and `thesisId` foreign
  key;
- exported IDs are retained when safe;
- append-only import remaps collisions and all references in one transaction;
- imports must never resolve relationships by ticker alone.

## Persistence Architecture

The existing boundary remains mandatory:

```text
React renderer
  -> typed window.thesisInvesting.livingTheses API
  -> preload ipcRenderer.invoke
  -> validated Electron main IPC handlers
  -> Living Thesis services and repository interfaces
  -> SQLite adapter and migrations
```

Stage 3 uses normalized child tables for current risks and catalysts. Their
stable identities, statuses, and timestamps remain independently addressable
without making opaque JSON mutation a persistence contract.

| Entity/table | Mutability | Purpose |
| --- | --- | --- |
| `living_theses` | Mutable current state | Current thesis fields, lifecycle, scheduling, and version. |
| `living_thesis_risks` | Mutable current state with retirement | Structured current risks. |
| `living_thesis_catalysts` | Mutable current state with retirement | Structured current catalysts. |
| `living_thesis_review_sessions` | Mutable only while in progress; immutable after completion | Review draft, baseline version, reason, notes, proposed changes, and completion metadata. |
| `living_thesis_decisions` | Append-only | Documentary reasoning linked to a thesis and optionally a completed review session. |
| `living_thesis_revisions` | Append-only | Full before/after snapshots for completed reviews. Broader edit-history coverage remains later work. |
| Existing `mbs_score_snapshots` | Append-only | Canonical MBS score history, optionally linked to a Living Thesis. |

Conceptually, one Living Thesis owns many risk items, catalyst items, Review
Sessions, decisions, revisions, and MBS snapshots. A Review Session belongs to
one thesis and is referenced by its completion revision and optional MBS
snapshot. A decision recorded later may reference that completed session;
completion does not create decisions automatically. Current and previous MBS values are derived from
ordered linked snapshots; the Living Thesis row has no authoritative snapshot
pointer or numeric score.

Foreign keys should conceptually use `ON DELETE RESTRICT`. Phase 3 should not
add hard-delete UI. Useful indexes include thesis ID plus timestamp on every
history table, lifecycle/next-review indexes on `living_theses`, and a unique
constraint allowing at most one in-progress Review Session per thesis.

Migration 4 adds the three current-state tables and enables SQLite foreign-key
enforcement for storage connections. Risk and catalyst relationships use
`ON UPDATE RESTRICT` and `ON DELETE RESTRICT`. The repository offers no Living
Thesis hard-delete operation.

The Stage 3 repository supports transactional aggregate creation, read by ID,
deterministic list order (`updated_at DESC, id ASC`), and transactional
expected-version updates. Child reads use `created_at ASC, id ASC`. New
aggregates begin at version 1; successful updates increment the stored version
once. Stale versions fail without partial writes. Existing children must remain
in the submitted aggregate and use `retired` when they leave active research;
omission never deletes stored rows. Parent and child creation timestamps are
immutable through repository updates.

Stage 3 intentionally ends at repository/storage. Narrow main, IPC, preload,
and renderer use cases remain future integration work.

The preload API should expose use-case methods, not repository or SQL access.
Likely read methods include `list`, `get`, and `getTimeline`. Likely write
methods include `create`, `updateCurrent`, `archive`, `startReview`,
`saveReviewDraft`, and `completeReview`. Every IPC payload must be validated in
main and return the existing structured success/error result style.

## Current State Versus Historical Records

### Current-state updates

Direct edits may update presentation and current-state fields such as title,
summary, bull/bear cases, lifecycle, conviction, risk summary, review cadence,
next review date, and active risks/catalysts.

Each direct Board save validates the expected thesis version, updates the
current-state aggregate transactionally, and increments its version and
`updatedAt`. It does not append a revision. Stage 6 appends immutable
before/after revisions only when a review completes, in the same transaction as
the thesis update and any score snapshot.

The original architecture proposed revision coverage for every direct edit;
that broader coverage is not implemented. Stage 8 presents the history actually
stored and does not invent missing events from version gaps or `updatedAt`.
Any future direct-edit revision support needs its own explicit contract.

### Historical records

The following implemented actions append records rather than overwrite prior
evidence:

- completing a review;
- recording a documentary decision;
- saving a completed MBS snapshot.

Lifecycle, conviction, risk, catalyst, and scheduling changes are captured in
before/after revisions when made through a completed review. Direct Board edits
do not have equivalent revision coverage. Completed reviews, decisions,
snapshots, and revisions are not edited in place through ordinary product UI.
Users can record new reasoning as another decision; explicit correction or
superseding relationships remain future work.

## MBS Integration

`MbsScoreSnapshot` remains the canonical historical score record. A Living
Thesis does not store `currentMbsSnapshotId` or duplicate numeric score fields.
Its current score, previous score, and change are derived from eligible linked
snapshots ordered by `createdAt` descending, then snapshot ID ascending as a
deterministic tie-breaker.

Current formal score history has an explicit provenance boundary:

- only a completed review with its matching revision and snapshot establishes
  an eligible link for History;
- session, revision, snapshot, thesis, and completion-time relationships must
  validate together;
- matching `snapshot.thesisId` or ticker alone never establishes eligibility;
- the first eligible score has no previous comparison; skipping a score during
  a review does not create a score event or reset the previous score;
- current, previous, and each historical change use the same ordering above.

Future standalone scorer adoption should preserve these rules:

- saving a score without a thesis continues to create an unlinked snapshot;
- the user may select a Living Thesis before saving;
- a formally linked snapshot receives that stable Living Thesis ID at creation;
- the latest eligible linked completed snapshot is current by definition;
- a Review Session may prepare MBS input, but only completion creates the
  immutable linked snapshot;
- existing unlinked snapshots remain valid and are not inferred by ticker.

The existing field name `thesisId` is retained as the single formal
relationship to `LivingThesis.id`; no competing `livingThesisId` field is
introduced. Existing values from the current scorer or version 1 import are
legacy references and remain untouched and unlinked in formal Living Thesis
queries unless a later explicit migration validates the relationship.
Migration 4 does not add an MBS foreign key, reinterpret existing values, or
change current MBS persistence.

## Thesis Board Transition

Stage 4 completes the first production adoption of formal Living Thesis data:

- the Board loads persisted records and shows a truthful empty state without
  automatically inserting demo fixtures;
- a narrow preload API exposes only `list`, `getById`, `create`, and versioned
  `update` use cases;
- Electron main owns UUID and canonical timestamp generation, aggregate
  construction, validation, and repository access;
- creation starts at version 1 and successful updates replace renderer state
  with the repository-returned incremented version;
- stale versions produce an explicit conflict. The unsaved draft remains in
  place until the user explicitly reloads the saved version;
- risks and catalysts retain stable IDs and use statuses such as `retired`
  instead of ordinary destructive removal;
- Stage 4 itself introduced no MBS history, thesis health, review priority,
  timeline, or Review Session state. Stages 6–8 add persisted reviews, decisions,
  and History; health and review priority remain later stages.

Ordinary current-state edits persist when the user saves. Review conclusions and
linked score changes use the Review Workflow and Review Session completion
contract. The Board consumes only `LivingThesis`,
never a production `LivingThesis | MockThesis` union.

### Unsaved Thesis Board edits

Sidebar navigation keeps the current Board editor open when it contains unsaved
changes. The user can choose **Save and leave**, **Discard and leave**, or
**Continue editing**. Save and leave uses the same local create/update operation
as the editor and opens the requested workspace only after a successful save.
Validation errors, storage failures, and version conflicts preserve the draft
and appear in the dialog. Continue editing and Escape cancel the navigation;
Discard and leave abandons only the in-memory draft without a storage write.

While a save is pending, the editor and dialog actions are disabled. Navigation
waits for that save, including saves started with the editor's Save changes
button. A clean Board and the already active sidebar item require no dialog.

This guard covers sidebar navigation. Drafts are still in memory: closing the
application, reloading its renderer, or a crash does not recover unsaved edits.
The existing save/cancel requirement for switching between thesis records is
unchanged.

## Review Workflow Architecture

Stage 5 implements the ordered workflow against the approved current-state
model. The [Review Workflow contract](LIVING_THESIS_REVIEW_WORKFLOW.md) describes
the public core API, editable draft boundaries, validation, and Stage 6 handoff.
The steps are:

1. start review and capture reason;
2. review the thesis summary and cases;
3. review risks, catalysts, and triggers;
4. review or prepare an MBS score;
5. review lifecycle, conviction, risk level, and next-review schedule;
6. preview a before/after summary;
7. explicitly complete the review.

Pure workflow transitions and completion validation belong in `packages/core`.
Persistence orchestration and timestamps belong in Electron main services.
Renderer components should receive a typed Review Session client.

The core workflow captures the baseline thesis ID/version, keeps proposed edits
and optional score input separate, enforces ordered confirmations, and
invalidates later confirmations when reviewed content changes. Both completed
and abandoned workflows reject further edits. Final completion checks current
saved identity/version and all content again; its returned value is in memory.

Stage 6 completion now runs in a single transaction. It verifies the exact
original baseline and independent session version, checks current parent
identity/version and archived state, updates the thesis once, marks the session
complete, appends a full before/after revision, and saves/links a new MBS snapshot
when chosen. Failure rolls back the whole operation. An exact retry after a lost
response returns the saved result without duplicating history or scores.

The original plan also anticipated explicit Decision Log entries and automatic
review-date calculation. Stage 7 lets users record a decision separately and
optionally link the completed review. Current completion saves the user's
chosen review date and cadence; it does not generate either a decision or a
new date.

## Review Session

The current schema 2 Review Session has the fields below. Schema 1 unfinished
and abandoned sessions remain readable; completion upgrades an older session.
Stage 7 stores the optional review link on the decision itself. Completed
sessions are not rewritten; decisions for a review can be found through that
link without adding a decision field to the session.

A Review Session has:

- stable session ID and thesis ID;
- status: `in_progress`, `completed`, or `abandoned`;
- baseline thesis version;
- start, update, completion, and optional abandonment timestamps;
- free-text review reason;
- draft/proposed thesis changes;
- optional draft MBS input;
- review notes;
- completion references: required revision ID and a score snapshot ID exactly
  when a new score was chosen.

Starting a review creates its durable session. Explicit **Save draft** captures
unfinished progress for restart recovery without changing the current thesis.
**Complete review** confirms and applies the proposed changes. Completed and
abandoned sessions are immutable. Database migration 6 retains older records
and adds immutable revisions, with one result per session and thesis version.
The guided UI exposes five named IPC operations: get active, start, resume,
save draft, and complete; abandonment remains a storage-service operation.

## Decision Log

Stage 7 implements append-only documentary entries in `living_thesis_decisions`:

- `id`, `thesisId`, and decision `schemaVersion: 1`;
- required `title` and `rationale`;
- optional `reviewSessionId` pointing to a completed review of the same thesis;
- `kind`, derived as `research_note` without a link or `review_conclusion` with one;
- `createdAt`, assigned in Electron main when the entry is saved.

**Add decision** opens a short **Decision** / **Reason** form inside the saved
thesis. A completed-review link is optional. The log shows the newest entries
first, including for archived theses. Adding an entry changes no thesis fields,
version, score, or review session. Users record new thinking as a new entry;
there is no edit/delete action for saved decisions.

The typed `decisions` API exposes only `list`, `listCompletedReviews`, and
`create`. A stable request UUID makes an exact save retry return the original
entry rather than create another. Database migration 7 enforces immutable
entries and valid parent/review relationships. Links live on decisions, so
completed sessions and revisions remain unchanged. See the
[Decision Log contract](LIVING_THESIS_DECISION_LOG.md).

The log records the user's analytical reasoning and provides no trading-action
categories, transaction execution, or generated investment recommendations.

## Score History And Thesis Timeline

Stage 8 implements one read-only **History** card in the saved thesis workspace.
It shows newest-first summaries with expandable details for completed reviews,
decisions, and eligible scores. A completed session and its before/after revision
form one review item, not two duplicate events. The revision supplies the
recorded thesis changes; the review supplies its reason and notes.

Score entries are admitted only through validated completed-review/revision
links. Their current/previous comparisons follow `createdAt DESC`, then
snapshot ID ascending for equal timestamps. The first score has no prior
comparison, and a skipped score does not manufacture a change. Historical
details use saved inputs and snapshots rather than current thesis content.

The timeline also provides the recorded thesis creation date and current
archival marker. Direct Board edits are not fully recorded. Unarchiving clears
the current `archivedAt`, so that marker cannot reconstruct earlier archive
cycles; saved review revisions retain any lifecycle changes they captured.
The UI describes this coverage instead of suggesting a complete audit trail.

Main reads the related records consistently, and core derives the timeline
without mutating them. Specialized sessions, revisions, decisions, and scores
remain the source of truth. There is no persisted generic event table, new
database migration, or backup format change; format 5 already contains the
records used by History. See [Living Thesis History](LIVING_THESIS_HISTORY.md).

## Thesis Health

Thesis health should be deterministic, local, explainable, and derived on read.
It should not be stored as a mutable truth on the Living Thesis row.

Potential inputs are:

- lifecycle status;
- whether a review is overdue or due soon;
- latest linked MBS score and change from the prior linked snapshot;
- user-marked high-severity unresolved risks;
- recent lifecycle changes and worsening risk evidence;
- stale review age;
- incomplete Review Session age.

A health result should contain an assessment such as `stable`, `improving`,
`weakening`, `review_due`, or `insufficient_data`, plus reason codes and
human-readable explanations. The evaluator must accept an explicit reference
time, expose an algorithm version, and have threshold tests in `packages/core`.

The current result is derived. A completed Review Session may store the health
assessment and algorithm version seen at completion as historical context, but
that snapshot must not become the next current source of truth. Health language
must describe research state, never suggest a transaction.

## Review Queue

The Review Queue should be a deterministic read model, not a persisted ranking
or recommendation list. Candidate reasons may include:

- overdue scheduled review;
- review due within a configured window;
- unresolved high-severity risk;
- material negative score change between linked snapshots;
- lifecycle eligibility, including exclusion of archived theses;
- stale or abandoned in-progress review;
- explicit user review flag.

The queue should expose reason codes, due date, and an explainable priority band
such as overdue, due soon, attention, or routine. If an internal numeric score
is used, its contributions must be inspectable and tested. User-facing copy
should say review, revisit, or inspect, not buy, sell, add, trim, or allocate.

## Thesis Library

The Thesis Library is the user's persisted catalog of Living Thesis records.
It is distinct from:

- Theme Library, which is static bundled educational content;
- Watchlist, which tracks lightweight candidates without requiring a thesis;
- Portfolio Ranker, which compares independent manual ranker inputs;
- Thesis Board, which is the operational sorting, filtering, and editing view.

Thesis Board and Thesis Library should be separate views over the same
repositories and Living Thesis IDs. The Board emphasizes active work and review
signals. The Library emphasizes search, lifecycle filters, archived records,
and access to full history. They must not create duplicate thesis stores.

## Mock-Data Transition

The current shared demo records remain valuable for tests, onboarding examples,
and empty states. Transition rules are:

- keep fixtures in an explicitly named demo/test module, separate from user
  repositories;
- adapt fixtures to the formal model through a deliberate mapper;
- never synthesize category scores or historical events without marking them as
  fixture data;
- reserve a recognizable demo ID namespace;
- make production screens prefer persisted Living Thesis records;
- show demo records only with the established demo provenance;
- never insert fixtures into SQLite automatically;
- require an explicit Create from example action if that feature is staged
  later, generating a new durable ID and creation history.

The existing `MockThesis` may remain temporarily while screens migrate one at a
time. Stage 2 should define formal fixtures in core tests or renderer fixture
code rather than exporting example production records from the core domain
module.

## Import And Export Compatibility

The Stage 4 backup extension introduced format version 2 with Living Thesis current
state and nested risks and catalysts. Counts include parent theses, including
archived records. Saved versions and timestamps survive restore; colliding
parent and child IDs are remapped together in a single append-only transaction.
Malformed aggregates and cross-thesis child references are rejected before
confirmation. Repository restore uses a savepoint so a later failure rolls back
the entire backup. The schema and normal create/update contract are unchanged.

Phase 2 format version 1 remains readable with its unchanged five-workflow
shape. Its preview explicitly states that no Living Theses are included.

Stage 6 part 1 introduced format version 3 with saved review sessions and retains
version 1 and 2 compatibility. Session IDs, parent IDs, baseline child IDs, and
draft child IDs are remapped together. Stale baselines remain unchanged and are
flagged on resume; malformed progress and orphaned sessions are rejected.

Stage 6 completion introduced format version 4 with eight arrays, adding
`thesisRevisions` and completed session/score relationships. Formats 1–3 remain
readable. Import validates both sides of each completion, rejects orphaned or
duplicate history transitions, and remaps parent/session/revision/score/child
references consistently. The original score arrays remain in place; formally
linked review scores are distinguished from legacy Thesis Note references.
Stage 7 now writes format version 5 with the ninth array, `thesisDecisions`.
Formats 1–4 remain readable without inventing decision entries. Import validates
each decision's thesis and optional completed-review link, preserves dates, and
remaps decision, thesis, and review IDs consistently. All nine arrays are
restored within the same append-only transaction.
Relationship-aware import must continue to:

1. fully validate the document and all relationships before writing;
2. preview counts without mutation;
3. require explicit confirmation;
4. allocate/remap Living Thesis IDs first;
5. remap every child, session, decision, revision, and snapshot reference;
6. insert in dependency order inside one transaction;
7. append as new records without overwriting target records;
8. preserve historical timestamps and source relationships when valid;
9. reject dangling or cross-thesis references;
10. return exact imported counts and warnings.

Backward-compatible import of version 1 continues to import its five
existing workflows. Because version 1 has no formal Living Thesis entity, its
snapshot `thesisId` is a legacy reference and must not be guessed into a new
Living Thesis relationship. The importer retains the existing legacy Thesis
Note remapping behavior. File-based roundtrip tests, a historical version 1
fixture, collision tests, and injected SQLite failures cover this compatibility
boundary and the atomic restore behavior.

## Architecture And Safety Boundaries

- SQLite remains in Electron main/storage.
- Renderer code does not import SQLite, repository implementations, Node
  filesystem modules, dialogs, or shell APIs.
- Preload exposes narrow typed use cases under `window.thesisInvesting`.
- IPC handlers validate untrusted renderer and import input.
- File dialogs and import/export reads and writes remain in Electron main.
- Current-state and historical writes use transactions.
- No reset, destructive restore, overwrite import, raw SQL console, or raw
  SQLite import is introduced.
- No cloud, auth, sync, live APIs, AI, brokerage, execution, or recommendation
  behavior is part of Phase 3.
- All health, queue, and score calculations are deterministic and explainable.
- The app remains educational software and not financial advice.

## Recommended Implementation Sequence

1. **Stage 1 - Architecture plan.** Review and approve terminology, entities,
   ownership, history strategy, and unresolved decisions.
2. **Stage 2 - Shared Living Thesis model.** Add pure types, validators,
   constructors, current/history separation, and explicit demo fixtures in
   `packages/core`. Do not add persistence yet.
3. **Stage 3 - Persistence foundation.** Add normalized current-state tables,
   repository transactions, optimistic version enforcement, storage tests, and
   runtime verification. Keep main IPC, preload, renderer adoption, and export
   format changes out of this stage.
4. **Stage 4 - Thesis Board adoption.** Complete. The Board uses the formal
   repository client, truthful empty states, versioned saves, and explicit
   conflict recovery without automatic demo insertion.
5. **Stage 5 - Review Workflow.** Complete. Core implements and tests ordered
   review transitions, proposed-edit previews, and completion validation
   against the approved model.
6. **Stage 6 - Review Session.** Complete, with manual Windows UI verification
   pending. Durable drafts, guided UI, validated IPC, navigation protection,
   atomic completion, immutable revisions, optional linked scores, exact retry,
   and format 4 backups are implemented. Stage 8 adds the History interface.
7. **Stage 7 - Decision Log.** Complete, with manual Windows UI verification
   pending. A simple entry form, immutable history, optional completed-review
   links, exact save retries, and format 5 backups are implemented.
8. **Stage 8 - Score History / Timeline.** Complete, with manual Windows UI
   verification pending. One derived History card shows completed reviews,
   decisions, validated review-linked scores, and limited creation/current
   archival markers. Direct-edit history remains incomplete; no schema or
   format 5 backup change is introduced.
9. **Stage 9 - Thesis Health Engine.** Add deterministic assessment and reason
   codes over persisted local evidence.
10. **Stage 10 - Review Queue.** Build the explainable queue from schedules,
    health, scores, risks, and active sessions.
11. **Stage 11 - Thesis Library.** Add the full persisted catalog as a second
    view over the same repository data.
12. **Stage 12 - Closeout QA.** Validate lifecycle persistence, history
    immutability, restart behavior, export/import round trips, architecture, and
    product safety.

This sequence moves the persistence foundation ahead of Board adoption. It
prevents another renderer-only model from becoming an accidental source of
truth and gives every later workflow a stable repository contract.

## Unresolved Questions

The five shared-model decisions covering ticker optionality, lifecycle
ownership, legacy `InvestmentIdea`, current MBS derivation, and snapshot
`thesisId` semantics are resolved in
[Living Thesis Shared-Model Decisions](LIVING_THESIS_MODEL_DECISIONS.md). The
remaining persistence and feature-stage questions are:

1. Which edits may bypass a Review Session, and which material fields require
   review completion?
2. What is the minimum durable Review Session draft format, and how should
   draft schema versions be upgraded?
3. Should abandoned Review Sessions appear in the normal timeline or only in
   an audit/details view?
4. Which thesis-health thresholds and priority bands are understandable
    enough to ship without implying recommendations?
5. Should a future explicit Create from demo action copy any example history,
    or create only clean current state and one creation revision?
6. When Review Sessions become portable in a later format, should in-progress Review
    Sessions be portable or imported as inactive drafts?
