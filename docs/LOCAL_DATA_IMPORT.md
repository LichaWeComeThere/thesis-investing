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
- `formatVersion` set to `1` or `2`
- app and export metadata produced by Thesis Investing
- valid counts matching all five legacy arrays for version 1, or all six
  arrays (including `livingTheses`) for version 2
- valid domain records in each data array

Imported record types are:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots
- Living Theses with nested risks and catalysts (version 2 only)

Version 1 backups keep their historical shape and import only the five older
workflows. The preview reports zero Living Theses and explains that the older
backup does not contain them. Existing Living Theses remain untouched. A file
claiming version 1 while containing Living Thesis data or counts is rejected.

Version 2 requires the `livingTheses` count and data array even when empty.
Validation checks parent and child shapes, domain rules, saved versions,
timestamps, child-to-parent references, unique parent IDs, and child IDs that
are unique across all risks and catalysts in the backup.

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

Living Thesis parent IDs and risk/catalyst IDs are remapped separately. Child
IDs share a namespace across both child types and all theses. Remapping updates
every child's `thesisId` to its imported parent. Unused IDs from the backup are
reserved before allocating collision suffixes, and IDs are checked again on
confirmation in case local data changed after preview.

The append-only `livingTheses.restore` repository method preserves the saved
version (including versions greater than 1), timestamps, lifecycle, review
schedule, and child state. It never replaces an existing aggregate. Its SQLite
savepoint participates in the enclosing import transaction, so a later failure
also undoes earlier restored theses and all five older record types. Normal
Thesis Board creation still requires version 1.

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
- arbitrary JSON or export format versions other than 1 and 2

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
