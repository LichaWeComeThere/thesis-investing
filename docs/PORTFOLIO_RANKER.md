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

The screen ranks the currently displayed entries by the manually entered score,
highest first. Search and filters update both the idea cards and ranking output,
including the ranked count, leader and weakest idea. Matching demo ideas beyond
the initial four are included; an empty result has no ranked ideas.
Ties keep the original input order so repeated calculations are deterministic.
Rows with missing scores are shown as incomplete. Rows with invalid tickers or
scores outside 0 to 100 are shown as invalid and are not ranked ahead of valid
entries.

## Boundaries

The ranking helper lives in `packages/core` so it can stay pure and testable.
The desktop screen converts local React text fields into the core input model.
No scoring or ranking rules are duplicated in the UI.

## Local Persistence

As of Phase 1 Stage 21, Portfolio Ranker inputs are persisted locally through
SQLite. Persistence follows the same Electron main / preload / renderer
boundary used for Watchlist, Thesis Notes, and Reminders.

Persisted fields per row:

- stable row ID
- ticker (normalized to upper case through the repository)
- optional company name
- optional manual score (0 to 100)
- optional notes

Users open **Edit details**, make changes, and choose **Save changes** or
**Cancel**. Save validates the ticker and any entered score, then waits for
storage to confirm success before updating the card or closing the editor.
An empty score is allowed and leaves the idea incomplete. Invalid details or a
failed write keep the draft open with an error so the user can correct or retry
it. Stored normalization, including trimmed text and uppercase tickers, is
reflected on the card after a successful save.

While a draft has changes, switching ideas, adding, removing and clearing are
disabled. Search and filters are disabled while an editor is open. Sidebar
navigation and the Re-evaluate thesis shortcut offer **Save and leave**,
**Discard edits and leave**, or **Continue editing**. Save and leave navigates
only after success. Fields and repeated actions are locked while a write is
running. The renderer also guards reload/window close while dirty or saving;
native Windows interaction remains a separate manual verification step.

Both Add idea buttons clear active search and filters, reveal the full list,
and open and focus the new row. New input is not persisted until Save succeeds.

Demo rows are shown when no rows have been persisted yet; once any row has
been saved, the screen shows only persisted rows on subsequent reloads.
Removing a row also removes it from storage. "Clear entries" removes every
persisted row and resets the screen to the demo defaults.

Storage path:

- renderer: `apps/desktop/src/renderer/src/portfolioRankerStorageClient.ts`
- shared IPC channels and types: `apps/desktop/src/shared/portfolioRankerStorage.ts`
- main process IPC: `apps/desktop/src/main/portfolioRankerIpc.ts`
- main process service: `apps/desktop/src/main/portfolioRankerStorageService.ts`
- repository: `storage.repositories.portfolioRankerItems`
- preload bridge: `window.thesisInvesting.portfolioRanker`

Ranking output continues to be derived from the current in-memory row state
through the pure `rankManualPortfolioItems` helper. Ranking has no dependency
on storage.

## Out Of Scope

- live stock prices or market data
- brokerage import or trading execution
- holdings or owned-position workflows
- named ranker snapshots or history
- relationship linking between ranker rows and thesis notes
- watchlist or thesis note workflows
- AI analysis or recommendations
- personalized financial advice

## Non-Advisory Notice

The Portfolio Ranker organizes user-entered scores for educational purposes.
It is not a buy, sell, or hold recommendation and should not be treated as
personalized financial advice.
