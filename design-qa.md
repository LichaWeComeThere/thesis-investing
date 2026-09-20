# Living Thesis design QA

Current Thesis Health QA is recorded first. Earlier History, Decision Log
and review assessments remain below as historical evidence.

## Thesis Health — Stage 9

Date: 2026-09-20. A compact Thesis Health card above History separates
saved research concerns from review timing. It uses the same transaction-read
thesis/history snapshot and never evaluates the Board's unsaved draft.

| Evidence | View |
| --- | --- |
| [Desktop separation](docs/screenshots/thesis-health-desktop.jpg) | 1100×720; no flagged research concerns with a separately overdue review |
| [Recorded concerns](docs/screenshots/thesis-health-concerns.jpg) | 1487×1058; high recorded risk, named open risk, and a 20-point score decline |
| [Small desktop](docs/screenshots/thesis-health-small.jpg) | 860×560; missing research information and an unscheduled review, both readable |

Captures contain fictional Acme Research Lab, Harbor Research and New Research
data in the isolated preview SQLite database. They use one pixel per CSS pixel,
ordinary scrolling and a crop that removes the development size selector.
Displayed dates use the preview device's local calendar date.

- Verified each research state and the separate overdue, due-soon and
  unscheduled timing messages. A no-concerns result does not hide an overdue date.
- Changed a saved thesis's risk level from low to high: the unsaved edit left
  the assessment unchanged; Save updated it immediately to Needs attention.
  Restoring and saving low risk returned the expected assessment. Review dates
  and last completed review stayed independent of those direct Board saves.
- Verified Enter expands and collapses How this is assessed, including the
  missing-score explanation and quiet assessment-version detail.
- Fixed a discovered collision with legacy health-card styles by naming every
  new class living-thesis-health-*. The new card now sizes to its content;
  the legacy styles remain unchanged. Final captures show the corrected layout.
- Loading, invalid data and failed refreshes cannot retain a reassuring stale
  assessment. Check again invokes the existing History read; focus, visibility
  and minute ticks refresh the clock, and new saved data receives a fresh clock.
- 529 tests pass: 188 core, 5 shared UI and 336 desktop, including 27 new tests.
  Coverage includes concern priority with retained information gaps, tiny score
  declines, formal score links, date boundaries, future records, local midnight,
  immutable input, saved-versus-draft state, real backup remapping/restart,
  refresh, failed reads and delayed responses. Existing navigation guards pass.
- Lint, typecheck, production build and git diff checks pass. Independent source
  review found no blocking issue. GitHub CI and Windows Build results are
  recorded on the pull request.

No schema, migration, backup-format, dependency or external-service change is
introduced. The assessment describes recorded research signals; it does not
verify evidence or recommend a transaction. Manual Windows UI, installer,
native window-close and assistive-technology checks remain deferred.

## History — Stage 8

Date: 2026-09-19. A single History card on the saved Thesis Board combines
completed reviews, decisions and formally linked business scores. The newest
five entries appear first; details and older entries expand on request.

| Evidence | View |
| --- | --- |
| [Desktop history](docs/screenshots/thesis-history-desktop.jpg) | 1100×720; concise recent entries, latest score and Add decision |
| [Small desktop changes](docs/screenshots/thesis-history-small.jpg) | 860×560; expanded review with readable before/after text |
| [Score details](docs/screenshots/thesis-history-score.jpg) | 1100×720; score change and the seven saved factor ratings |

Screenshots use fictional Acme Research Lab data in the isolated preview
SQLite database, at one pixel per CSS pixel, with the development size selector
cropped. The overview precedes a further fictional decision saved during QA.

- Verified review changes, decision reasoning and linked-review context,
  Show all history, first-score labeling and a later +20-point comparison.
- Verified Enter collapses and expands a native history disclosure. Review
  details remain readable with ordinary scrolling at the minimum desktop size.
- Verified adding a decision refreshes History immediately. Sidebar navigation
  opens the existing unsaved-decision dialog; Escape preserves the draft.
  Saving and reloading recovered the entry without changing thesis version 4.
