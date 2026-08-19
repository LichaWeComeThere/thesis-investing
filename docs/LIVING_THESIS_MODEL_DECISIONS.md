# Living Thesis Shared-Model Decisions

## Status

This document records the decisions approved before Phase 3 Stage 2, Shared
Living Thesis Model. It complements the
[Living Thesis OS architecture plan](LIVING_THESIS_ARCHITECTURE.md) and locks
the logical contract that Stage 2 should implement in `packages/core`.

This is a documentation decision pass. It does not add TypeScript domain
types, persistence, migrations, repositories, IPC, preload APIs, renderer
clients, or UI behavior.

## Decision Context

The current codebase contains several thesis-shaped concepts with different
roles:

- `ThesisNote` is an existing SQLite-persisted notes workflow.
- `MockThesis` is shared renderer demo data and is not persisted.
- `InvestmentIdea` is an early core aggregate with mapping helpers but no
  active production consumer.
- `MbsScoreSnapshot` is an existing persisted completed-score record with an
  optional relationship field whose legacy meaning is not currently
  consistent.

Stage 2 will introduce `LivingThesis` as the formal shared model without
silently converting any of these existing records. The following five
decisions prevent the new model from inheriting ambiguous identity, lifecycle,
or score ownership.

## Decision 1: Ticker Is Optional Metadata

### Decision

`LivingThesis.id` is required and immutable. `ticker` is optional metadata and
must never be used as thesis identity.

The Stage 2 model should require a user-maintained `entityName` independent of
the ticker. The entity name may identify a company, fund, private business,
theme, or other research subject. A ticker may be absent, may change without
changing the thesis ID, and may be shared by multiple theses.

Validation must:

- require a stable thesis ID;
- require a non-empty entity name and thesis title;
- validate and normalize a ticker only when one is supplied;
- never infer or resolve thesis relationships from ticker;
- allow multiple theses with the same ticker.

### Alternatives Considered

Requiring a ticker would fit the current equity-oriented screens but would
make a market symbol an accidental prerequisite for thesis identity. Deriving
the ID from ticker was rejected because it prevents multiple historical or
alternative theses for the same subject and makes ticker changes destructive.

### Consequences

Stage 2 constructors and validators must accept a missing ticker. Read models
and future UI may display an entity name without a ticker. Import and future
relationships must use stable IDs only.

## Decision 2: Living Thesis Owns Its Lifecycle

### Decision

The exact Stage 2 lifecycle vocabulary is:

```text
draft | active | monitoring | paused | archived
```

The states mean:

- `draft`: the thesis record is being formed and is not yet in its normal
  ongoing review cycle;
- `active`: the thesis is actively maintained as current research;
- `monitoring`: the thesis is retained for observation and periodic review;
- `paused`: active maintenance is intentionally suspended without closing or
  deleting the record;
- `archived`: the thesis is removed from active workflows but retained with
  its history.

Lifecycle describes the thesis record, not an investment or portfolio action.
It must not encode buy, sell, hold, allocation, or position-sizing behavior.
Review scheduling state, thesis health, conviction, and risk level remain
separate concepts.

`LivingThesisLifecycle` should be a dedicated type. The legacy `ThesisStatus`
used by `ThesisNote` must not be silently reused because its current values and
semantics differ. Archival remains the normal alternative to destructive
deletion.

### Alternatives Considered

The legacy vocabulary includes `watch`, `challenged`, `broken`, and `closed`.
Those values mix note state, analytical assessment, and terminal state.
`challenged` and `broken` belong in evidence or derived health rather than
lifecycle. `watch` overlaps with the Watchlist workflow. `closed` overlaps with
the retained historical purpose of `archived`.

The preserved review-workflow branch uses `active | watching | archived`.
That vocabulary omits draft and paused states and predates the approved
current-state/history separation.

### Consequences

Stage 2 must introduce the dedicated lifecycle type without changing
`ThesisNote.status`. A later explicit workflow may map or create a Living
Thesis from a note, but no implicit status conversion is authorized here.

## Decision 3: InvestmentIdea Is Legacy

### Decision

`InvestmentIdea` is a legacy, pre-Living-Thesis aggregate. It must not remain a
competing formal thesis model.

