# Manual MBS Scorer Screen

Phase 1, Stage 7 adds the first user-facing Manual Business Score workflow to the desktop app. The screen lives behind the MBS Scorer navigation item and uses deterministic scoring from `packages/core`.

## Behavior

- Users manually enter category values from 0 to 10.
- Categories are business quality, moat, management, balance sheet, growth, valuation, and risk.
- Optional notes can capture scoring context.
- Notes do not affect the score.
- The score output includes score, max score, percentage, rating, completed criteria, missing criteria, warnings, and validation errors.
- Missing and invalid values are handled by `calculateMbsScore()` from `packages/core`.

## Local Persistence

Phase 1, Stage 22 adds local persistence for completed MBS score snapshots.

The screen still keeps in-progress category values and notes in React state. Incomplete draft autosave is not included in this stage.

When all scoring criteria are complete, the user can save a score snapshot. Saved snapshots are persisted locally through SQLite using the narrow `window.thesisInvesting.mbsScoreSnapshots` preload API. The React renderer does not import SQLite or `node:sqlite` directly.

Persisted snapshots include:

- manual category inputs
- optional notes
- optional selected thesis, ticker, and company context
- score, max score, percentage, rating, and completed criteria
- created date

Scoring logic remains in `calculateMbsScore()` from `packages/core`. Storage records the completed output and does not add live fundamentals, AI scoring, or recommendation logic.

## Safety

The scorer uses manually entered values only. It does not use live stock data, AI analysis, brokerage integrations, trading execution, or cloud sync.

The score is educational and non-advisory. It is not financial advice, investment advice, or a recommendation to buy, sell, or hold any security.

## Limitations

- No incomplete draft autosave.
- No detailed Dashboard MBS snapshot history beyond local summary counts and latest score metadata.
- No snapshot delete/remove workflow yet.
- No portfolio ranking or comparison workflow.
- No live market data or external APIs.
- No AI analyst features.
