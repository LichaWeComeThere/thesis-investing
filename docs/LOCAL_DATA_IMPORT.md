# Local Data Import

Phase 2, Stage 3 adds a safe local JSON import flow in Settings/About for files
created by the Thesis Investing local data export.

Import is append-only and requires confirmation. Selecting a file validates and
previews it without writing workflow records. Records are written only after the
user selects **Confirm import**. Existing records are not overwritten or
deleted.

## Import A Backup

1. Open **Settings/About** and find **Local data management**.
2. Select **Import local data** and choose a Thesis Investing export JSON file.
3. Review the file details, record counts, and any collision warnings. No
   workflow records have been written at this point.
4. Select **Confirm import** to append the records, or **Cancel import** to leave
   local records unchanged.
5. Review the success summary showing how many records were added.

This flow can move saved records to another computer or local profile. Import
only backup files you trust; they may contain private research notes.

## Accepted Files

The importer accepts JSON objects with:

- `format` set to `thesis-investing-local-data-export`
- `formatVersion` set to `1`, `2`, `3`, `4`, or `5`
- app and export metadata produced by Thesis Investing
- valid counts matching the arrays required by that format version
- valid domain records in each data array

Imported record types are:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots
- Living Theses with nested risks and catalysts (versions 2–5)
- Saved in-progress and abandoned review sessions (versions 3–5)
- Completed review sessions and their thesis revisions (versions 4 and 5)
- Thesis decisions with optional completed-review links (version 5)

| Format | Required data arrays and counts |
| --- | --- |
| 1 | The five legacy record types |
| 2 | The five legacy types plus `livingTheses` |
| 3 | The six version 2 types plus schema 1 `reviewSessions` |
| 4 | The seven version 3 types plus `thesisRevisions`; review sessions may use schema 1 or 2 |
| 5 | The eight version 4 types plus `thesisDecisions` |

Version 1, 2, 3, and 4 backups keep their historical shapes. After validation, missing
later record types normalize to empty arrays. The preview explains that version
1 has no Living Theses or review sessions, and version 2 has no review sessions.
Versions 1–3 do not include completed review history. Versions 1–4 do not include
thesis decisions; the preview explains that existing decisions stay unchanged.
Existing local records remain untouched. A file claiming an older version while
including newer data arrays or counts is rejected to prevent silent omission.

Versions 2–5 require the `livingTheses` count and data array even when empty.
Validation checks parent and child shapes, domain rules, saved versions,
timestamps, child-to-parent references, unique parent IDs, and child IDs that
are unique across all risks and catalysts in the backup.

Versions 3–5 also require `reviewSessions` and its matching count, even when
empty. Every session must include its parent Living Thesis in the same backup.
The parser validates the session schema, timestamps, identities, and confirmed
step order. Unconfirmed sections may retain unfinished text, dates, and partial
finite score inputs; confirmed sections must pass their domain validation.

A session baseline cannot be newer than its parent. Equal versions must contain
the same saved thesis state. An older baseline is preserved and flagged on
resume; it is not silently replaced. Baseline children must still belong to the
parent with the same kind, and only one in-progress session per parent is
allowed. Session schema 1 does not accept completed reviews. Version 3 rejects
schema 2 sessions, even unfinished ones; they require format 4 or later.

Versions 4 and 5 require `thesisRevisions` and its matching count even when empty.
Every completed review must have exactly one matching revision, and every
revision must resolve to its completed review and parent thesis. Before and
after thesis records, completion timestamps, versions, and child references
must agree with the review workflow. A revision cannot be newer than its parent;
equal versions must describe the same thesis. Two completed reviews cannot
produce the same version of one thesis; gaps from later Board edits are valid.
If the review includes a score,
its snapshot must be present, owned by that thesis, and agree with the saved
inputs and recomputed score. A snapshot cannot belong to two completed reviews.

Version 5 requires `thesisDecisions` and its matching count, even when empty.
Each decision must include its parent thesis in the backup. A review conclusion
must link to a completed review of that same thesis; a research note has no review
link. The decision date cannot precede its thesis creation or linked review
completion. Decisions can refer to older completed reviews after later thesis
edits or archival. IDs must be unique within the decision array, and decision
text, reason, kind, schema, and timestamps must pass domain validation.

Malformed JSON, unrelated JSON, unsupported format versions, missing arrays,
count mismatches, and invalid records are rejected before any writes occur.

