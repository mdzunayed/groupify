# ADR-018: Development external-identity verification boundary

**Status: implementation direction for review, not phase acceptance or production identity approval.** Clerk remains approved only for development. This bounded adapter introduces no product endpoint, account schema or authorization grant.

**2026-11-14 extension:** [ADR-020](ADR-020-development-session-status.md) adds a
bounded current-provider-session read after local JWT validation. The paragraphs
below record the initial networkless stage; its no-revocation and no-fetch statements
are historical. The current adapter also rejects provider-reported revoked sessions,
with mocked HTTP evidence only. Groupify account authorization remains unimplemented.

## Initial networkless stage (2026-11-13)

Use the supported `@clerk/backend` `authenticateRequest()` SDK for bearer session verification with a pinned public PEM key and explicit issuer, audience and authorized-party configuration. Disable SDK telemetry. Use a stripped, cookie-free, POST request envelope at a reserved `.invalid` URL so no incoming cookies, redirect hints, refresh credentials, query values or deployment URL are involved. The pinned SDK 3.28.0 also requires a development backend secret key even with `jwtKey`; it must be server-only configuration. No JWKS fetch, cookie authentication, refresh or handshake result is accepted. SDK results must be signed-in session tokens and converted with pending sessions treated as signed out.

The adapter is opt-in and only usable under `NODE_ENV=development` or `test`; absent/invalid configuration and production use fail closed. Its initial strict token profile requires version 2, active session status, subject/session identifiers, issuer, audience, authorized party, and integer issued-at/not-before/expiry claims. Missing claims are rejected, not guessed. Missing/production publishable or secret keys are also rejected. Actor/impersonation tokens are rejected until a policy exists. This is a reversible technical compatibility boundary: the actual Expo/Clerk development token claims and audience customization have not been verified. Do not claim a working live flow or change the client/token template silently to satisfy the adapter.

Return only provider, issuer, provider subject and session ID. These identify an external session; they are not a Groupify account, role, membership or active-ride consent. Do not install a global product-access guard or expose these identifiers in a new public endpoint. Account mapping/current account status, revocation handling, authorization and recovery/deletion need their own reviewed implementation. Networkless verification cannot discover provider revocation or Groupify deactivation; it must never by itself grant product access.

Tests will generate ephemeral RSA keys/tokens locally and call the actual SDK, deny network access in the test process, and exercise missing/production configuration, valid and invalid signatures, issuer/audience/party, expiry/not-before/pending/malformed/unsupported claims. Private signing keys and tokens stay in memory and out of logs/files. Verify a real development session, native token claims and key-rotation/revocation behavior before integrating a live consumer. Production provider/SMS, profile visibility and recovery decisions remain open.


**SDK documentation discrepancy:** the fetched authenticateRequest documentation says either `jwtKey` or `secretKey` is sufficient, but installed `@clerk/backend` 3.28.0 unconditionally calls `assertValidSecretKey()` for session tokens. Keep that supported SDK requirement; do not patch it or use a fabricated secret in runtime configuration. Tests use an explicit noncredential marker solely for local verification with in-memory signing keys and outbound fetch disabled. A real development backend secret is still needed for live verification through this adapter, and has not been supplied or verified.
