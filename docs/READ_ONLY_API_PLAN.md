# Phase 4 Stage 1 — Read-only API plan

Status: proposed implementation plan; Stage 1 is documentation only.
Reviewed against `main` at `8278166` (merged Phase 3 closeout). Provider sources
checked 2026-09-26, America/New_York. Prices and entitlements must be rechecked
when implementing. Manual Windows acceptance from Phase 3 remains deferred.

## First useful outcome

A saved thesis can display a small **Company details** section containing the
provider's company name, symbol, exchange, sector, and optional industry,
country, and currency. The user chooses when to load or refresh it. Their thesis
writing, manual score, decisions, and review workflow continue working offline.

Recommend **Alpha Vantage Company Overview as the first adapter candidate** for
an initial US-listed common-stock scope. This is a design recommendation, not a
validated account entitlement or a commitment to a subscription. Its published
free allowance suits occasional, explicitly requested lookups. Sector and
exchange availability must be verified against real entitled responses before
calling the integration ready.

Initial assumptions: personal research, modest numbers of companies, user-owned
API key, one configured provider. International listings, funds, and wider
commercial distribution need separate coverage/rights decisions. Unsupported or
missing information must remain visibly unavailable rather than inferred.

## Provider comparison

Use endpoint entitlements, not the size of a provider's advertised catalog, to
choose an adapter. The following is a planning snapshot, not a price guarantee.

| Candidate | Company details and coverage | Cost / usage evidence | Decision |
| --- | --- | --- | --- |
| Alpha Vantage | `OVERVIEW` documents company information for a requested equity; broader service also has statements and earnings endpoints. Verify the requested field mapping and selected US symbols in Stage 2. | Free service: 25 requests/day for most datasets [1–2]. Paid upgrades exist; no paid plan is needed to approve this architecture. | First candidate for low-volume manual lookup; strict quota budgeting matters. |
| Finnhub | `stock/profile2` is documented as the free profile variant; its industry classification must not silently be presented as a standardized sector [3]. | Current pricing/quota details could not be extracted from its official pricing page during this review. Treat exact allowance and market coverage as unverified, not as the frequently repeated 60/minute claim. | Alternative to evaluate if Alpha Vantage coverage or allowance is insufficient. |
| Twelve Data | Profile data includes company attributes; its support guide places `/profile` on Grow [4–5]. | Basic advertises 8 credits/minute and 800/day, but that does not establish profile entitlement. Grow starts at USD79/month on monthly billing; endpoint weights consume credits [4–6]. | Broader paid candidate; a free reference-data tier is not a free profile integration. |

**Why this recommendation:** occasional company lookups can fit a small daily
budget, and a single adapter keeps the first implementation manageable. This is
our inference from the documented offering, not a comparative quality benchmark.
We have not created accounts, purchased service, or tested user API keys. The
public Alpha Vantage demo request returned an informational message instead of a
profile, so it is not evidence of live field coverage.

Before a real connection is enabled, record the chosen plan's endpoint access,
allowed display use, attribution, retention, and export rights. Alpha Vantage's
published terms distinguish personal use from commercial use [7]. Do not infer
redistribution rights from a free key or from this repository being private.
Use synthetic fixtures in the repository; provider payloads and credentials do
not belong in commits, screenshots, or CI logs.

## User flow

1. In existing **Settings**, add **Data connection**. Explain: “Optional company
   details. Your theses work without a connection.” Offer one provider, a masked
   key field, **Save key**, and **Remove connection**. Saving validates the key’s local format and stores
   it locally; it does not claim the provider has accepted it.
2. In a saved thesis with a supported ticker, show **Load company details**.
   Explain once that the ticker is sent to the named provider. Loading spends a
   request only on this explicit action. Do not request on launch, sidebar
   navigation, focus, every keystroke, or every Library row.
3. Show returned company identity, exchange, and available attributes in a
   compact section. Include source and **Retrieved [date/time]**, plus
   **Refresh**. Retrieval time is not the provider's publication/update time.
4. A failed refresh leaves the last permitted cached result visible with its
   actual age and a short explanation. A tickerless thesis says **Add a ticker
   to look up company details**; all manual research controls remain usable.

No new sidebar destination is needed. Empty attributes read **Not provided**.
Do not show logos, remote images, provider HTML, or clickable provider-supplied
URLs in the first slice. The returned company identity helps the user spot a
mismatch; downloading never renames or rewrites the saved thesis. Field adoption
is a separate future feature. Existing Save/Discard/Continue editing guards
remain in charge of navigation, including an unsaved Settings key field.

## Data ownership and identity

`LivingThesis.id` stays the research identity. The current model has optional
`ticker` and `entityName`, but no exchange, sector, or provider identity. Multiple
theses may share one ticker. Provider metadata therefore belongs in a separate
read model and disposable cache, never in `LivingThesis`, review baselines,
score snapshots, revisions, or decision records.