## Preview And Confirmation

The flow is intentionally two-step:

1. **Import local data** opens an Electron JSON file picker.
2. Electron main reads, parses, and validates the selected file.
3. Settings/About displays the file name, export timestamp, format version,
   counts, and any collision warnings.
4. **Confirm import** performs the import.

Canceling the picker or the preview does not change local records. Validation
and file errors are shown without crashing the app.

Settings/About can also refresh local data status and show persisted record
counts before or after import. These maintenance tools are read-only and do not
change workflow records. See [Local Data Maintenance](LOCAL_DATA_MAINTENANCE.md).

## Append-Only Behavior

Import never deletes or updates existing records. Records with unused IDs retain
their exported IDs. If an imported ID already exists, Electron main assigns a
new deterministic local suffix such as `-import-1` before creating the record.

When an imported Thesis Note ID is remapped, imported Watchlist and MBS snapshot
references to that note are remapped with it. Repository validation runs before
each write, and the entire import transaction rolls back if any write fails.

Living Thesis parent IDs, review session IDs, revision IDs, decision IDs, snapshot IDs, and
risk/catalyst IDs use separate remapping tables. One shared child-ID map covers
current theses, every session baseline and draft, and all revision before/after
records, including children found only in history or drafts. A child ID retains
one parent and kind throughout those records. Existing draft-only IDs also
participate in collision detection. Remapping updates every parent, baseline,
and child reference consistently. Unused incoming IDs are reserved before
allocating suffixes; IDs are checked again on confirmation in case local data
changed after preview.

The append-only `livingTheses.restore` repository method preserves the saved
version (including versions greater than 1), timestamps, lifecycle, review
schedule, and child state. It never replaces an existing aggregate. Its SQLite
savepoint participates in the enclosing import transaction. Review sessions are
restored after their parents, preserving their independent draft versions,
timestamps, original baselines, proposed edits, notes, step progress, and score
drafts. Their restore method also uses a savepoint. A later failure rolls back
all nine imported record types; the preview remains available for retry. Normal
Thesis Board creation still requires version 1.

Completed review backups restore the saved state rather than replaying the
completion action. Parents and snapshots are restored before sessions, followed
by revisions and decisions, in one transaction. Decision IDs, thesis IDs, and
optional review links are remapped together while original text and dates are
preserved. Decisions restore recorded reasoning without applying a thesis edit or
replaying review completion. A late failure rolls back all of those writes.
See [Review Session Storage](LIVING_THESIS_REVIEW_SESSION_STORAGE.md).

Legacy MBS `thesisId` values keep the existing Thesis Note remapping behavior.
Snapshots explicitly linked by completed reviews instead follow the Living
Thesis ID map. The importer never guesses a snapshot owner from its ID.

Importing the same file more than once intentionally creates another local copy
instead of merging or deduplicating records.

## Architecture

The renderer uses narrow preload methods:

```ts
window.thesisInvesting.localData.previewImportFromJson()
window.thesisInvesting.localData.importFromJson(previewId)
```

Electron main owns the file picker, file read, JSON parsing, validation, pending
preview document, collision handling, and repository writes. The renderer sees
only preview metadata and an opaque preview ID. It does not import `node:fs`,
`node:sqlite`, raw storage helpers, or repository implementations.

## Not Included

This stage does not import:

- raw SQLite databases or Electron profile folders
- Theme Baskets or other bundled static content
- onboarding completion or transient UI state
- logs, build artifacts, Git data, credentials, secrets, tokens, or API keys
- arbitrary JSON or export format versions other than 1, 2, 3, 4, and 5

It also does not add database replacement, destructive restore, reset/delete actions,
automatic backup scheduling, cloud sync, auth, live stock APIs, AI analyst
features, brokerage integrations, or trading execution.

## Privacy And Limitations

Export files can contain private research notes. Review the selected file name
and counts before confirming, and import only files from a trusted location.
Thesis Investing does not upload export files or provide cloud backup.

This stage does not provide record-by-record selection, semantic duplicate
detection, merge rules, or rollback history after a successful import. Supported
timestamps already present in exported records are preserved; unsupported or
transient UI state is not created.

For the Phase 2 import and roundtrip QA record, see
[Phase 2 Closeout](PHASE_2_CLOSEOUT.md).

Thesis Investing remains educational software only. Importing records does not
turn them into recommendations or personalized financial advice.