- History reads existing records without changing the schema or format-5
  backup contract. Unlinked legacy scores are excluded. Direct Board edits and
  earlier archive cycles are not invented; the UI explains this coverage limit.
- 502 tests pass: 170 core, 5 shared UI and 327 desktop. The 35 new tests cover
  deterministic ordering, material changes, score provenance/deltas, corruption
  rejection, coherent read transactions, real backup remapping, restart,
  refresh, navigation guards, load retry and delayed stale responses.
- Lint, typecheck, production build and git diff checks pass. An independent
  source review found no actionable issues in the new paths. GitHub CI and
  Windows Build results are recorded on the pull request.

Manual Windows UI, installer interaction, native window-close behavior and
assistive-technology checks remain deferred.

## Decision Log — Stage 7

Date: 2026-09-12. A simple inline form on the saved Thesis Board records a
decision, its reason, and an optional completed-review link. Saved entries
are dated, read-only history. No new navigation tab or external API is added.

| Evidence | View |
| --- | --- |
| [Desktop form](docs/screenshots/decision-log-desktop.jpg) | 1100×720; readable fields and both save/cancel actions |
| [Small desktop form](docs/screenshots/decision-log-small.jpg) | 860×560; all three fields and both actions fit after ordinary scrolling |
| [Saved decision](docs/screenshots/decision-log-saved.jpg) | 1100×720; dated reason and linked completed review after reload |

Screenshots contain fictional Acme Research data from the isolated browser
preview. Captures use one pixel per CSS pixel and crop the development size
selector. Different example drafts demonstrate optional and linked reviews.

- Verified Add decision, entering a reason, selecting a completed review,
  Save and leave through the sidebar guard, and recovering the saved entry
  after reloading. Saving the decision left the thesis at version 2.
- Verified Escape keeps the draft in both navigation and cancellation
  dialogs. Explicit Discard decision closes the form and retains saved history.
- Fields use 16px normal-weight text; the empty-state prompt is hidden while
  the form is open. The existing Board layout and visual language are retained.
- Fixed an HTTP-preview UUID compatibility issue with a cryptographically
  random UUID v4 fallback. The production path and fallback are covered by tests.
- Added regression coverage for a pending review launch racing with a new
  decision and for a thesis switch requested during an existing decision save.
- 467 tests pass: 160 core, 5 shared UI, and 302 desktop. Real SQLite coverage
  includes migration, immutable entries, exact retry after a lost reply,
  parent/review integrity, restart recovery, backup remapping, and rollback.
  Lint, typecheck, and production build pass. The final helper-copy correction
  also passed the 24 Board and Decision Log interaction tests. GitHub CI and
  Windows Build results are recorded with the pull request.

Manual Windows UI, installer interaction, native window-close behavior, and
assistive-technology checks remain deferred. This browser pass does not replace
those checks. A combined history timeline remains a separate Stage 8 task.

## Complete review — Stage 6 part 3

Date: 2026-09-11. This extends the approved guided review layout with a final
confirmation and a saved-result message on the Board.

| Evidence | View |
| --- | --- |
| [Desktop confirmation](docs/screenshots/review-completion-desktop.jpg) | 1100×720; clear consequence, Complete review, and focused Keep editing |
| [Small desktop confirmation](docs/screenshots/review-completion-small.jpg) | 860×560; complete dialog and both actions visible |
| [Saved result](docs/screenshots/review-completion-saved.jpg) | 1100×720; completed status, updated version, and Start review available |

The screenshots use only fictional Acme Research data in the isolated preview
database. Captures retain one pixel per CSS pixel and crop the development
size selector; the production app is not resized.

- Walked through all six sections, changed the summary and confidence, and
  explicitly skipped a new score. The final preview showed those changes.
- Keep editing and Escape each closed confirmation without applying changes.
  Focus began on Keep editing. Both actions fit the minimum desktop frame.
- Confirming applied the review, returned to the Board with version 2 and a
  success message, and released the active review so another can be started.
