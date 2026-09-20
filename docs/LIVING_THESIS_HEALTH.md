# Living Thesis Health

## Status

Phase 3 Stage 9 adds a small Thesis Health section to the saved thesis workspace.
It explains research concerns, missing information, and review timing using
existing local records. Manual Windows UI verification remains pending.
Stage 10, Review Queue, is the next separate task.

The assessment is derived on read. There is no stored health score, new history
event, database migration, IPC channel, package, or external service. Database
migration 7 and export format 5 remain current.

## Using Thesis Health

Select a saved thesis on the Board. The section is based on saved research and
keeps **Research** and **Review timing** separate. Read the short assessment
and its reasons; expand the details for information gaps and the rules used.

The section is informational. Editing a thesis, saving a review draft,
completing a review, and adding a decision retain their existing explicit
workflows. An unfinished review or unsaved Board edit cannot change this
assessment. Saving current research or completing a review refreshes the
saved-record view. Time-sensitive results also refresh on a minute interval
and when the app window regains focus.

## Research Rules — Algorithm Version 1

The evaluator checks the current saved thesis and eligible completed reviews.
The result has stable reason codes and readable explanations; it is not a
numeric health score.

| Result | Rule |
| --- | --- |
| `needs_attention` | At least one concrete concern below is recorded. This result takes precedence over information gaps, but the gaps remain visible. |
| `insufficient_information` | There is no concrete concern, but at least one required information gap below remains. |
| `no_flagged_concerns` | There is at least one completed review, the checked risk information is rated, and none of the defined concerns is present. This describes only the recorded signals checked by these rules. |

Concrete concerns are:

- The saved overall risk level is **high**.
- A current **open** risk has **high** severity. Resolved and retired risks
  do not trigger this rule.
- The latest eligible review-linked business score decreased from the previous
  eligible score. Any negative change qualifies; the explanation states the
  exact change in score points. There is no additional five-point threshold.

Required information gaps are:

- No eligible completed review has been recorded.
- The current overall risk level is **unrated**.
- At least one current open risk has **unrated** severity.

Each missing-information reason remains available even if a concrete concern
already makes the overall research result `needs_attention`.

Fewer than two eligible scores is a visible comparison limitation. It does not
by itself force `insufficient_information`: a completed review may explicitly
skip scoring. A first score has no inferred previous score or synthetic change.
Skipping a score in a later review preserves comparison with the previous
eligible score; it does not reset score history.

Lifecycle, user conviction, free-text notes, catalysts, due dates, and positive
score movement do not establish that research is healthy, stable, improving,
or weakening. The evaluator does not interpret prose or infer contradictory
evidence that the user has not recorded. A missing or empty risk list does not
by itself establish safety. The overall risk rating and completed-review
requirements still apply.

## Review Timing

Timing is independent of research status. Being overdue never creates a
research concern or changes its assessment.

| Saved schedule relative to the supplied local calendar date | Timing |
| --- | --- |
| Before today | Overdue, with the number of days |
| Today | Due today |
| 1–7 days ahead, inclusive | Due soon |
| More than 7 days ahead | Scheduled |
| No saved `nextReviewAt` | Not scheduled |
| Lifecycle is paused | Paused; reminders suppressed |
| Lifecycle is archived | Archived; reminders suppressed |

Paused and archived theses retain their saved due date and last completed
review as context. Their lifecycle does not turn research concerns into a
positive assessment. Draft theses use their recorded schedule normally;
research still needs completed-review evidence under the same rules.

Only the explicitly saved `nextReviewAt` establishes a due date. The optional
review cadence does not silently create a schedule. Completing a review keeps
the date entered in that review; this stage does not rewrite it automatically.

Last-review context uses the most recent eligible completed review. A direct
Board save, decision entry, unfinished draft, or abandoned session does not
count as a completed review. The parent's `updatedAt` is not a last-review
timestamp.

## Inputs, Time, And Integrity

The pure evaluator in `packages/core` receives a reference UTC timestamp and
an explicit local calendar date. It does not read a runtime clock itself.
Calendar-day comparisons use the supplied date, avoiding elapsed-hour and
daylight-saving errors. The UI supplies its current local date and time.

The existing History read path loads the saved parent, completed sessions,
revisions, decisions, and required score snapshots in one transaction. Its
read model includes a cloned current thesis, allowing health to use coherent
saved state. Health does not combine a separately loaded thesis version with
old history or use the Board's editable draft as current evidence.

Only scores connected through a validated completed session and matching
revision are eligible. A matching ticker, company name, or legacy `thesisId`
alone cannot create a formal relationship. Scores use History's deterministic
ordering: exact UTC creation time descending, then snapshot ID ascending for
ties. Ties do not claim a finer real-world chronology than the saved records.

Historical records later than the supplied reference time are excluded.
The latest and previous eligible scores, and their change, are recalculated
after that exclusion. The evaluator rejects invalid dates, mismatched thesis
context, and a current thesis dated after the reference time. An invalid or
unavailable saved-record result is an error, not an empty assessment or a
reassuring no-concerns label.

Algorithm version 1 identifies these rules. It is returned with the derived
result and explained in the details; it is not added to the database or old
review records.

## Coverage And Persistence

Current saved risks and overall risk level may include direct Board edits.
History still records completed-review revisions rather than every direct
edit, so the assessment is not a complete historical audit. Decisions supply
history context but are not interpreted as automatic research signals.

The assessment is derived again after restart or import. Format 5 already
includes its persisted inputs. Older compatible backups with no formal review
history yield missing-information messages rather than invented reviews or
adopted legacy scores. No new backup field or persisted health cache is needed.

## Verification

Verification should cover concern precedence with retained information gaps,
unrated and resolved risks, first and skipped scores, small negative changes,
zero changes, formal versus legacy links, and equal score timestamps. A
review completed without a score must remain a valid source of review context.

Date coverage includes overdue, today, day 1, day 7, day 8, unscheduled, paused,
archived, local midnight, and future records. UI checks cover saved-state
refresh, loading and retry failures, accessible expandable details, and clear
separation between research concerns and due reminders. Opening or refreshing
the section must leave stored research unchanged.

Manual Windows checks remain pending for reading the section, expanding its
details, and confirming refresh after save and review completion. Automated
Windows builds do not establish interactive desktop behavior.
