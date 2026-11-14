# Controlled development community creation

Status: implementation for review, not P6 acceptance. The approved rule makes the
creator Leader. [Who may create communities](../00-product/user-journeys.md#organize-community-rides)
is explicitly unresolved; this preview does not select production eligibility,
profile-completeness gates, invitations, succession, join/removal or role assignment.

POST `/v1/communities` is unavailable by default. It requires both
`NODE_ENV=development` (or `test`) and exact
`GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED=true`; production remains 503 even with
the flag. Identity configuration alone does not enable it. This is an explicit
controlled-development preview assumption: a verified, active mapped development
account can exercise creation only when separately enabled. Do not expose it to
real rider onboarding as an accepted permission. There is no app entry.

The JSON body contains exactly `name`. No query input, account/creator/role,
description/media field or existing-community selector is accepted. Content type
must be `application/json`. Existing core normalization is NFC/trim, 1–100 Unicode
code points, rejecting normalized controls and isolated UTF-16 surrogates. This is
a reversible development bound in review, not a population or membership cap.

Current upstream development verification and active account/link checks happen
on each creation. There is no implicit account provisioning or reactivation.
The existing transaction creates independent community data and its verified
creator's `Leader` membership atomically. HTTP 201 follows commit and returns only:

```json
{"id":"<new community UUID>","name":"<normalized name>","role":"Leader"}
```

The role describes the initial commit. Future actions must recheck current scoped
membership; this response is no cached permission. Success has server UUID
`X-Request-Id` and `Cache-Control: no-store`, without a cookie, creator/account ID
or Location header pointing at an unimplemented read route. Errors use the safe
400/401/403/415/503 envelope; transaction failure never reports creation success.

Separate POSTs represent separate intentions, even with the same name. No name
uniqueness, implicit member/concurrency quota or idempotency-key cache is added.
An uncertain response may follow a committed write: do not retry blindly. A safe
app workflow requires explicit creator eligibility plus reconciliation/idempotency
details before integration; this task adds neither a fake community list nor an
invented replay retention policy.

There is no community listing, other-user metadata, membership/role mutation,
invitation, ride, chat/PTT/SOS/location or historical-data grant. Creation records
only the initial actor/time; full membership audit and erasure/shared-record rules
remain unfinished. No production migration/deployment/provider decision is made.

OpenAPI 0.4.0 describes the narrow preview. HTTP/contract checks cover opt-in/mode,
strict inputs/output/redaction and unavailable actual verification. Real SQL/HTTP
cases stub only upstream identity and cover committed creator ownership, invalid
input no-writes, inactive/unmapped refusal, rollback on failed Leader insertion
and independent concurrent creation. CI evidence must be recorded separately;
these tests do not prove live Clerk, production policy or physical Android.
