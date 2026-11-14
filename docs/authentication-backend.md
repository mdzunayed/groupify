# Development identity verification

**Status: implemented foundation, in review.** This service verifies an external
Clerk token and the provider's current session status; it is not Groupify account authorization or a production provider
selection. The protected [explicit development bootstrap](03-api/development-account-bootstrap.md)
uses the verifier to create/resolve only the caller's account; [active-self text](03-api/self-profile-text.md) additionally checks current ownership/status. There is no global
product-access guard. Health remains public. The separate opt-in
[development WebSocket probe](03-api/development-websocket.md) uses this verifier
and current account SQL before upgrade and each supported diagnostic action.

## Server configuration

The verifier is disabled unless `GROUPIFY_DEV_AUTH_ENABLED=true` and `NODE_ENV`
is `development` or `test`. Supply values through backend environment settings:

| Variable | Required value |
| --- | --- |
| `CLERK_ISSUER` | Exact expected HTTPS issuer, with no credentials, query, fragment or non-root path |
| `CLERK_AUDIENCE` | Nonempty audience expected in the verified token |
| `CLERK_AUTHORIZED_PARTIES` | Comma-separated HTTPS origins, without paths or trailing slashes |
| `CLERK_PUBLISHABLE_KEY` | Development `pk_test_…` key for the intended application |
| `CLERK_SECRET_KEY` | Development `sk_test_…` backend secret, server-only |
| `CLERK_JWT_KEY` | Pinned RSA public key in SPKI PEM format, with actual newlines |

Do not put the backend secret in `EXPO_PUBLIC_*`, mobile files, logs, commits or
chat. The example contains only blank values and a disabled flag. Environment
values are not proof that the keys/application pairing or token profile is valid.
Configure the intended application and verify its actual claims before live use.
No real configuration or provider account was verified for this implementation.

The installed `@clerk/backend` 3.28.0 requires a secret for `authenticateRequest()`
even when a JWT public key is supplied. This differs from the fetched docs saying
either is sufficient. The adapter follows the installed SDK's requirement; it
does not patch or bypass the check. Tests use a noncredential marker solely for
local verification with ephemeral signing keys and mocked provider responses.
Tests make no actual provider request.

## What is verified

`IdentityModule` exports `DevelopmentIdentityService.verifyBearer()` for future
server consumers. It accepts one bearer session JWT and uses the supported Clerk
request-authentication SDK. The scheme is case-insensitive; cookies, other token
classes, comma lists and extra token whitespace are rejected.

The SDK receives a stripped POST envelope at reserved `https://groupify.invalid/`,
not a deployment URL. This is only an internal token-verification envelope. It
contains no cookies, refresh credentials, forwarded host, query or redirect hints.
A pinned key is always required and SDK telemetry is disabled. No remote JWKS,
refresh or handshake outcome is accepted or exposed.

The initial strict profile requires version 2; active session status; nonempty
string subject and `sess_` session identifiers containing only letters, digits,
underscores or hyphens; exact issuer; the configured audience (string
or string-array match); an allowlisted authorized party; integer issued-at,
not-before and expiry; and valid signature/time checks with zero clock skew.
Pending/unknown status and actor/impersonation claims are rejected. The SDK may
allow an absent audience, but this adapter explicitly rejects it. All invalid
credentials become a generic 401, without SDK details or error causes. Unavailable
configuration/production use fails closed with 503. Existing HTTP filtering
provides the safe public response envelope.

After local validation, the adapter reads `GET https://api.clerk.com/v1/sessions/{id}`
using the server-only secret and the pinned `Clerk-API-Version: 2026-05-12` contract.
It requires the same session ID and subject, `active` status, no actor, and future
integer millisecond expiry/abandonment timestamps. It rechecks bearer expiry after
the lookup. A missing (404), non-active or mismatched session returns generic 401.
Provider credential errors, rate limits, non-200/non-404 responses, network/abort
or malformed JSON errors return generic 503, without an offline fallback.

The supported REST endpoint is used for this read because the installed SDK's
`getSession()` has no cancellation option. A 2,500ms AbortSignal deadline covers
fetch and body consumption; redirects are rejected and responses are not cached.
This reversible development request deadline is not a production SLA, session
lifetime or PTT speaking-duration timeout. There are no automatic retries, refresh,
revocation writes, provider configuration changes or user notifications.

Every verification performs a fresh status read. Provider quota, latency, cost,
eventual consistency and live behavior need measurement before production choices.
The result reflects the observed response: a later revocation can race a subsequent
operation. No atomic or zero-delay revocation guarantee is claimed.

**Live compatibility remains open:** the Expo app's real development token may
not contain this audience/authorized-party/status profile. No token template or
client authentication behavior was changed. Confirm supported native claims and
configuration before acceptance; do not weaken verification or claim live login
from the locally signed test fixtures.

## What verification does not grant

The immutable result contains only provider, issuer, provider subject and session
ID. It is not an internal account ID, role, community membership, ride participation
or tracking consent. No consumer currently grants product access from it.

Signature verification alone cannot discover provider revocation; the status read
now rejects a provider-reported revocation. This does not discover Groupify account
deactivation or deletion. Future
protected operations must map the external identity to a Groupify account, check
its current server-side status, and enforce action/resource/role/consent rules.
An internal [account/status transaction](02-database/account-authorization-foundation.md) now exists for trusted server consumers, without a public account endpoint or resource grant. Lifecycle/recovery rules, profile visibility and production provider/SMS remain open. Clerk organization roles must not become Groupify roles.

Pinned-key rotation requires updating trusted server configuration (and restarting
processes when environment changes require it). A local test proves replacement
keys reject previous signatures; live rotation, provider-session behavior and operational
rollout have not been validated. No grace period or remote-key fallback is assumed.

## Evidence

`cd backend && npm run test:identity` builds TypeScript and uses the actual SDK with
in-memory RSA keys/tokens. Tests check valid verification, wrong/tampered signatures,
issuer/audience/party and time claims, pending/missing identifiers, actor/category
rejection, missing/invalid/production configuration, key replacement, safe HTTP
401/503 presentation, and public health access while disabled. Mocked provider reads
cover status changes for the same still-valid JWT, identity mismatch, missing and
expired sessions, provider failures, cancellation and token expiry during lookup.
Invalid local credentials make no provider call. Only the fixed session-read URL,
server-secret header and safe request options are allowed in the fetch mock; no
actual provider network request is made. Console output is checked. A temporary
negative control bypassed the status read and correctly failed the revocation test;
source was restored before full verification. The test-only HTTP controller is
outside production modules; keys/tokens stay in memory and out of logs/files.

These are local cryptographic and HTTP tests, not a live Clerk session, SMS delivery,
live provider revocation, Groupify account-state enforcement or Android device proof.
See [ADR-018](01-architecture/architecture-decisions/ADR-018-development-identity-verification.md)
[ADR-020](01-architecture/architecture-decisions/ADR-020-development-session-status.md)
and [the identity/profile proposal](02-database/identity-profile-proposal.md).
