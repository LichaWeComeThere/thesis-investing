# Phase 4 Stage 2B — Company details

Implementation available for personal account validation. Live coverage and
account entitlement remain unverified. No real key or provider profile was used
in development, screenshots, or CI. Hands-on Windows acceptance remains pending.

## What the user sees

Settings has an optional **Data connection** section. Enter a user-owned Alpha
Vantage key in the desktop app, then choose **Save key**. The field is masked and
cleared on submission. Saving confirms encrypted local storage only; it does not
test provider access. Sidebar navigation, the welcome screen, and window closure
protect an unsaved key. **Remove connection** clears credentials and session
details while keeping research and request-budget accounting intact.

A saved thesis has a compact **Company details** section. **Load company details**
or **Refresh** sends its saved ticker to Alpha Vantage. No thesis text, decisions,
scores, or review notes are sent. Viewing a screen reads session cache only;
startup, typing, focus, and navigation never trigger a provider request.
Save or discard thesis edits before a new lookup.

The section displays company identity, exchange, sector, optional industry,
country/currency, source, and retrieval time. Missing values say **Not provided**.
Retrieved time means successful app retrieval, not a provider publication time.
Failed refreshes retain eligible cached details with their original timestamp
and a separate error. Session data disappears when the app closes and stays out
of research records and backups. No result automatically renames a thesis.

## Adapter and provisional coverage

The main-process adapter wraps the existing fixed-origin `OVERVIEW` transport.
It requires an exact requested symbol, a bounded nonempty company name,
`Exchange` exactly `NYSE` or `NASDAQ`, and `AssetType` exactly `Common Stock`.
These are deliberately narrow **provisional acceptance values**, not verified
coverage. Other exchanges, funds, missing identity, and conflicting symbols are
unsupported. Do not broaden this allowlist without checking entitled responses.

Optional attributes are separately bounded plain strings. Missing fields, null,
blank strings, and defensive missing-value markers (`None`, `null`, `N/A`, `-`)
become null. These markers are defensive handling, not an assertion of a complete
documented provider schema. Industry is never substituted for sector.
`sourceUpdatedAt` remains null: `LatestQuarter` is a reporting period, not a
record-update timestamp. All unused fields are dropped. A key echoed into a
retained field is rejected; raw provider errors and exception text are not shown.

Existing limits remain: 25 attempted requests per rolling 24 hours, at least
15 seconds apart, ten-second deadline, 1 MiB body cap, no redirects, no automatic
retries. The key remains in main and encrypted local storage; renderer CSP still
forbids network. Cache persistence remains disabled.

## Provider review — 2026-09-28

| Topic | Evidence and implementation decision |
| --- | --- |
| Endpoint access | [Company Overview documentation](https://www.alphavantage.co/documentation/#company-overview) lists `function`, `symbol`, and `apikey`, without a Premium label. [Support](https://www.alphavantage.co/support/) describes 25 daily free requests for most datasets. This suggests an appropriate candidate; neither proves this user's entitlement. |
| Personal display | [Terms §2](https://www.alphavantage.co/terms_of_service/) allow personal, non-commercial use/display on owned or controlled devices. Organizational use, access by others, and specified financial-industry affiliations fall within its commercial categories. The user must check their account's permitted use; repository privacy does not establish distribution rights. |
| Attribution, retention, export | The reviewed terms do not specify Company Overview attribution wording, cache duration, or export rights. Source labeling is provenance, not a claim of mandatory attribution. Session-only results and research-only backups remain the policy; no persistent-cache or redistribution permission is claimed. |
| Real coverage | The documented public demo returned an `Information` envelope instead of a profile. No entitled account response has been inspected. NYSE/NASDAQ asset labels, optional fields, and actual access still require validation. |

This PR supplies the opt-in flow needed for personal account validation. It does
not close the Stage 2 release gate or authorize commercial redistribution.

## Acceptance after merge

1. On Windows, enter the key through Settings, never chat. Confirm the intended
   use and endpoint access are permitted by the account's terms.
2. Manually load representative NYSE and Nasdaq common stocks. Verify exact
   ticker/company identity, exchange and asset type; record only sanitized
   outcomes and missing-field observations, never the key or raw response.
3. Quit/reopen to check encrypted key availability and empty session cache.
   Remove the connection, restart, and confirm it remains removed.
4. Disconnect the network: manual create/edit/review/save and backup/restore
   must remain usable. A failed company refresh must not change the thesis.

If access or coverage fails, keep the research workflow available and revise the
provider decision. Do not silently relax identity checks or buy a subscription.

## Automated and visual checks

Synthetic tests cover mapping/identity failures, credential echoes, transport
failures, explicit-only loading, selection races, missing fields, cached-data
errors, masked entry, and navigation protection. Existing file-backed tests
verify research/export isolation. The Windows runtime smoke expects the adapter
to be available but blocks both Node and Electron networking during verification.

The browser review preview uses fictional `ACME` details and accepts only the
public dummy value `preview-only-key`; it never sends keys to a provider and does
not simulate actual encryption or account acceptance. It binds to loopback by
default (`THESIS_PREVIEW_HOST` can select another development interface).
