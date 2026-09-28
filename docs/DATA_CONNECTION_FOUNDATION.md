# Phase 4 Stage 2A — Connection foundation

This stage prepared the optional company-details connection without a live
adapter or key-entry UI. [Stage 2B](COMPANY_DETAILS.md) now adds the adapter and
Settings/Thesis controls for personal account validation. Tests use synthetic
company data and fake encryption; no account or subscription was created.

## Implemented boundaries

- All main IPC registrations validate the registered window, current main
  frame, and exact app document. Subframes and unrelated windows cannot invoke
  even an existing research handler. Navigation, redirects, popups, webviews,
  and permission requests are restricted.
- Packaged HTML permits local scripts and forbids renderer network requests.
  Development permits the exact React refresh preamble by hash and local HMR
  sockets. Packaged startup ignores the development renderer URL variable.
- Preload exposes only `dataConnection.status/saveKey/remove` and
  `companyDetails.getCached/refresh`. Arguments are bounded and checked before
  optional resources initialize. There is no stored-key readback or arbitrary
  URL, path, SQL, or header parameter.
- Main reads the current saved thesis by ID and rechecks its ticker before
  returning a refresh result. Downloaded fields cannot update research records.

## Storage and failure behavior

Connection resources live under `userData/data-connection`, outside the research
database and format 5 exports/imports. Their initialization is lazy, so an
unavailable connection does not block the offline app at startup.

| Resource | Policy |
| --- | --- |
| `api-key.enc` | Electron `safeStorage` ciphertext only; no plaintext fallback. Reject unavailable encryption and Linux `basic_text`/unknown backends. Atomic replacement, restricted permissions, serialized operations, bounded reads, and encryption round-trip verification. |
| `provider-request-budget.sqlite` | Persistent attempt ledger; at most 25 calls in a rolling 24 hours, at least 15 seconds apart. Reserve before dispatch. Key changes, cache clearing, and restart do not reset it. Invalid storage fails closed. |
| Company details | Session-only by default. Separate `provider-cache.sqlite` is supported only through an explicit persistence opt-in after provider rights are established; production does not enable it. |

The cache accepts only normalized, bounded fields with exact provider/symbol
identity. Freshness is seven days, retention 30 days, and capacity 500 records.
Future timestamps display as stale; reads never advance retrieval time. Expired
or invalid disposable entries are removed. A failed refresh preserves an
eligible cached result and returns a separate short error.

Removing or changing the key cancels queued and active work and clears cached
details. Generation checks prevent late responses from repopulating cleared
state. Shutdown cancels work too. Secrets and raw provider messages are not
returned in error objects or logs.

## Requests and transport

The service permits one active request plus five queued distinct symbols and
coalesces concurrent requests for the same symbol. A request has a ten-second
deadline. There are no automatic retries or background refreshes; a queued call
may be rejected by the spacing budget rather than sleeping until it is allowed.
HTTP 429 cooldown persists, using valid `Retry-After` when available.

The separately tested transport uses only the fixed Alpha Vantage HTTPS
Company Overview endpoint, URL-encodes inputs, rejects redirects, omits browser
credentials, caps response bytes at 1 MiB even without Content-Length, and
handles HTTP-200 error envelopes. The service owns timeout/cancellation. This
transport is wired through Stage 2B's strict adapter, which checks exact symbol,
supported exchange and common-stock identity before producing normalized results.
Live entitled response coverage remains unverified.

## Verification and remaining release gates

Automated coverage exercises credentials and failed writes, trusted sender and
CSP boundaries, strict IPC inputs, quota persistence/corruption, cache expiry,
coalescing and queue limits, timeout, malformed/oversized responses, sanitized
errors, key rotation, disconnect, shutdown, and changed-thesis races. File-backed
integration coverage checks research/export isolation. Normal CI makes no live
provider requests.

Before Stage 2B is released with a live connection:

1. Keep Electron on a supported release. The follow-up upgrade pins `44.4.5`
   and adds real Windows runtime checks; see
   [Electron upgrade verification](ELECTRON_UPGRADE.md). The original Stage 2A
   foundation shipped on Electron 36. The upgrade alone does not establish
   connected-release readiness or replace hands-on acceptance.
2. Verify entitled Alpha Vantage responses, supported US exchange/asset values,
   display/retention rights, and attribution. Keep persistence disabled until
   those rights are recorded.
3. Add simple Settings and Company details controls with masked entry, edit
   protection, clear source/age/error states, and explicit user-triggered loads.
4. Exercise packaged Windows secure storage, save/restart/remove, renderer load,
   and offline research with the actual runtime. Injected encryption and build
   checks do not replace native acceptance; earlier Phase 3 hands-on acceptance
   is still deferred.

See [Read-only API Plan](READ_ONLY_API_PLAN.md) for the accepted product scope and
provider comparison. No research schema or backup format changes are needed.
