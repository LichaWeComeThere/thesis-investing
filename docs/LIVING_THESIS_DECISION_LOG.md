# Living Thesis Decision Log

## Status

Phase 3 Stage 7 implements a simple, persistent record of what the user decided
about a saved thesis and why. Manual Windows UI verification remains deferred.
Score History / Thesis Timeline is the next separate Stage 8 task; this stage
provides a decision list rather than a unified thesis timeline.

## User Flow

1. Select a saved thesis in Thesis Board and choose **Add decision**.
2. Enter **Decision** and **Reason**. Both are required.
3. Optionally select a completed review from that thesis.
4. Choose **Save decision**. The app records the date and shows the saved entry
   in the Decision Log, with the newest entries first.

The form has no category or date picker. The five most recent entries are shown
initially; **Show all decisions** reveals older entries when present. Each entry
shows its decision, reason, date, and optional completed-review context.
Archived theses can receive documentary entries too. Finish or cancel current
thesis edits before opening the decision form.

Saved decisions cannot be edited or deleted. Add another entry when the
reasoning changes. Creating an entry does not change thesis fields, lifecycle,
version, scores, or any review session. Completing a review does not create a
decision automatically.

The form protects unsaved text during navigation and cancellation. A failed save
keeps the text available. If the reply is lost and saving cannot be confirmed,
the form keeps the submitted request unchanged and offers **Retry save** to
recover the original result without a duplicate entry. Unsaved decision text is
not a durable draft and is not included in backups.

## Domain Record

`packages/core/src/livingThesisDecision.ts` exports the record, parser, and
validator. Decision schema version 1 contains:

| Field | Meaning |
| --- | --- |
| `id` | Stable entry ID. Interactive writes derive it from the request UUID. |
| `thesisId` | Required saved Living Thesis parent. |
| `schemaVersion` | `1`. |
| `title` | Required decision text, 1–160 characters after trimming. |
| `rationale` | Required reason, 1–10,000 characters after trimming. |
| `reviewSessionId` | Optional completed review belonging to the same thesis. |
| `kind` | `research_note` without a review link; `review_conclusion` with one. |
| `createdAt` | Canonical UTC timestamp assigned in Electron main. |

The UI does not ask users to choose `kind`; main derives it from the optional
link. Neither the timestamp nor the stored ID is accepted as an editable form
field. Validation rejects unsupported fields, unsupported kinds, blank text,
malformed timestamps, and incompatible kind/link combinations.

## Local API And Storage

The renderer accesses three typed methods through
`window.thesisInvesting.decisions`:

| Method | Purpose |
| --- | --- |
| `list(thesisId)` | Read saved decisions for one thesis, newest first. |
| `listCompletedReviews(thesisId)` | Read eligible review IDs, completion dates, and reasons for the optional selector. |
| `create(thesisId, input, requestId)` | Validate and append one decision, or return its existing exact retry result. |

`input` contains only `title`, `rationale`, and optional `reviewSessionId`.
The form generates a UUID v4 once for the save request and keeps it for retries.
Main validates it, creates `decision_<lowercase UUID>`, assigns the timestamp,
and saves in a transaction. An exact retry returns the original ID and date;
reusing the UUID for different content is rejected.

Database migration 7 adds `living_thesis_decisions`. Its foreign keys,
relationship checks, and repository validation require the parent thesis and
any linked completed review to exist. A decision cannot predate its thesis or
linked review. Database triggers prohibit updates and deletes. No change to the
parent thesis version or existing review/session schema is required.

The optional review link lives on the decision. Completed sessions and their
revisions remain immutable; a future timeline can find decisions by that link
without rewriting historical sessions. Repository restore composes with the
outer import transaction so a later failure rolls back earlier writes too.

## Backups And Scope

Current JSON exports use format 5. `thesisDecisions` is the ninth record array
and is included in counts and the import preview. Formats 1–4 remain readable
with no fabricated decisions. Import validates parent/review ownership and
dates, remaps colliding IDs and their links consistently, and appends all records
in one transaction. See [Local Data Export](LOCAL_DATA_EXPORT.md) and
[Local Data Import](LOCAL_DATA_IMPORT.md).

This stage adds documentary reasoning only. It provides no trading-action
categories, brokerage execution, external data API, generated recommendation,
automatic decision at review completion, or unified score/thesis timeline.

## Verification

Automated coverage belongs with the core parser, SQLite/service behavior, IPC
contract, import/export round trips, and renderer interactions. Release checks
also need the Windows app: save an entry, restart, confirm its text and optional
review link, verify navigation protection, and export/import the entry into a
separate test workspace. Manual Windows UI verification remains pending.
