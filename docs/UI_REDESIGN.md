# Research workspace interface redesign

## Purpose

Feature development is paused for an app-wide interface redesign. The app now
uses a quiet research-desk layout: warm neutral canvas, dark readable text,
forest-green primary actions, flat surfaces, and restrained borders. Navigation
and screen names describe the task rather than internal implementation names.

## Information architecture

| Group | Screen | Purpose |
| --- | --- | --- |
| Workspace | Overview | Choose a next action and see accurately scoped saved-tool counts |
| Workspace | Theses | Write an investment case, review it, and see decisions and history |
| Workspace | Watchlist | Keep companies to research |
| Workspace | Reminders | Manage saved research reminders |
| Research tools | Score a company | Complete and save a manual business assessment |
| Research tools | Compare ideas | Compare separately saved manual scores |
| Research tools | Research notes | Capture observations and conviction |
| Research tools | Themes | Browse included reference themes |
| Footer | Settings | Back up, import, and inspect local storage |

Existing route IDs remain stable. Tools are not newly linked to Living Theses.
This work does not implement the next roadmap stage, change the scoring formula,
add an external API, or change storage/backup formats.

## Interaction decisions

- Overview prioritizes opening Theses. It no longer displays a fabricated market
  feed or sample activity as the user's current research. Unavailable counts are
  not shown as zero. Tool totals explicitly exclude Living Theses/reviews/decisions.
- Theses has a searchable list and a clearly identified selected company.
  Essential fields come first; assessment and supporting research are native
  disclosures. Invalid fields reveal their section before focus moves to them.
- Watchlist and Research notes display saved records first. Example details are
  inside explicitly named disclosures. Comparison samples are visibly labeled.
  Notes show their actual conviction instead of a fabricated numerical score.
- Backups are visible before storage implementation details. Error details open
  automatically and remain open through retry, so focused controls do not vanish.
- Navigation preserves the existing Save / Discard / Continue editing guards.
  The compact menu supports Escape and restores focus; route changes focus the
  main content, and a skip link provides direct keyboard access.
- Forms reflow to available width. Short review windows use an ordinary footer
  so actions do not obscure fields. Shared controls have visible focus and tested
  text/primary-action/input-boundary contrast.

## Validation and evidence

- 566 tests passed: 188 core, 7 shared UI, 371 desktop.
- Lint, TypeScript checks, production build, and whitespace checks passed locally.
- Added shell focus and storage-disclosure interaction tests, contrast checks,
  thesis disclosure behavior, and saved/example provenance regressions.
- Browser checked Overview, Watchlist, Reminders, Score a company, Compare ideas,
  Research notes, Themes, and Settings at 860 × 560: one primary heading per
  screen and no main-content horizontal overflow. Theses and guided review were
  inspected at 1100 × 720 and 860 × 560. Compact navigation and Settings were
  inspected at 390 × 844; this is responsive desktop reflow, not a mobile release.
- Browser verified comparison filter results, new-entry focus/filter clearing,
  Escape preserving edits, Save and leave, persistence after refresh, a saved
  review draft, and moving to the next guided review section.
- The preview uses an isolated SQLite file and fictional Acme Research data.
  It now exposes the existing local tool services for realistic UI verification;
  native import/export dialogs are still desktop-only.
- Windows interactive UI/installer checks and native close/reload checks were
  not performed. GitHub CI and Windows Build results are reported on the PR.
  This is not a full assistive-technology or WCAG audit.

| Evidence | Screenshot |
| --- | --- |
| Overview and grouped navigation | [Overview](screenshots/ui-redesign-overview.jpg) |
| Searchable Theses and selected research | [Theses](screenshots/ui-redesign-theses.jpg) |
| Guided review in a small desktop window | [Review](screenshots/ui-redesign-review-small.jpg) |

The screenshots include the development size selector and surrounding browser
preview canvas. These are verification captures, not image mockups.

### Research notes layout correction

The follow-up fixes a legacy three-column minimum width that clipped Note
overview at laptop sizes. Research notes now uses its available content width
to switch between one, two, and three columns. In the two-column layout, Note
overview follows the editor. Long titles and status labels remain readable.

Browser measurements confirmed no main-content horizontal overflow at widths
390, 860, 1100, 1365, 1440, 1487, and 1600 pixels. A saved fictional note with a
long title and `Challenged` status was also checked at compact and wide sizes.
All 566 tests, lint, typecheck, production build, and whitespace checks passed.

The updated captures show the app directly, without the development size selector:

- [Research notes editor](screenshots/ui-redesign-research-notes.jpg)
- [Note overview after vertical scrolling](screenshots/ui-redesign-research-notes-overview.jpg)

### Research-session usability follow-up

The walkthrough used fictional Harbor Research data in the isolated preview:
create a thesis, save and resume a review, update the summary and risk assessment,
record a business score, complete the review, and save a decision linked to it.
The completed review, score, and decision are visible together in History.

The follow-up improves movement through those existing screens. New thesis opens
the first field with keyboard focus. Selecting a thesis or returning from review
restores the selected company heading. A View history shortcut makes reviews and
decisions easier to find, and completion moves to History. History remains in
view after its data loads without interrupting a user who has moved elsewhere.

At 1100 pixels and below, the thesis list sits above the full-width editor. The
860, 1100, and 1365 pixel checks showed no main-content horizontal overflow.
This work changes presentation and navigation only; storage and review semantics
are unchanged. Hands-on Windows and assistive-technology checks remain deferred.

The saved session was checked again after a browser refresh. New/create/cancel,
selected-thesis, review-return, completion, and decision save/cancel focus were
verified in the browser. All 578 tests passed (188 core, 7 shared UI, 383 desktop),
along with lint, typecheck, production build, and whitespace checks.

- [Selected thesis and History shortcut](screenshots/usability-thesis-navigation.jpg)
- [Completed research session in a small window](screenshots/usability-history-small.jpg)
