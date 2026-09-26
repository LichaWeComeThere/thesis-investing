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
