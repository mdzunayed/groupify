# Explicit development account bootstrap

**Implemented for review, development only.** `POST /v1/accounts/bootstrap` wraps
the tested [provisioning transaction](../02-database/account-authorization-foundation.md).
It creates/resolves only the verified caller's account. It is not a complete
registration/profile flow, live OTP/session proof, recovery action, production
identity choice or phase acceptance. The app client is not integrated yet.

The existing verifier must be enabled and correctly configured in development/test.
Disabled, unconfigured or production use fails closed with 503. Configured calls
validate bearer/current provider session before SQL. Cookies, caller identity
fields and phone matching are not used. See [settings and compatibility gaps](../authentication-backend.md).

Send one Authorization bearer header and either no body or an empty JSON object.
Queries and nonempty/array/primitive bodies are rejected; body-bearing requests
require `application/json`. No account ID, subject, phone, profile or role comes
from the caller. Errors use the shared safe envelope, including parser failures.

After commit, 201 means new exact account/link; 200 means existing active mapping.
Both bodies are exactly:

```json
{"accountId":"<server-generated account UUID>"}
```

Success uses no-store and server `X-Request-Id`, without cookies, provider identity,
profile, role or lifecycle summary. The UUID is not permission for another resource.
Concurrent/repeated calls converge to one mapping; losing candidates are removed
transactionally. An inactive mapping returns 403 without recovery, replacement or
deadline changes. Login and arbitrary protected requests never provision implicitly.

An uncertain failure does not prove non-commit. There is no automatic retry; an
explicit later call with current valid identity resolves the same active mapping.
No idempotency-key retention/cache, profile policy or erasure/reuse rule is added.
R4 still governs identity reuse/restore before those operations exist. Bootstrap
never declares a profile complete or assigns community roles; pictures remain
required unfinished product work.

[Implemented OpenAPI](openapi.json) 0.2.0 describes health and this narrow route.
The separate full account/profile/lifecycle draft remains unaccepted and proposes
broader responses/operations, not this actual contract.

Local HTTP tests stub provisioning for routing/body/status/header checks and use
the actual verifier for disabled/production rejection. Database tests stub only
upstream identity and exercise actual HTTP, provisioning, SQL, repeated/concurrent
requests, inactive refusal and input no-write behavior. No real Clerk request/key,
native session or physical device is used. Production limits/hardening and the
rest of P5 remain open.
