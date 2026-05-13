# Manual MBS Scorer Screen

Phase 1, Stage 7 adds the first user-facing Manual Business Score workflow to the desktop app. The screen lives behind the MBS Scorer navigation item and uses deterministic scoring from `packages/core`.

## Behavior

- Users manually enter category values from 0 to 10.
- Categories are business quality, moat, management, balance sheet, growth, valuation, and risk.
- Optional notes can capture scoring context.
- Notes do not affect the score.
- The score output includes score, max score, percentage, rating, completed criteria, missing criteria, warnings, and validation errors.
- Missing and invalid values are handled by `calculateMbsScore()` from `packages/core`.

## Local State

The screen uses local React state only. Scores and notes are not persisted yet, and the screen does not read from or write to SQLite.

## Safety

The scorer uses manually entered values only. It does not use live stock data, AI analysis, brokerage integrations, trading execution, or cloud sync.

The score is educational and non-advisory. It is not financial advice, investment advice, or a recommendation to buy, sell, or hold any security.

## Limitations

- No saved score history.
- No persistence wiring.
- No portfolio ranking or comparison workflow.
- No live market data or external APIs.
- No AI analyst features.
