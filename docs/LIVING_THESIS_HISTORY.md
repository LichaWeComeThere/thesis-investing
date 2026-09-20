# Living Thesis History

## Status

Phase 3 Stage 8 implements read-only history for a saved Living Thesis. The
History card combines completed reviews, decisions, and eligible review-linked
scores with simple summaries and expandable details. Manual Windows UI
verification remains pending. [Stage 9: Thesis Health](LIVING_THESIS_HEALTH.md)
now uses the same validated saved records; Stage 10, Review Queue, is next.

This stage reads existing records. It does not add a database migration,
persisted event table, backup format, external API, or automatic assessment.
Database migration 7 and export format 5 remain current.

## Using History

Select a saved thesis in Thesis Board and read its **History** card. Entries
appear newest first. Expand an entry for its saved details; closing the details
returns to the short summary. The same history remains available for archived
theses.

| Entry | What it represents |
| --- | --- |
| Completed review | One completed session and its immutable revision, including the reason and recorded before/after thesis changes. |
| Decision | The saved decision and reason, with optional completed-review context. |
| Business score | A score saved through a completed review, its recorded factor inputs, and comparison with the previous eligible score when available. |
| Creation date | The timestamp when the thesis was created; it is not a snapshot of the original thesis content. |
| Current archival marker | The currently recorded archive timestamp, with the limited lifecycle coverage described below. |

History is a reader for saved research. Adding a decision and completing a
review continue to use their existing explicit save workflows. Opening or
expanding History changes no stored research.

## Read Model And Relationships

The renderer requests history for one stable thesis ID through a narrow typed
preload API. Electron main reads the saved parent, sessions, revisions,
decisions, and required snapshots consistently, validates their relationships,
and delegates the timeline projection to pure core code.

Stage 9 also returns a cloned current thesis with this read model, from the
same transaction. Thesis Health uses that saved state together with validated
history, so it does not mix unsaved Board edits or separately loaded versions
into the assessment. Current thesis fields still never replace historical
review snapshots. No new IPC channel or stored health record is introduced.

One completed review produces one review item. Its session and revision are
joined by their recorded IDs rather than displayed as duplicate events. The
revision's before/after snapshots describe the changes actually saved by that
review. Current thesis fields must not replace historical values when showing
old entries.

Material change details compare content fields and stable risk/catalyst IDs.
Version increments and metadata-only timestamp changes are not substantive
thesis changes. A review may complete without changing thesis content; that is
a valid recorded review, not a missing event. Unfinished drafts and abandoned
sessions are not presented as completed reviews.

Decisions remain separate immutable records. An optional review link supplies
context without rewriting either the decision or the completed session. Their
dates are the saved dates, not the time the History card is opened.

## Eligible Scores And Ordering

Legacy `MbsScoreSnapshot.thesisId` values may originate from renderer demo IDs
or older Thesis Note imports. Therefore an equal `thesisId`, matching ticker,
or company name is never enough to include a score in formal thesis history.

An eligible score is referenced by the matching completed session and revision
for the selected thesis. Session/revision IDs, snapshot ID, stable thesis ID,
completion timestamp, and recorded score content must agree under the existing
completed-review integrity contract. Standalone and legacy scores remain in
their existing workflow and backups; History does not silently adopt them.

Eligible snapshots sort by `createdAt` descending, then snapshot ID ascending
for equal timestamps. Current score is first, previous score is second, and
each historical comparison uses the immediately older eligible snapshot in
that same order. The first score has no previous comparison, rather than a
synthetic zero change. A review that skips scoring neither adds a score event
nor resets the previous score. Tied dates use deterministic ordering; they do
not imply a finer real-world chronology than the stored timestamps provide.

Timeline entries also use deterministic ordering when their timestamps tie.
The score comparisons preserve the snapshot ordering above even when multiple
review, score, and decision entries share a timestamp.

## Coverage And Limits

The existing revision table records completed-review changes only. Direct
Board saves change current state without appending equivalent revisions. A
current version number or `updatedAt` value cannot recover those earlier edits,
so History does not fabricate events for them or claim to be a complete audit
trail.

The creation timestamp survives later edits, but current content is not an
original creation snapshot. Similarly, the current `archivedAt` field is
cleared on unarchive and replaced on a later archive. Its marker cannot recover
every earlier lifecycle transition. Completed-review revisions retain the
lifecycle changes captured in their own before/after snapshots.

## Persistence And Verification

History is derived again after restart or import. Format 5 already backs up the
thesis, review sessions, revisions, decisions, and score snapshots; there is no
new history array. Formats 1–4 retain their existing compatibility, and missing
later record types do not generate invented history.

Verification should cover formal-versus-legacy score links, equal timestamps,
first-score and skipped-score behavior, recorded before/after details, no-op
reviews, archived theses, restart/import reconstruction, and read-only access.
Manual Windows checks remain pending for opening and expanding entries in the
desktop app. Automated builds alone do not establish interactive Windows
behavior.
