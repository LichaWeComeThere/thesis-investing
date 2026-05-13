# Thesis Monitor

The Thesis Monitor is a Phase 1 offline MVP screen for writing and reviewing
user-authored thesis notes. It is local, manual, and educational only.

## Behavior

Users can manually create and edit local thesis notes with:

- title
- optional ticker
- thesis body
- thesis status
- optional conviction
- optional review due date
- optional review checklist

The screen shows a local list of thesis notes and a selected note detail view.
Thesis status is controlled by the user with the neutral domain statuses:
`draft`, `active`, `watch`, `challenged`, `broken`, and `closed`.

## Validation

The screen converts form fields into the `ThesisNote` domain model and validates
with `validateThesisNote()` from `packages/core`. Validation covers required
title and body values, supported thesis statuses, ticker format, and review date
format.

## Boundaries

Thesis notes are stored in local React state only for this stage. The screen does
not write to SQLite yet and does not connect to external services.

## Out Of Scope

- live stock APIs
- automated news monitoring
- AI analyst commentary
- brokerage import or trading execution
- Supabase/auth/cloud sync
- full watchlist workflows
- personalized financial advice

## Non-Advisory Notice

Thesis Monitor content is user-authored and user-controlled. It is educational
software, not financial advice, investment advice, or a recommendation to buy,
sell, or hold any security.
