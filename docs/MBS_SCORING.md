# Manual Business Score

The Manual Business Score (MBS) is a deterministic educational scoring model in `packages/core`. It helps future offline workflows summarize user-entered business quality criteria without using live market data, AI analysis, brokerage integrations, or personalized financial advice.

## Categories And Weights

Each category accepts a number from 0 to 10 when provided. Higher numbers mean the user scored that criterion more favorably. For `risk`, a higher score means lower user-perceived risk or better risk control.

| Category | Weight |
| --- | ---: |
| `businessQuality` | 20 |
| `moat` | 15 |
| `management` | 15 |
| `balanceSheet` | 15 |
| `growth` | 12 |
| `valuation` | 13 |
| `risk` | 10 |

Weights total 100, so the weighted score is normalized to a 0-100 output.

## Input Rules

- Every category is optional.
- Provided category values must be finite numbers from 0 to 10.
- Missing categories are listed in `missingCriteria` and produce an `incomplete` rating.
- Invalid category values are excluded from the weighted score and returned in `errors`.
- `notes` is optional text and does not affect the score.

## Output

`calculateMbsScore()` returns:

- `score`: weighted 0-100 score, rounded to two decimals.
- `maxScore`: always `100`.
- `percentage`: score as a 0-100 percentage.
- `rating`: educational rating band.
- `completedCriteria`: count of valid numeric category inputs.
- `missingCriteria`: categories not provided.
- `warnings`: non-fatal scoring warnings.
- `errors`: invalid category inputs.
- `input`: original score input.

## Rating Bands

Ratings are non-advisory labels for the manual score output.

| Rating | Rule |
| --- | --- |
| `incomplete` | Any category is missing or any category value is invalid |
| `weak` | Complete score below 40 |
| `mixed` | Complete score from 40 to below 65 |
| `strong` | Complete score from 65 to below 85 |
| `exceptional` | Complete score of 85 or higher |

## Limitations

- The score is based only on manually entered criteria.
- The score does not use live stock prices, fundamentals, filings, analyst reports, or external APIs.
- The score does not execute trades or connect to brokerage accounts.
- The score is not personalized financial advice, investment advice, or a recommendation to buy, sell, or hold any security.
- Future UI and persistence stages should treat this as deterministic domain logic from `packages/core`.
