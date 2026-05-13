# Portfolio Ranker

The Portfolio Ranker is a Phase 1 offline MVP screen for comparing manually
entered holdings or investment ideas. It is local, deterministic, and
educational only.

## Behavior

Users can enter:

- ticker
- optional company name
- manual score from 0 to 100
- optional notes

The screen ranks valid entries by the manually entered score, highest first.
Ties keep the original input order so repeated calculations are deterministic.
Rows with missing scores are shown as incomplete. Rows with invalid tickers or
scores outside 0 to 100 are shown as invalid and are not ranked ahead of valid
entries.

## Boundaries

The ranking helper lives in `packages/core` so it can stay pure and testable.
The desktop screen converts local React text fields into the core input model.
No scoring or ranking rules are duplicated in the UI.

## Out Of Scope

- live stock prices or market data
- brokerage import or trading execution
- portfolio persistence
- watchlist or thesis note workflows
- AI analysis or recommendations
- personalized financial advice

## Non-Advisory Notice

The Portfolio Ranker organizes user-entered scores for educational purposes.
It is not a buy, sell, or hold recommendation and should not be treated as
personalized financial advice.
