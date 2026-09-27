# Living Thesis OS closeout QA

## Scope and status

Phase 3 Stages 4–11 provide saved theses, guided reviews, decisions, formal
history, derived health, a review queue, and a searchable library. Stage 12 adds
a connected regression journey and records the verification boundary. It does
not introduce product features, migrations, backup formats, or dependencies.

Automated closeout is complete once this PR's required checks pass. **Hands-on
Windows acceptance remains deferred**; this document is not a claim that the
packaged application has passed a Windows user session. Phase 4 requires its
own explicit scope and approval.

## Connected regression journey

`apps/desktop/src/main/livingThesisCloseout.test.ts` runs two scenarios against
isolated file-backed SQLite databases, with and without a review score. Records
are created through the production services used by IPC, rather than by
constructing already-completed backup fixtures.

The scenarios verify:

1. Create a thesis and update it through draft, active, monitoring, paused,
   archived, and active states. Preserve stable identity and archive metadata.
2. Keep another archived thesis with the same ticker and a paused tickerless
   thesis separate in the saved catalog.
3. Save a review draft without changing the current thesis; close the database,
   construct fresh services, and resume the exact saved draft.
4. Complete the review, creating its revision and optional score. Retry the
   same completion without duplicating history.
5. Record a linked decision. Exact retries are safe; attempts to rewrite the
   decision or completed review are rejected.
6. Save an unfinished follow-up alongside the completed review. The queue
   points to that exact session and excludes paused/archived records.
7. Reopen storage and compare all saved records and the Library's saved list,
   History, Health, Queue, and resumable draft.
8. Export a real JSON file, preview import into an empty database without
   writing, confirm import, close/reopen the target, and compare records and
   derived views again. History IDs, ownership, dates, versions, and the
   unfinished draft survive unchanged.

Database reopen tests exercise durable SQLite state and fresh service instances.
They do not simulate an OS crash, power loss, Electron window shutdown, native
file dialogs, or the Windows installer/runtime.

## Existing coverage retained

| Concern | Regression coverage |
| --- | --- |
| Atomic completion, stale versions, failure rollback, lost-response retry | `reviewCompletionStorageService.test.ts`, `ReviewSessionScreen.test.tsx` |
| All nine backup record types, formats 1–4 compatibility, collisions, invalid relationships, import rollback | `localDataCompletedReviews.test.ts`, `localDataLivingTheses.test.ts`, `localDataStorageService.test.ts` |
| Append-only decision records and valid completed-review ownership | `decisionsStorageService.test.ts`, `decisionsIpcHandlers.test.ts`, `DecisionLogPanel.test.tsx` |
| Read-only history, validated score links, explained health and separate review timing | `thesisHistoryStorageService.test.ts`, core history/health tests |
| Exact queue targets, missing/ended reviews, retained draft navigation | `QueueNavigation.interactions.test.tsx`, `reviewQueueStorageService.test.ts` |
| Library filters, exact history targets, failed saves and decision draft protection | `ThesisLibraryScreen.test.tsx`, `LibraryNavigation.interactions.test.tsx` |

Run the connected journey alone with:

```sh
pnpm --filter @thesis-investing/desktop exec vitest run src/main/livingThesisCloseout.test.ts
```

Repository gates remain `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
`pnpm build`. GitHub's Windows Build packages the application; it does not
perform the manual acceptance sequence below.

## Architecture and product boundaries

- Core owns workflow, scoring, history, health, and queue derivation. Renderer
  calls typed preload/IPC contracts; SQLite remains behind repositories and
  main-process services.
- The Electron window retains context isolation and renderer sandboxing.
- Health describes saved research concerns separately from review timing.
  Queue placement is a research task, not an investment recommendation.
- Backup format 5 remains current; imports append and remap conflicting IDs.
  Importing into a nonempty database is not a replacement restore.
- Formal reviews and decisions preserve history. Direct Board edits and earlier
  archive/unarchive cycles are not a complete audit trail.
- Legacy research tools retain their own records and explicitly labeled demo
  context. A shared ticker does not imply shared thesis identity.
- Read-only external APIs, cloud sync, AI analysis, and trading execution are
  outside this closeout. No such integration is added here.

## Deferred Windows acceptance

Use fictional records in a separate test Windows profile. Do not test recovery
by deleting the working research database. Use a second empty test profile for
the import comparison, because imports append.

1. Launch the packaged app. Create a thesis with a risk, catalyst, and review
   date; save it. Check it in Library and Overview.
2. Start a review, save partial work, close the app normally, relaunch, and resume
   from Overview. Verify the same text and step are present.
3. Complete the review with a score. Add a linked decision. Check History and
   the score details. Repeat on another thesis with an explicit score skip.
4. Start a follow-up and save it. Exercise Save, Discard, and Continue editing
   when navigating from the thesis/review/decision forms.
5. Export using the native file dialog. In the empty test profile, preview and
   confirm that export. Relaunch and compare the thesis, completed review,
   decision, score, history, and follow-up draft with the source.
6. Verify keyboard focus and navigation at 1100×720 and the supported 860×560
   minimum. Confirm no controls needed for saving or leaving are inaccessible.

Record the commit, Windows version, packaged artifact, outcomes, and any issue
before marking this acceptance complete. A successful build alone is not enough.
