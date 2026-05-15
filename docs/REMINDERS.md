# Reminders

The Reminders screen is a Phase 1 offline MVP screen for manually tracking
thesis review, earnings, and custom reminder dates. It is local, user-entered,
and educational only.

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
Reminders are held in React state only for this stage.

## Validation

The screen converts form fields into the `Reminder` domain model and validates
with `validateReminder()` from `packages/core`. Validation covers missing title,
invalid due date format, unsupported reminder type, and invalid ticker symbols.

## Boundaries

The Reminders screen does not persist to SQLite yet and does not connect to
external services. It does not infer earnings dates automatically, create system
notifications, run background schedules, or integrate with calendars.

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