- The integration test also verifies a new review date and cadence in the
  preview, completion request, current thesis, and revision. Native browser
  date entry was not confirmed during this visual pass.
- No application console errors were observed. Browser extension messages
  were excluded. No new visual or interaction blocker was found in these states.
- 413 tests pass: 139 core, 5 shared UI, and 269 desktop. Coverage includes
  failures after each write, full rollback and retry, lost-response recovery,
  stale/archived theses, immutable history, migration, and backup round trips.
- Lint, typecheck, and production build pass. Stale incremental build metadata
  from the local snapshot was cleared before the successful build; no build
  configuration or dependency lock changes were needed.

Manual Windows UI, installer interaction, native window-close behavior, and
assistive-technology checks remain deferred. The later timeline/decision
interfaces are outside this change.

## Historical draft UI assessment — Stage 6 part 2

Date: 2026-09-11

Scope: Phase 3 Stage 6, part 2. Implement the selected Guided Review direction
inside the existing desktop app, with the user's requested emphasis on simple,
easy-to-understand controls. This checks draft review; atomic completion is a
separate planned task.

## Visual evidence

| Evidence | Path | Dimensions / state |
| --- | --- | --- |
| Selected visual truth | [guided-review-reference.png](docs/screenshots/guided-review-reference.png) | 1487×1058 pixels; Thesis section |
| Browser implementation | [guided-review-large.jpg](docs/screenshots/guided-review-large.jpg) | 1487×1058 pixels; Thesis section, unsaved progress, optional cases collapsed |
| Full-view comparison | [guided-review-comparison.jpg](docs/screenshots/guided-review-comparison.jpg) | 2974×1094 pixels; reference and implementation together, with 36px captions |
| Focused comparison | [guided-review-focused-comparison.jpg](docs/screenshots/guided-review-focused-comparison.jpg) | 1899×824 pixels; editor typography, fields, optional details, and save actions |
| Small desktop | [guided-review-small.jpg](docs/screenshots/guided-review-small.jpg) | 860×560 pixels; scrolled to notes, focused input, saved state and visible action bar |
| Proposed-change preview | [guided-review-draft-preview.jpg](docs/screenshots/guided-review-draft-preview.jpg) | 1100×720 pixels; summary comparison, explicit score skip, saved draft |

The source raster is treated as a 1487×1058 CSS-pixel visual target. The real
app was rendered in the cloud browser inside an iframe at exactly that CSS
size. Its screenshot was captured at one output pixel per CSS pixel. Only the
56px development size-selector header was removed; the app image was not
stretched or independently resized for comparison. The smaller frames use
their listed CSS sizes and the same 1:1 normalization.

The focused comparison crops source coordinates (551,272)–(1463,994) and
implementation coordinates (500,270)–(1487,1058), retaining their original
scale with bottom padding. It includes the complete implementation action bar.
The full comparison supplies the layout context for these different crops.

Both large images show Acme Research, the same thesis title, quarterly reason,
summary, and review notes. Example research is fictional. The development
frame labels that provenance outside the app. The production Board still
requires real saved records; it does not auto-insert demo research.

## Findings

No actionable P0/P1/P2 findings remain in the checked review states.

| Fidelity surface | Assessment |
| --- | --- |
| Fonts and typography | Retains the app's existing font stack and navigation rather than replacing them with the generated reference's approximate lettering. Review inputs use 16px text and 1.5 line height; labels and supporting text have distinct weights. Full and focused comparisons show readable hierarchy and wrapping without clipped field text. Platform font fallback and antialiasing can vary on Windows and remain a manual-check gap. |
| Spacing and layout rhythm | Keeps the reference's header, thesis context, section rail, editor, and bottom save controls. Uses a 220px step rail, 20px rail/editor gap, 28px large editor padding, and 16px card corners. Existing app navigation is narrower than the generated reference, intentionally preserving the surrounding product. At smaller desktop sizes, steps become a compact grid and secondary header metadata is hidden to retain editing space. |
| Colors and visual tokens | Uses the existing dark/teal app direction with muted blue-gray helper text, teal current-step/saved states, and amber unsaved states. State labels accompany color. Existing shared button treatment is retained. This was a visual/focus check, not a comprehensive automated contrast or screen-reader audit. |
| Images and assets | Existing app brand/navigation assets remain in place. No new decorative raster assets are needed for this form. Numbered section markers communicate actual step order. Clear text actions replace the mock's decorative arrow marks; no new image assets are approximated in CSS or inline SVG. Screenshot JPEG compression is QA evidence only, not part of the product UI. |
| App-specific copy | Uses “Reason,” “Business score,” “Your assessment,” and “Review draft”; explains catalyst and MBS; marks optional fields; identifies the next section on its button. Save status explicitly distinguishes saved/unsaved work. The preview explains that these are proposed changes and the current thesis is unchanged. These departures from the mock serve the user's requested ease of use. |

