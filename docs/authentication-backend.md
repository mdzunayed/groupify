# Development identity verification

**Status: implemented foundation, in review.** This service verifies an external
Clerk session; it is not Groupify account authorization or a production provider
selection. There is no new public endpoint or global authentication guard. The
only public backend endpoints remain health probes.

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
local verification with ephemeral signing keys and outbound fetch blocked.

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
string subject/session identifiers; exact issuer; the configured audience (string
or string-array match); an allowlisted authorized party; integer issued-at,
not-before and expiry; and valid signature/time checks with zero clock skew.
Pending/unknown status and actor/impersonation claims are rejected. The SDK may
allow an absent audience, but this adapter explicitly rejects it. All invalid
credentials become a generic 401, without SDK details or error causes. Unavailable
configuration/production use fails closed with 503. Existing HTTP filtering
provides the safe public response envelope.

**Live compatibility remains open:** the Expo app's real development token may
not contain this audience/authorized-party/status profile. No token template or
client authentication behavior was changed. Confirm supported native claims and
configuration before acceptance; do not weaken verification or claim live login
from the locally signed test fixtures.

## What verification does not grant

The immutable result contains only provider, issuer, provider subject and session
ID. It is not an internal account ID, role, community membership, ride participation
or tracking consent. No consumer currently grants product access from it.

Networkless signature verification cannot discover provider revocation, account
deactivation or deletion, and this implementation makes no such claim. Future
protected operations must map the external identity to a Groupify account, check
its current server-side status, and enforce action/resource/role/consent rules.
Account mapping, lifecycle/recovery rules, profile visibility and production
provider/SMS remain open. Clerk organization roles must not become Groupify roles.

Pinned-key rotation requires updating trusted server configuration (and restarting
processes when environment changes require it). A local test proves replacement
keys reject previous signatures; live rotation, provider revocation and operational
rollout have not been validated. No grace period or remote-key fallback is assumed.

## Evidence

`cd backend && npm run test:identity` builds TypeScript and uses the actual SDK with
in-memory RSA keys/tokens. Tests check valid verification, wrong/tampered signatures,
issuer/audience/party and time claims, pending/missing identifiers, actor/category
rejection, missing/invalid/production configuration, key replacement, safe HTTP
401/503 presentation, and public health access while disabled. The test-only HTTP
controller is outside production modules. Outbound fetches are blocked and console
output is checked; private signing keys/tokens are never written or logged.

These are local cryptographic and HTTP tests, not a live Clerk session, SMS delivery,
provider revocation, Groupify account-state enforcement or Android device proof.
See [ADR-018](01-architecture/architecture-decisions/ADR-018-development-identity-verification.md)
and [the identity/profile proposal](02-database/identity-profile-proposal.md).
