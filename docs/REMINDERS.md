# Reminders

The Reminders screen is a Phase 1 offline MVP screen for manually tracking
thesis review, earnings, and custom reminder dates. It is local, user-entered,
persisted on this device through the Electron storage boundary, and educational
only.

## Behavior

Users can manually add, edit, select, complete, reopen, and remove local
reminders with:

- title
- reminder type: earnings, thesis-review, or custom
- optional ticker
- due date
- optional note
- completed status

The screen shows a local table of reminders and a selected reminder detail view.
Reminders are loaded from and saved to the local SQLite-backed `reminders`
repository through the preload/IPC API. Transient UI state, such as the selected
reminder and in-progress form fields, remains in React state.

## Persistence

Reminders are persisted locally through `window.thesisInvesting.reminders`.
SQLite access stays in the Electron main process; the React renderer does not
import raw SQLite or `node:sqlite`.

Persisted fields include:

- title
- reminder type
- optional ticker
- due date
- optional note
- completion state

The UI uses a boolean completed/open control. Storage represents completion with
`completedAt`: marking a reminder complete sets a local ISO date, and reopening
a reminder clears `completedAt`.

## Validation

The screen converts form fields into the `Reminder` domain model and validates
with `validateReminder()` from `packages/core`. Validation covers missing title,
invalid due date format, unsupported reminder type, and invalid ticker symbols.

## Boundaries

The Reminders screen does not connect to external services. It does not infer
earnings dates automatically, create system notifications, run background
schedules, or integrate with calendars.

## Out Of Scope

- system notifications
- background scheduling
- live stock APIs, earnings APIs, or calendar integrations
- AI reminders or analyst commentary
- brokerage import or trading execution
- Supabase/auth/cloud sync
- personalized financial advice

## Non-Advisory Notice

Reminders are manually entered by the user for educational organization. They
are not financial advice, investment advice, or recommendations to buy, sell, or
hold any security.