Current source inspection found no active production consumer of the
`InvestmentIdea` type or its helper functions. They are exported from
`packages/core/src/index.ts` and exercised by
`packages/core/src/investmentIdea.test.ts`; application screens do not import
or use them. The similarly named `initialInvestmentIdeas` renderer property is
typed as `MockThesis[]`, not `InvestmentIdea[]`.

Stage 2 policy:

- `LivingThesis` becomes the only formal shared thesis aggregate;
- new Living Thesis work must not add fields or workflows to `InvestmentIdea`;
- no new production consumer may adopt `InvestmentIdea`;
- the legacy type and helpers may remain temporarily to avoid unrelated API or
  test churn;
- removal or adaptation belongs in a later focused cleanup after all external
  and workspace consumers are reconfirmed.

### Alternatives Considered

Evolving `InvestmentIdea` in place was rejected because it embeds legacy
watchlist, score, note, reminder, and decision concepts with different
ownership. Immediate deletion was rejected because this pass is documentation
only and should not create unrelated compatibility churn.

### Consequences

Stage 2 should not extend, alias, or subclass `InvestmentIdea`. The new model
should use explicit adapters only where a later migration or compatibility use
case proves one is needed.

## Decision 4: Current MBS Is Derived From Linked Snapshots

### Decision

The current MBS snapshot for a Living Thesis is the latest eligible,
successfully persisted, completed `MbsScoreSnapshot` linked to that thesis.
`MbsScoreSnapshot` remains the canonical historical score record.

The initial rules are:

1. A formal link is established when a completed snapshot is created as part
   of a validated save or Review Session completion.
2. An eligible snapshot has `thesisId` equal to the stable Living Thesis ID and
   a valid completion timestamp in `createdAt`.
3. Current is the first eligible snapshot ordered by `createdAt` descending,
   then snapshot ID ascending as a deterministic tie-breaker.
4. Previous and score change are derived from the immediately preceding
   eligible linked snapshot using the same ordering.
5. Living Thesis does not duplicate the numeric score, score change, or score
   history.
6. Unlinked and legacy snapshots remain valid historical records but are not
   inferred into a Living Thesis relationship by ticker or another legacy ID.
7. Initial formal linking occurs at snapshot creation. Relinking an immutable
   snapshot in place is not part of Stage 2.

`currentMbsSnapshotId` must not be an authoritative field on the Stage 2
`LivingThesis` model. The current snapshot should be derived by a read model or
repository query. A future performance cache may expose a pointer internally,
but it must be rebuildable from canonical snapshots and must never become a
second source of truth.

### Alternatives Considered

A manually selected favorite snapshot was rejected because it changes the
meaning of "current" and requires separate auditable selection history. A
mutable numeric score on Living Thesis was rejected because it can disagree
with the snapshot record. A persisted current pointer was rejected for the
initial model because local snapshot volume does not justify redundant mutable
state.

### Consequences

Stage 2 must omit `currentMbsSnapshotId` and numeric MBS values from the current
Living Thesis state. It may define a separate derived read-model shape later.
Stage 3 repository design must provide deterministic linked-snapshot ordering
and indexes without changing which record is authoritative.

## Decision 5: Snapshot thesisId Has One Formal Meaning

### Current Meaning

Today `MbsScoreSnapshot.thesisId` is optional and has no enforced canonical
relationship:

- the MBS Scorer writes the ID of the selected renderer `MockThesis`;
- the version 1 local-data importer remaps the field through imported
  `ThesisNote` IDs;
- SQLite stores the value in `mbs_score_snapshots.thesis_id` without a Living
  Thesis foreign key.

Existing non-empty values therefore cannot be assumed to identify a formal
Living Thesis.

### Decision

Keep the TypeScript field name `thesisId`. Once formal Living Thesis linking is
available, its sole domain meaning is:

```text
MbsScoreSnapshot.thesisId -> LivingThesis.id
```

Do not add a competing `livingThesisId` field. A formally linked snapshot must
reference an existing stable Living Thesis ID. An unlinked snapshot omits the
field.

