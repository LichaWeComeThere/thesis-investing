# Living Thesis OS Architecture

## Status

This document began as the Phase 3 Stage 1 architecture plan. Phase 3 Stage 0
reconciled the renderer prototype and its data-provenance labels. Phase 3 Stage
2 now implements the framework-independent `LivingThesis` current-state model,
structured risk and catalyst types, and validation in `packages/core`.
Phase 3 Stage 3 adds the SQLite persistence foundation for that current-state
aggregate. Phase 3 Stage 4 connects Thesis Board to that repository through
narrow typed main, IPC, preload, and renderer boundaries.

The plan is based on `main` at
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

The branch is nine commits behind current `main` and has two unique commits:

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

The branch is also nine commits behind current `main` and has two unique
commits:

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
| `living_thesis_decisions` | Append-only | Documentary reasoning linked to a thesis and optionally a review session. |
| `living_thesis_revisions` | Append-only | Versioned before/after domain-state snapshots or validated deltas for each committed current-state change. |
| Existing `mbs_score_snapshots` | Append-only | Canonical MBS score history, optionally linked to a Living Thesis. |

Conceptually, one Living Thesis owns many risk items, catalyst items, Review
Sessions, decisions, revisions, and MBS snapshots. A Review Session belongs to
one thesis and may be referenced by the revision, decision, and MBS snapshot
created when it completes. Current and previous MBS values are derived from
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

Each successful update should run in one transaction that:

1. validates the expected thesis version;
2. records an append-only revision containing the prior and resulting domain
   state or an equivalent validated delta;
3. updates the validated current-state storage;
4. increments the thesis version and `updatedAt`.

Stage 3 implements current-state version checking and transactional aggregate
writes before the revision table exists. Appending the revision in that same
transaction becomes mandatory when revision persistence is introduced; Stage
3 does not fabricate historical records.

### Historical records

The following actions append records rather than overwrite prior evidence:

- completing a review;
- recording a documentary decision;
- saving a completed MBS snapshot;
- changing lifecycle, conviction, risks, catalysts, or review schedule;
- correcting a prior record.

Corrections should append a superseding/correction record with a reference to
the original. Completed reviews, decisions, snapshots, and revisions should not
be edited in place through ordinary product UI.

## MBS Integration

`MbsScoreSnapshot` remains the canonical historical score record. A Living
Thesis does not store `currentMbsSnapshotId` or duplicate numeric score fields.
Its current score, previous score, and change are derived from eligible linked
snapshots ordered by `createdAt` descending, then snapshot ID ascending as a
deterministic tie-breaker.

Future behavior should be explicit:

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
- the Board does not display or fabricate MBS history, thesis health, review
  priority, timeline, or Review Session state.

Ordinary current-state edits persist immediately when the user saves. Proposed
review conclusions and future score changes still belong to the later Review
Workflow and Review Session stages. The Board consumes only `LivingThesis`,
never a production `LivingThesis | MockThesis` union.

## Review Workflow Architecture

The preserved branch's ordered workflow is a useful starting point. The
recommended stages are:

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

Completing a review must be a single transaction. It should verify the baseline
thesis version, update current state, append a revision, append the completed
review record, save/link an MBS snapshot when applicable, append any explicit
Decision Log entry, and calculate the next review date. Failure should roll the
whole operation back.

## Review Session

A Review Session should have:

- stable session ID and thesis ID;
- status: `in_progress`, `completed`, or `abandoned`;
- baseline thesis version;
- start, update, completion, and optional abandonment timestamps;
- review reason code and optional explanation;
- draft/proposed thesis changes;
- optional draft MBS input;
- review notes;
- completion result references such as revision, decision, and snapshot IDs.

Recommendation: persist an incomplete session after the user explicitly clicks
Start Review. Multi-step work should survive restart, but autosaving a review
draft must not alter the current Living Thesis. Draft writes may update the
in-progress session. A completed session becomes immutable. An abandoned
session should be retained as such rather than silently deleted.

## Decision Log

Decision Log entries are append-only documentary records. A proposed shape is:

- `id` and `thesisId`;
- optional `reviewSessionId`;
- entry type such as `review_conclusion`, `status_change`,
  `conviction_change`, `risk_assessment`, or `research_note`;
- short title and rationale;
- optional references to the prior and resulting thesis revision;
- `createdAt`.

The log records the user's analytical reasoning. It must not provide or encode
buy, sell, hold, trim, add, allocation, or position-sizing instructions. If the
product later needs a broader investment journal, that requires separate scope
and safety review.

## Score History And Thesis Timeline

Use specialized records and derive a unified timeline at read time. Do not use
one generic event table as the only persistence model.

The timeline projection should combine:

- thesis creation and archival timestamps;
- completed Review Sessions;
- linked MBS Score Snapshots;
- Decision Log entries;
- thesis revisions, including risk, catalyst, lifecycle, conviction, and
  scheduling changes.

Specialized tables provide stronger validation, clearer repository APIs, and
safer import relationships. A core timeline mapper can normalize them into a
common read-only `ThesisTimelineItem` discriminated union and sort by timestamp.
The original specialized record remains the source of truth.

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

Phase 2 format version 1 must remain readable and unchanged while Living Thesis
support is developed. Adding Living Thesis records and related history requires
a new export format version.

A future version should include arrays and counts for Living Theses, risks,
catalysts, Review Sessions, Decision Log entries, revisions, and linked MBS
snapshots. Import should:

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

Backward-compatible import of version 1 should continue to import its five
existing workflows. Because version 1 has no formal Living Thesis entity, its
snapshot `thesisId` is a legacy reference and must not be guessed into a new
Living Thesis relationship. Stage 3 must implement an explicit compatibility
boundary and fixture-based tests while preserving the frozen version 1 format.

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
5. **Stage 5 - Review Workflow.** Implement and test the pure workflow state
   machine and completion validation against the approved model.
6. **Stage 6 - Review Session.** Persist explicit in-progress sessions and add
   the atomic completion transaction.
7. **Stage 7 - Decision Log.** Add documentary append-only entries and their
   review/session links.
8. **Stage 8 - Score History / Timeline.** Formalize Living Thesis snapshot
   links, revision history, and the derived unified timeline.
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
6. When export format version 2 is introduced, should in-progress Review
    Sessions be portable or imported as inactive drafts?
