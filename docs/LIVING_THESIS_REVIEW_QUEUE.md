# Review Queue

Phase 3 Stage 10 adds **Needs review** to Overview. It is a read-only view of
saved Living Theses, their validated history, and unfinished review sessions.
It helps the user decide what research to revisit; it does not rank investments.

## User experience

One thesis appears at most once, in the first applicable group:

1. **Continue a review** — a saved in-progress review.
2. **Overdue** — the explicitly saved review date is before today.
3. **Due soon** — the review date is today or within the next seven calendar days.
4. **Research concerns** — a saved high overall risk, open high-severity risk,
   or a decrease between eligible completed-review scores.

Each row retains its scheduling information and research-concern explanations
separately, even when an unfinished review determines its group. A late date
never implies worsening research. Missing information alone does not become a
research concern, and no score threshold or hidden priority score is added.

Paused and archived theses are excluded. Draft, active, and monitoring theses
remain eligible. A thesis with no matching reason is absent from the queue;
absence does not establish its quality or completeness. Review cadence never
invents a next-review date. No manual reminder or example-company data is used.

Within a group, unfinished reviews sort by the oldest saved update, and date
groups sort by the earliest due date. Company name and stable thesis ID break
ties using deterministic ordinal comparison. Research concerns sort by company
name and stable ID. Group precedence describes a workflow, not investment merit.

**Open thesis** selects the exact saved thesis. **Resume review** reads and opens
the exact saved session; it never starts another session. Existing stale-baseline
warnings and draft/navigation protections remain in force. If the selected
thesis or review has disappeared or changed, the workspace reports that instead
of opening a different record or silently creating a review.

## Data and time boundaries

The core builder accepts explicit `referenceTime` and local calendar `today`
values. It reuses the Stage 9 health evaluator and formal completed-review score
links. Unsaved edits and unfinished score drafts do not change research concerns.
Future historical events follow the existing health rules; future current
theses or active-session timestamps cannot be assessed as current saved data.

Electron main validates the local date and reads current theses, validated
history, and active sessions together in one SQLite transaction. A narrow
`reviewQueue.get(today)` preload/IPC operation returns the derived view. Invalid
saved relationships or read failures produce an error, not a false empty queue.

Overview refreshes when entered, on window focus, and as the local day changes,
with a manual refresh action. Loading, unavailable preview, empty, and error
states are explicit. A failed refresh cannot present old rows as current.

This stage adds no table, persisted priority, migration, background notification,
backup-format change, external API, or automatically generated review. Format 5
backups already contain all records used by the queue.

## Verification

Core tests cover group precedence, overlapping reasons, deterministic ordering,
calendar boundaries, exclusions, malformed context, and saved-session identity.
Storage tests verify consistent reads, relationship validation, errors and retry,
and the absence of writes. UI and navigation tests exercise exact target IDs,
saved-draft recovery, stale results, refresh, error recovery, and edit guards.

Validation passed: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`
(631 tests: 204 core, 7 shared UI, 420 desktop).

Browser verification used fictional records in the isolated review preview:
exact thesis selection and focus, saved review resumption, Save and leave draft
recovery, overdue and due-soon rows, separate research concerns, and keyboard
access at desktop and 860 × 560 window sizes.

- [Desktop queue](screenshots/review-queue-desktop.jpg)
- [Compact window with keyboard focus](screenshots/review-queue-small.jpg)

Hands-on Windows interaction remains deferred; CI and Windows Build results are
reported in the pull request.