Proposed normalized result:

```ts
type CompanyDetails = {
  schemaVersion: 1;
  provider: 'alpha-vantage';
  providerSymbol: string;
  companyName: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  retrievedAt: string;           // app's successful retrieval time, UTC
  sourceUpdatedAt: string | null; // only if explicitly supplied for this record
};
```

For the first provider, normalize and validate a bounded US ticker string, then
encode it as a query parameter. Accept only an exact provider-symbol match and a
nonempty company name. The initial US-only adapter also requires a recognized
supported US exchange and a common-stock asset type in the provider response.
Missing or conflicting identity evidence is an unsupported/unverified result,
not an accepted cache entry or a guessed match. Stage 2 must document the
provider values accepted for these checks using entitled responses.
Normalize documented missing-value sentinels to null. Do not map industry into
sector or substitute a similar symbol. Provider symbols are opaque outside
the adapter; future international support needs exchange-qualified identity.

Read the latest saved thesis by ID in main before lookup. Return the requested
thesis ID/ticker alongside the normalized result. The renderer discards an old
response if the selected thesis or saved ticker changed. Cache entries may be
shared for an exact provider symbol, but no user thesis content is shared or
sent upstream. Refresh never increments thesis version or changes MBS, Health,
Queue, reviews, decisions, or History.

## Architecture and proposed contracts

| Layer | Responsibility / proposed location |
| --- | --- |
| Renderer | Settings key entry and Company details states; use existing layout and shared UI. No direct provider calls. |
| Shared/preload | Narrow typed `companyDetails.getCached(thesisId)`, `companyDetails.refresh(thesisId)`, `dataConnection.status()`, `saveKey(key)`, `remove()` methods. No generic URL, headers, file path, or SQL arguments. |
| Main service | Validate IPC input and sender, resolve saved identity, enforce connection state, quotas, request cancellation, and result validation. Proposed `main/companyDetailsService.ts`. |
| Main adapter | Fixed HTTPS origin/path and Alpha Vantage mapping; proposed `main/providers/alphaVantageCompanyDetails.ts`. Receives a credential internally, never from a refresh request. |
| Local infrastructure | Separate credential store and disposable metadata cache, injected into service for tests. Core remains free of Electron, network, filesystem, and credentials. |

Continue the existing use-case boundaries in `src/preload/preload.ts`,
`src/shared/`, main IPC registration, and repository-backed thesis reads.
No SDK is required for the first JSON endpoint. Do not add a generic provider
framework for quotes/statements before those stages need their own contracts.

Result state must distinguish data availability from the most recent attempt:
`data: CompanyDetails | null`, `freshness: fresh | stale | unavailable`, and
`error: not-configured | unsupported | not-found | invalid-key | forbidden |
rate-limited | network | timeout | invalid-response | secure-storage-unavailable`.
Include a retry time only when supported by a response or known local policy.
Do not label all network failures “offline,” and do not treat HTTP 200 alone as
success: providers can return quota, entitlement, or informational JSON.

## Credentials and Electron readiness

The current app enables context isolation and renderer sandboxing in
`main/main.ts`. The inspected code does not yet provide a renderer CSP,
explicit navigation/new-window restrictions, or IPC sender-frame validation.
Before adding credentials/network, implement and test those boundaries using
Electron's security guidance [8]. Permit only the app's expected main frame;
keep development preview permissions separate from packaged behavior. Render
remote values as plain text, never executable markup.

Check Electron release support and plan any required version update before the
connected release. The repository currently declares Electron `^36.9.5`; the
installed types expose synchronous `safeStorage` methods, not the newer async
methods in today's documentation. Do not silently code against the latest docs
without checking the version actually shipped.

Credential-store design uses `safeStorage` after app readiness, with encryption
availability checked. On Linux reject `basic_text`; do not enable plaintext
fallback. Windows protection uses DPAPI and does not protect against other
applications running as the same user [9]. This is local at-rest protection,
not a way to conceal a shared application secret in a distributed desktop app.

Use each user's own key. Store only encrypted bytes in an atomically replaced,
restricted-permission file under userData, outside the research database and
backup export. Clear the renderer key field after submission; never return the
stored key over IPC. Status exposes configured/unavailable, not the secret.
Handle failed decryption with **Enter your key again**. Removing a connection
cancels pending work, deletes encrypted credentials and provider cache, and
keeps saved research intact. A late response cannot recreate a removed cache.

Alpha Vantage's documented request includes the key in its query [1]. Build that
URL only in main, reject redirects, and log only a safe error code/provider/
endpoint category. Never log URLs, headers, raw payloads, or raw exception
objects that can contain keys. Keys are excluded from diagnostics and exports.

## Request budget, cache, and offline operation

These numbers are proposed app policy, not additional promises from providers:

