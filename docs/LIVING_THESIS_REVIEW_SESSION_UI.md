# Guided Review UI

Phase 3 Stage 6 makes saved drafts and completed reviews available from
Thesis Board. It follows the selected Guided Review design, with plain labels,
one section at a time, optional details, and explicit save status.

## Using a review

1. Select a saved thesis on the Board. Save or cancel any Board edits first.
2. Choose **Start review**, or **Resume review** if a draft already exists.
3. Work through the sections below. Earlier sections can be reopened; doing so
   asks you to check later sections again while retaining their content.
4. Choose **Save draft** whenever you want to keep your progress. Incomplete
   text and partial ratings can be saved, but a section must be valid before
   moving to the next one.
5. Return to the Board or another screen. If you have unsaved edits, choose
   Save and leave, Discard edits and leave, or Continue editing. Discard removes
   only changes since the last draft save; it does not abandon the review.
6. After restarting the app, select the same thesis and choose Resume review.
7. When the final preview is ready, choose **Complete review**. The confirmation
   explains that it applies the changes and saves the review history, plus any
   new business score. Choose **Keep editing** to return, or **Complete review**
   to save everything together. Success returns to the Board with the updated
   thesis and a saved confirmation.

| Section | Purpose |
| --- | --- |
| Reason | Record why you are reviewing now. |
| Thesis | Update the title and summary; add optional review notes and supporting/opposing cases. |
| Risks & catalysts | Revisit existing items or add new ones. A catalyst is an event that could change the thesis. |
| Business score | Explicitly skip a new score, or enter all seven ratings from 0 to 10. Partial ratings can be saved for later. |
| Your assessment | Record confidence, risk level, thesis status, and optional review scheduling. |
| Review draft | Read the proposed changes beside the saved thesis and check any new score inputs. |

**Save draft** means “continue later”; **Complete review** means “apply these
changes.” Completion requires every section and the final preview to be valid.
It records the chosen review date and cadence as entered; it does not invent a
new date. Decision Log and a history/timeline browsing interface remain later
stages.

## Save and recovery behavior

- A new review starts from the saved thesis, never from unsaved Board fields.
- Start creates one active session per thesis. The Board looks up that session
  before offering Start or Resume. Archived theses cannot start a review;
  existing drafts remain accessible.
- Saving checks the session's independent version. A failure leaves the
  current edits visible and allows retry. While saving, editing and duplicate
  save requests are disabled.
- A version conflict cannot overwrite newer work. **Open saved draft…** offers
  an explicit confirmation before replacing unsaved edits with the latest
  stored draft. The user can stay and copy their text first.
- Resume warns if the parent thesis has changed or been archived since the
  review began. It preserves the original baseline and the saved draft.
  Completion is blocked for a changed or archived parent. You can still save
  or copy the draft; newer research is never overwritten or silently rebased.
- Sidebar navigation and Return to Board use the same review leave guard.
  Window reload/close uses the browser/Electron `beforeunload` guard while
  edits are unsaved or storage is busy. Unsaved keystrokes are not crash recovery;
  only explicit successful saves are durable.
- Completion checks both the saved draft version and the original thesis
  version again in storage. A rejected write leaves the saved draft intact.
- If the completion response is lost, editing pauses and **Complete review**
  retries the exact same request. Storage either finishes it once or returns
  the existing result; it cannot create duplicate revisions or scores.
- Format 4 exports include drafts, completed sessions, immutable revisions, and
  linked scores. Older formats 1–3 remain readable. Database migration 6 retains
  existing schema 1 sessions; completion upgrades those sessions to schema 2.

## Implementation boundary

`ReviewSessionLauncher` and `ReviewSessionScreen` use the existing core workflow
helpers for transitions, validation, progress invalidation, and preview. No
domain/scoring logic moves into React. Shared `ReviewStepNavigation` and
`DraftLeaveDialog` components live in `packages/ui`.

The shared `ReviewSessionsStorageApi` exposes only `getActive`, `start`,
`resume`, `saveDraft`, and `complete`. Preload maps these to five named channels. Main
validates unknown IDs/versions and delegates workflow parsing and owned
baseline/metadata checks to the existing storage service. The renderer has no
general-purpose IPC bridge or direct database access.

## Browser development preview

Run `pnpm preview:review` after installing dependencies. The Vite preview uses
the real app, core workflow, and storage services with a separate example file:
`node_modules/.cache/review-preview/example.sqlite`. It seeds a fictional
Acme Research thesis only when that example database is empty. It never opens
the Electron `userData` database. Only Board/review storage is bridged in this
preview; other screens retain their existing browser fallback behavior.

The development server listens on port 4173. Its `/sizes.html` page labels the
workspace as fictional and offers 1487×1058, 1100×720, and 860×560 desktop frames
for reproducible visual checks. The bridge permits only named Board/review
operations through same-origin JSON requests. It is development tooling, not
a production web deployment or a supported multi-user service.

`pnpm dev` retains the Electron development command. The supervised preview's
`--host` flag selects the same isolated browser example server.

## Verification

Automated coverage exercises actual storage and the app integration: start,
save/restart/resume, partial text and score recovery (including zero ratings),
step validation, proposed-change preview, duplicate/pending saves, retry after
failure, version conflicts and confirmed reload, changed-parent warnings,
navigation/discard protection, dirty Board gating, and malformed IPC requests.
Draft tests check that saving does not change the parent thesis. Completion
coverage checks confirmation, applying changes once, optional scores, immutable
history, stale/forged submissions, rollback, restart, and exact retry after an
uncertain response. Backup coverage checks formats 1–4, linked history, ID
remapping, and all-or-nothing import.

Browser verification covers the six-section flow, explicit saves, saved-draft
resume, keyboard Enter/Escape, and the three desktop frame sizes. The
[design QA report](../design-qa.md) contains screenshots and comparison evidence.
Manual Windows UI/installer testing remains deferred. Automated builds and
packaging do not establish interactive Windows behavior.
