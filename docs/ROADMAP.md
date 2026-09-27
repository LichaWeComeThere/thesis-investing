# Roadmap

Thesis Investing will be built in small, reviewable phases. Each stage should land in its own pull request and keep product guardrails intact: no brokerage execution, no personalized financial advice, no live data APIs until explicitly planned, and no cloud sync or AI analyst features until their phases.

## Phase 0: GitHub/Codex Foundation

Establish the repository, workspace structure, CI, documentation, and collaboration workflow for future stages.

## Phase 1: Offline Windows MVP

Build a Windows-first desktop MVP that works offline with manual user input and local-only data. Phase 1 is complete through Stage 24 closeout QA.

- Stage 1: App navigation shell
- Stage 2: Design system
- Stage 3: Core domain models
- Stage 4: SQLite local persistence
- Stage 5: MBS scoring engine
- Stage 6: First-run onboarding
- Stage 7: Manual MBS Scorer screen
- Stage 8: Portfolio Ranker
- Stage 9: Thesis Monitor and thesis notes
- Stage 10: Watchlist
- Stage 11: Static Theme Baskets
- Stage 12: Dashboard
- Stage 13: Manual earnings reminders
- Stage 14: Windows MVP release build
- Stage 15: Release smoke-test documentation
- Stage 16: Persistence wiring plan
- Stage 17: Electron storage runtime verification
- Stage 18: Watchlist persistence
- Stage 19: Thesis Notes persistence
- Stage 20: Reminders persistence
- Stage 21: Portfolio Ranker input persistence
- Stage 22: MBS Score Snapshot persistence
- Stage 23: Dashboard persisted local summary reads
- Stage 24: Final QA, polish, and Phase 1 closeout

## Phase 2: Local Data Foundation

Build local data visibility, export/import, backup guidance, and maintenance
tools before any live data or optional sync work. Live data should be isolated
behind provider interfaces when explicitly staged later, and sync should remain
optional. Phase 2 is complete through Stage 6 closeout QA.

- Stage 1: Local Data Management View - complete
- Stage 2: Local Data Export - complete
- Stage 3: Local Data Import - complete
- Stage 4: Local Data Safety / Backup Hardening - complete
- Stage 5: Local Data Maintenance Tools - complete
- Stage 6: Phase 2 Closeout QA - complete
- Future: additional local data safeguards only after explicit staging
- Future: optional live market data behind provider interfaces
- Future: optional sync, auth, or cloud features only after explicit staging

## Phase 3: Living Thesis OS

Add Living Thesis model and review workflows after Phase 2 local data work is
closed out. Intelligence features must remain educational, transparent, and
non-advisory.

Phase 3 Stage 0 is complete. It reconciled the inherited UI prototype with the
persisted, demo, and static data-provenance boundaries established in Phases 1
and 2. Stage 1 completed the Living Thesis architecture plan. Formal Living
Thesis persistence now exists behind the storage repository. Stage 4 adopts it
in Thesis Board through a narrow typed main/preload/IPC/renderer workflow.
Stage 5 adds the pure review workflow, proposed-edit preview, and guarded
completion validation in core. Stage 6 part 1 adds durable review session
storage, restart recovery, and format 3 backups. Stage 6 part 2 connects a guided
review screen through typed IPC, with explicit draft saves, resume, and edit
protection. Stage 6 is now implemented through explicit completion: the thesis,
completed session, immutable revision, and optional score save together, with
conflict protection and safe retries. Stage 7 adds an append-only Decision Log
inside each saved thesis, with a decision, reason, automatic date, and optional
completed-review link. Stage 8 adds a read-only History card with completed
reviews, decisions, and validated review-linked scores, including expandable
details. Stage 9 adds a derived Thesis Health assessment with clear research
concerns, missing-information reasons, and separate review timing. Both views
derive from saved records; they introduce no migration or backup format change.
Current format 5 backups include decisions alongside review history and retain
formats 1–4 compatibility. Manual Windows UI verification remains pending;
Stage 10 adds a read-only Review Queue in Overview, with unfinished reviews,
saved review dates, and separate research concerns. Stage 11, Thesis Library,
is the next separate task.

The shared Living Thesis current-state model and validation are implemented in
`packages/core` using the decisions for optional ticker metadata, dedicated
lifecycle vocabulary, legacy `InvestmentIdea` handling, derived current MBS,
and snapshot `thesisId` semantics recorded in
[Living Thesis Shared-Model Decisions](LIVING_THESIS_MODEL_DECISIONS.md).
Other renderer demo surfaces remain separate and continue using explicitly
labeled shared mock data until their own future adoption stages.

- Stage 0: UI Prototype & Data Provenance Reconciliation - complete
- Stage 1: [Living Thesis OS Architecture Plan](LIVING_THESIS_ARCHITECTURE.md) - complete
- Stage 2: Shared Living Thesis Model - complete
- Stage 3: Living Thesis Persistence Foundation - complete
- Stage 4: Thesis Board adopts Living Thesis model - complete
- Stage 5: [Review Workflow](LIVING_THESIS_REVIEW_WORKFLOW.md) - complete
- Stage 6: [Review Session Storage](LIVING_THESIS_REVIEW_SESSION_STORAGE.md) and [Guided Review UI](LIVING_THESIS_REVIEW_SESSION_UI.md) - complete; draft storage, guided UI, atomic completion, and history backups implemented; manual Windows UI check pending
- Stage 7: [Decision Log](LIVING_THESIS_DECISION_LOG.md) - complete; simple entry form, immutable history, optional completed-review links, safe retries, and backup coverage implemented; manual Windows UI check pending
- Stage 8: [Score History / Thesis Timeline](LIVING_THESIS_HISTORY.md) - complete; read-only History card, expandable review/decision/score details, validated formal score links, and deterministic ordering implemented; direct-edit history remains incomplete; manual Windows UI check pending
- Stage 9: [Thesis Health](LIVING_THESIS_HEALTH.md) - complete; deterministic research assessment, reasons, limitations, and separate review timing based on saved research; manual Windows UI check pending
- Stage 10: [Review Queue](LIVING_THESIS_REVIEW_QUEUE.md) - complete; Overview groups saved drafts, overdue/due-soon reviews, and explained research concerns, with exact thesis/review navigation; manual Windows UI check pending
- Stage 11: Thesis Library
- Stage 12: Living Thesis OS Closeout QA

## Phase 4: Read-only APIs

Read-only API work is deferred until after the local-first foundation and Living
Thesis OS are reviewed. API stages must use explicit provider boundaries and
must not add trading execution or personalized advice.

- Stage 1: API Architecture Plan
- Stage 2: Read-only Company Metadata
- Stage 3: Read-only Market Data
- Stage 4: Read-only Financial Statements
- Stage 5: Earnings / Calendar Data
- Stage 6: API Closeout QA

## Phase 5: AI / Advanced Intelligence

AI and advanced intelligence features are much later work and require a
dedicated safety and product review before implementation.
