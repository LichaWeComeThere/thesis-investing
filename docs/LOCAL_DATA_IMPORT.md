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
- `formatVersion` set to `1`, `2`, or `3`
- app and export metadata produced by Thesis Investing
- valid counts matching the arrays required by that format version
- valid domain records in each data array

Imported record types are:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots
- Living Theses with nested risks and catalysts (versions 2 and 3)
- Saved in-progress and abandoned review sessions (version 3)

| Format | Required data arrays and counts |
| --- | --- |
| 1 | The five legacy record types |
| 2 | The five legacy types plus `livingTheses` |
| 3 | The six version 2 types plus `reviewSessions` |

Version 1 and 2 backups keep their historical shapes. After validation, missing
later record types normalize to empty arrays. The preview explains that version
1 has no Living Theses or review sessions, and version 2 has no review sessions.
Existing local records remain untouched. A file claiming an older version while
including newer data arrays or counts is rejected to prevent silent omission.

Versions 2 and 3 require the `livingTheses` count and data array even when empty.
Validation checks parent and child shapes, domain rules, saved versions,
timestamps, child-to-parent references, unique parent IDs, and child IDs that
are unique across all risks and catalysts in the backup.

Version 3 also requires `reviewSessions` and its matching count, even when
empty. Every session must include its parent Living Thesis in the same backup.
The parser validates the session schema, timestamps, identities, and confirmed
step order. Unconfirmed sections may retain unfinished text, dates, and partial
finite score inputs; confirmed sections must pass their domain validation.

A session baseline cannot be newer than its parent. Equal versions must contain
the same saved thesis state. An older baseline is preserved and flagged on
resume; it is not silently replaced. Baseline children must still belong to the
parent with the same kind, and only one in-progress session per parent is
allowed. Session schema 1 does not accept completed reviews.

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

Living Thesis parent IDs, review session IDs, and risk/catalyst IDs use separate
remapping tables. One shared child-ID map covers current theses and every
session baseline and draft, including draft-only children. A child ID retains
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
all seven imported record types; the preview remains available for retry. Normal
Thesis Board creation still requires version 1.

Review-session storage is implemented before its review screen and renderer IPC.
Importing a session does not expose new review controls, complete a review, or
write a score snapshot. See [Review Session Storage](LIVING_THESIS_REVIEW_SESSION_STORAGE.md).

Legacy MBS `thesisId` values keep the existing Thesis Note remapping behavior;
they are not inferred to reference Living Theses. Formal score linking remains
a separate workflow stage.

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
- arbitrary JSON or export format versions other than 1, 2, and 3

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