## Comparison history

1. **[P2, fixed] Helper text ran into the first field.** The existing global
   `.content-area p` rule overrode the review helper margin. Added a scoped
   `.guided-review .review-section-help` rule with a 30px bottom gap. The final
   full and focused comparisons show a clear separation before Thesis title.
2. **[P2, fixed] Compact desktop header consumed editing space and wrapped
   persistent save controls.** The initial 860×560 check exposed an overly tall
   context card, multi-line section navigation, and a wrapped footer. Reduced
   compact header spacing, hid secondary context metadata, arranged steps in a
   grid, and kept the save controls on one line with 44px minimum button
   targets. The final small-desktop screenshot shows an editable notes field,
   optional details, and both save/next actions inside the frame. Ordinary
   vertical scrolling is retained for long sections.
3. **[P2, fixed] Field hints became part of long accessible names.** Replaced
   wrapping labels with explicit label/control IDs and separate
   `aria-describedby` hints. Browser DOM checks now identify Summary and
   Review reason by their plain labels; interaction tests use those names.

Each issue was checked again after the fix. The linked final browser captures
and combined comparisons are the post-fix visual evidence. No earlier failing
image is used as the final implementation reference.

## Interactions and checks

- In the cloud browser: Start/Resume review, edit reason/summary/notes, move
  through all six sections, explicitly skip a score, inspect proposed changes,
  and save through the actual local storage service in the example workspace.
- Checked large (1487×1058), desktop (1100×720), and minimum desktop (860×560)
  frames. This does not introduce or claim mobile support.
- Keyboard Enter activated navigation; the leave dialog focused Continue
  editing, and Escape dismissed it while keeping the draft. Native dialog
  semantics supply modal focus behavior; a full assistive-technology audit
  was not performed.
- Application console errors checked: none observed. Browser extension errors
  from a `chrome-extension://` content script were excluded from app findings.
- All 359 tests passed: 115 core, 5 shared UI, and 239 desktop tests. Thirteen
  new tests cover review UI and IPC, with real SQLite restart, conflict,
  validation, partial-score, and failure-recovery scenarios.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed. Dependency
  installation used the frozen lockfile with lifecycle scripts disabled in
  this environment; the lockfile is unchanged.

## Open questions and test gaps

- Manual Windows app interaction, installer behavior, native window-close
  confirmation, and Windows font rendering remain deferred. A successful
  Windows packaging workflow does not replace those checks.
- Applying a completed review to the current thesis requires the next planned
  atomic-completion/storage stage. The UI intentionally supports draft saves
  and resume only at this stage.

## Implementation checklist

- [x] Connect the selected layout to the existing app and persisted sessions.
- [x] Use plain labels, optional details, numbered progress, and visible save status.
- [x] Protect unsaved navigation and retain drafts after failed/conflicting saves.
- [x] Compare the reference and browser implementation together at equal scale.
- [x] Resolve observed P2 issues and verify desktop frame sizes.
- [x] Run repository lint, type checks, tests, and production build.
- [ ] Perform manual Windows UI/installer checks when that work is resumed.

## Follow-up polish

No required P3 changes are recorded. Platform-specific font rendering can be
reviewed during the deferred Windows interaction pass.

final result: passed
