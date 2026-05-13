# First-Run Onboarding

Phase 1, Stage 6 adds a first-run onboarding screen to the desktop app. The flow appears before the main placeholder navigation shell until the user completes it.

## Purpose

The onboarding screen frames Thesis Investing as:

- Educational software for organizing an investing discipline.
- A Windows-first, offline-first desktop app.
- A user-directed workspace built around manual input.
- Not financial advice, investment advice, or a recommendation system.
- Not a brokerage and not a trading execution platform.

## Local Completion State

Onboarding completion is stored in renderer `localStorage` using a small helper in `apps/desktop/src/renderer/src/onboardingState.ts`.

This choice keeps Stage 6 small and avoids wiring the SQLite storage boundary into visible product workflows before those workflows exist. The helper is isolated so a future desktop preference layer can replace `localStorage` without changing the onboarding screen's copy or flow.

## Reset

The Settings/About placeholder includes a simple reset action. It clears the local completion flag and returns the app to onboarding.

## Limitations

- No database-backed preferences yet.
- No account, sync, or cloud state.
- No product workflows are unlocked by onboarding.
- No live stock APIs, AI analyst features, brokerage integrations, or trading execution.
- The copy is educational and non-advisory.
