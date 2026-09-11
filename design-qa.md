# Guided Review design QA

Current completion QA is recorded below. The earlier draft UI assessment is
preserved as historical evidence.

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