Version 1 export/import retains its frozen legacy document semantics. Legacy
persisted or imported values must be handled by an explicit compatibility
boundary and must not be reinterpreted as Living Thesis links merely because
the strings happen to match. They remain unlinked for formal Living Thesis
queries unless a later explicit, validated migration establishes a
relationship. Ticker matching is never sufficient.

### Alternatives Considered

Adding `livingThesisId` would make the new relationship obvious but would leave
two thesis relationship fields that could disagree across the TypeScript
model, SQLite, and export documents. Renaming the existing field everywhere
would create avoidable migration and backward-compatibility churn. Retaining
`thesisId` with version-aware legacy handling provides one durable domain name
without pretending old values already satisfy the new contract.

### Consequences

Stage 2 should document and type `thesisId` as the optional stable Living
Thesis relationship for formal code. Stage 3 must define the compatibility and
migration boundary before enforcing a foreign key or using legacy rows in
Living Thesis queries. Export format version 1 remains unchanged; a future
format version must encode and validate the formal relationship explicitly.

## Cross-Decision Consistency

Together, these decisions allow the Stage 2 model to represent:

- a thesis with no ticker;
- multiple theses sharing one ticker;
- a thesis with no completed MBS snapshot;
- an ordered history of linked completed snapshots;
- a neutral lifecycle independent of conviction, health, and review state;
- structured risks and catalysts with stable child identity;
- a temporarily retained legacy `InvestmentIdea` that is not authoritative.

There is no contradiction among the five decisions. Identity and relationships
use stable IDs. Lifecycle describes record maintenance. MBS values remain
historical snapshot facts and derived read-model values.

## Stage 2 Contract Preview

The conceptual `LivingThesis` current-state model should contain:

- immutable `id`;
- monotonic `version`;
- optional `ticker`;
- required `entityName`;
- required thesis `title` and `summary`;
- optional `theme`, `bullCase`, and `bearCase`;
- required `lifecycle`, `conviction`, and user-entered `riskLevel`;
- structured current `risks` and `catalysts` with stable child IDs;
- optional `reviewCadenceDays` and `nextReviewAt`;
- `createdAt`, `updatedAt`, and optional `archivedAt`.

The authoritative current record must not contain:

- a duplicated current numeric MBS score;
- `currentMbsSnapshotId` as mutable state;
- complete score history;
- Decision Log history;
- Review Session history;
- revision history;
- mutable stored thesis health;
- mutable stored review state or queue priority.

Those values belong to specialized historical records or deterministic read
models defined by later stages.

## Stage 2 Implications

Stage 2 may now define pure types, validators, constructors, and test fixtures
for the logical model. It should:

- create a dedicated `LivingThesisLifecycle` with the locked vocabulary;
- make ticker optional and validate it only when present;
- keep identity independent from ticker and entity name;
- keep conviction, risk, health, and review state separate from lifecycle;
- represent risks and catalysts as structured children in the domain model;
- omit authoritative MBS values and the current-snapshot pointer;
- treat `MbsScoreSnapshot.thesisId`, when formally populated, as a Living
  Thesis ID;
- leave `InvestmentIdea` unchanged and unused by new work;
- keep demo fixtures outside production domain exports.

Stage 2 must not add SQLite, repositories, IPC, preload APIs, renderer clients,
or UI adoption.

## Deferred Persistence Decisions

The following remain Stage 3 or later decisions:

- normalized risk/catalyst tables versus validated JSON storage;
- exact additive migration numbers and legacy-row treatment;
- foreign-key enablement and constraints;
- repository query and indexing details for linked snapshots;
- optimistic-concurrency transaction implementation;
- exact IPC write contracts and structured result types;
- export format version 2 and relationship migration;
- Review Session draft persistence and completion transactions;
- post-hoc snapshot-linking behavior, if it is ever explicitly staged.

These physical decisions must preserve the logical contract in this document.
They may not reintroduce ticker identity, duplicate MBS truth, competing thesis
relationship fields, or a second formal thesis aggregate.

## Safety Boundaries

These decisions remain local-first and analytical. They add no cloud, auth,
sync, live APIs, AI, brokerage connection, trading execution, recommendation
engine, buy/sell/hold state, portfolio-sizing guidance, or destructive data
behavior. Lifecycle and score concepts organize user-authored research; they do
not prescribe investment actions.
