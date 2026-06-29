# Local Data Import

Phase 2, Stage 3 adds a safe local JSON import flow in Settings/About for files
created by the Thesis Investing local data export.

Import is append-only and requires confirmation. Selecting a file validates and
previews it without changing the database. Records are written only after the
user selects **Confirm import**.

## Accepted Files

The importer accepts JSON objects with:

- `format` set to `thesis-investing-local-data-export`
- `formatVersion` set to `1`
- app and export metadata produced by Thesis Investing
- valid counts matching all five data arrays
- valid domain records in each data array

Imported record types are:

- Watchlist items
- Thesis Notes
- Reminders
- Portfolio Ranker Inputs
- MBS Score Snapshots

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

## Append-Only Behavior

Import never deletes or updates existing records. Records with unused IDs retain
their exported IDs. If an imported ID already exists, Electron main assigns a
new deterministic local suffix such as `-import-1` before creating the record.

When an imported Thesis Note ID is remapped, imported Watchlist and MBS snapshot
references to that note are remapped with it. Repository validation runs before
each create, and the five-record import transaction rolls back if a write fails.

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
- arbitrary JSON or export format versions other than version 1

It also does not add database replacement, restore, reset/delete actions,
automatic backup scheduling, cloud sync, auth, live stock APIs, AI analyst
features, brokerage integrations, or trading execution.

## Privacy And Limitations

Export files can contain private research notes. Review the selected file name
and counts before confirming, and import only files from a trusted location.

This stage does not provide record-by-record selection, semantic duplicate
detection, merge rules, or rollback history after a successful import. Supported
timestamps already present in exported records are preserved; unsupported or
transient UI state is not created.

Thesis Investing remains educational software only. Importing records does not
turn them into recommendations or personalized financial advice.