- One outgoing request at a time; coalesce simultaneous requests for the same
  symbol. Bound the queue to five user requests. Each request has a ten-second
  timeout and a one-megabyte response limit. Cancel work on disconnect/shutdown.
- No automatic retries in the first slice. On HTTP 429, honor a valid
  `Retry-After`; without one, offer a later manual retry after a conservative
  cooldown. Auth/entitlement/malformed-response errors do not retry themselves.
- For the initial free Alpha Vantage configuration, persist a rolling 24-hour
  ledger and permit at most 25 attempted calls, with a conservative minimum
  15 seconds between calls. Reserve budget before sending; do not refund uncertain
  timeouts. All app windows share this main-process budget. Usage by other apps
  can still exhaust the key, so provider limit responses take precedence. Key
  rotation/restart must not silently reset local quota accounting.
- Cache only validated normalized fields, schema/provider/symbol identity, and
  timestamps. Proposed freshness is seven days; proposed maximum retention is
  30 days and 500 entries, with oldest retrievals evicted first. Read access does
  not extend freshness or retention. Detect future timestamps after clock changes
  and mark freshness unknown/stale. A failed refresh never advances retrievedAt.
- Persistent cache is enabled only after the chosen plan's retention/display
  terms permit this policy; shorten it to any stricter allowed duration. Until
  that is established, use session-only results. Do not promise cached company
  details after restart when persistence is unavailable. Manual thesis data
  remains available regardless.
- Use a separate `provider-cache.sqlite` under userData with its own small schema,
  rather than adding disposable provider data to the research schema. Cache
  failure must not prevent thesis startup/save. Corrupt cache can be discarded;
  never apply that recovery to the research database. Quota accounting is a
  separate operational record so clearing cache cannot reset the budget.

`getCached` never makes a request. **Refresh** explicitly requests a new result
subject to the budget, even if a fresh cache entry exists. A stale record must
show **Saved company details — retrieved [time]** and the refresh result. If a
record exceeds permitted retention, remove it and show unavailable.

Backup format 5 continues to cover user research only. Credentials, cached
provider details, and quota records stay outside export/import. Clarify this in
Settings backup help. Restoring research on another machine works offline;
optional details require setting up that machine's connection again. Future
provider evidence saved as part of research will need a separate provenance,
licensing, and backup design before being added.

## Implementation sequence and acceptance

Stage 1 approval accepts the architecture direction, not a purchase or a live
integration. Next propose Stage 2 in two focused PRs:

1. **Connection foundation:** Electron readiness, narrow validated IPC,
   credential handling, quota/cache infrastructure, and mock-adapter tests.
2. **Company details:** Alpha Vantage adapter, simple Settings/Thesis UI,
   provenance, cache states, and entitled coverage validation.

Use synthetic transport fixtures in normal CI. Verify success, empty results,
wrong symbol/exchange, missing fields, invalid JSON, HTTP-200 error envelopes,
401/403/429, 5xx, timeout, oversized response, and redirect rejection. Assert
that secrets cannot appear in IPC results, logs, research SQLite, or backups.
Check fresh/stale/expired cache after reopen, quota survival, coalescing, failed
writes, changed ticker, and disconnect during a pending response. Compare all
user research records before/after refresh to prove they are unchanged.

Interaction checks cover keyboard focus, masked key entry, clear errors, safe
navigation with edits, and Company details at 1100×720 and 860×560. Packaged
Windows acceptance must exercise secure storage, restart, removal, and offline
manual use before connected release. Prior Phase 3 manual acceptance remains
an explicit separate outstanding item.

Stage 2 completion requires a recorded check of representative supported symbols
using an entitled account, plus the plan/rights checks above. Do not claim
provider integration is verified based on mocks or a demo key. Ask for account
setup through the app's secure flow when implemented, not by pasting a key into
chat. A coverage or entitlement failure results in a revised provider decision.

Later stages remain separate: quotes (freshness, delay, currency and market
session), statements (periods, units and restatements), earnings/calendar
(timezones and estimated dates), and API closeout. None should automatically
change a user's score or investment thesis. Trading execution, cloud sync, and
AI analysis remain outside Phase 4.

## Official sources

1. [Alpha Vantage API documentation — Company Overview](https://www.alphavantage.co/documentation/#company-overview)
2. [Alpha Vantage support — free request allowance](https://www.alphavantage.co/support/)
3. [Finnhub Company Profile 2](https://finnhub.io/docs/api/company-profile2) and [pricing](https://finnhub.io/pricing) — pricing body unavailable during this review; exact quotas not verified.
4. [Twelve Data profile documentation](https://twelvedata.com/docs#profile)
5. [Twelve Data credits and endpoint entitlements](https://support.twelvedata.com/en/articles/5615854-credits)
6. [Twelve Data individual pricing](https://twelvedata.com/pricing)
7. [Alpha Vantage terms](https://www.alphavantage.co/terms_of_service/)
8. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
9. [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) — check shipped-version support before choosing methods.
