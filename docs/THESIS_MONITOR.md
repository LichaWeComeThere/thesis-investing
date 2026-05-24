# Thesis Monitor

The Thesis Monitor is a Phase 1 offline MVP screen for writing and reviewing
user-authored thesis notes. It is local, manual, persisted on the user's device,
and educational only.

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

Title, body, status, optional ticker, optional conviction, and optional review
due date are persisted through the local SQLite storage boundary.

The optional review checklist is current-session text only in this stage. It is
not persisted because it is not represented in the core `ThesisNote` model or
SQLite schema yet.

## Validation

The screen converts form fields into the `ThesisNote` domain model and validates
with `validateThesisNote()` from `packages/core`. Validation covers required
title and body values, supported thesis statuses, ticker format, and review date
format.

## Boundaries

Thesis note persistence is owned by the Electron main process. The React
renderer calls a narrow preload API exposed as
`window.thesisInvesting.thesisNotes`; it does not import SQLite or `node:sqlite`
directly.

The SQLite repository normalizes ticker symbols and validates data before
writing. Storage failures should show an error in the Thesis Monitor screen
without crashing the app or silently deleting user input.

The screen does not connect to external services.

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
