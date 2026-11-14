# ADR-020: Current development provider-session status

**Status: implementation direction in review; no phase acceptance or production
provider decision.** Extends ADR-018's local JWT verification using the already
approved development Clerk provider. No product endpoint, account permission,
schema, recovery behavior or provider write is introduced.

## Decision

After the existing SDK signature/issuer/audience/party/time/claim checks, read the
verified session from Clerk's supported `GET /v1/sessions/{session_id}` endpoint.
Use only `https://api.clerk.com`, a server-only development secret, and the
`2026-05-12` API contract matching pinned backend SDK 3.28.0. Session IDs use a
restricted `sess_` identifier shape before URL encoding. Invalid local credentials
never reach this lookup. Health remains public and development identity disabled
unless explicitly configured in development/test.

Require a matching ID/subject, active status, no actor and future integer
millisecond expiry/abandonment timestamps. Recheck the JWT's expiry after the read.
Do not cache active status or accept a last-known status during provider failure.
Missing/non-active/mismatched sessions yield safe 401; provider credentials, rate
limits, network/cancellation, other HTTP or JSON failures yield safe 503. Never
include provider bodies, errors, identifiers, keys or tokens in application output.

The SDK's `getSession()` provides no AbortSignal option. Use the documented REST
read with native fetch, a cancellable 2,500ms fetch/body deadline, rejected redirects
and no-store caching. Keep normal TLS/platform network settings. There are no
retries, writes, refresh, telemetry, remote JWKS or alternate-host fallback.

## Alternatives and trade-offs

Local JWT validity alone leaves revoked sessions valid until expiry. Webhook/cache
invalidation needs authenticated delivery, persistence, replay/order handling and
a consistency policy not present in this foundation. A direct status read is the
smallest bounded development increment; it adds latency and provider availability,
rate/quota and cost dependencies. The numeric request deadline is a reversible
technical choice, not a product/session/PTT limit or a selected production SLA.

This is a point-in-time provider observation. Revocation can race a later operation
and provider consistency needs live evidence. No zero-delay or atomic revocation
guarantee follows. Groupify account mapping/current status, authorization, deletion,
recovery and native token compatibility remain separate unimplemented/unverified
boundaries. Production identity, SMS delivery/coverage/pricing and deployment are
unselected; a mocked API response does not verify a live session.

## Verification and reversibility

Actual SDK checks use ephemeral keys/tokens; provider responses and transport errors
are mocked without network or real credentials. Tests require repeated reads for
the same still-valid JWT, no provider call for invalid credentials, safe failures,
cancellation options and expiry revalidation. Bypassing the status read fails the
revocation test. No key/token/body/identity is written to test output.

The internal adapter can change without data migration. Removing the online read
would remove revocation detection and must not be represented as equivalent
security. Live provider/native verification, quotas and operational policy must be
reviewed before a product consumer or production rollout.

Sources fetched 2026-11-14: [getSession documentation](https://clerk.com/docs/reference/backend/sessions/get-session.md),
[Backend Session](https://clerk.com/docs/reference/backend/types/backend-session.md),
[2026-05-12 BAPI OpenAPI](https://clerk.com/docs/reference/spec/bapi/2026-05-12.json).
The installed SDK types and request implementation were inspected for cancellation
support and its API-version header; no SDK patch or verification bypass is used.
