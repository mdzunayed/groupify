# Development self-profile text

**Implementation for review; P5 and R1 are not accepted.** This is a conservative
active-self-only development slice of the approved profile-management requirement.
It makes the proposed boundary concrete under the ongoing autonomous-development
instruction. The earlier optional preference question is not treated as policy
approval. Other-rider visibility/edits and inactive summaries remain absent.

Pictures are still required unfinished product work. This API has no photo column,
unowned asset reference, upload or client URL fetch, and accepts no photo field.
It never declares a profile complete or waives picture support. Media, recovery,
erasure, identity reuse/legal obligations and production identity remain separate.
The [app client](../05-development/profile-client.md) integrates this text-only
flow in development; no live Clerk/native session is proved.

All methods use current development bearer/provider checks, exact account mapping
and active-account SQL locks. Production/disabled/unconfigured verification fails
closed. Account ID/role comes only from server authorization. Login, GET and PATCH
never bootstrap; use [explicit account bootstrap](development-account-bootstrap.md)
and then create text deliberately.

| Method | `/v1/me/profile` behavior |
| --- | --- |
| GET | Own existing text or 404; matching conditional reads may return bodyless 304 after current authorization |
| POST | Create one own profile, 201; existing profile returns 409 without replacement |
| PATCH | Partial own update under the exact strong `If-Match`; 200 only after commit |

Writes require JSON. Unknown/immutable/identity/role/media fields and query selectors
are rejected. No other-account route or community-role override exists. Errors
use generic safe envelopes and no-store; raw validation, SQL and caller data are
not reflected/logged. Framework-generated weak error ETags are not profile edit tags.

Mutable attributes:

- `displayName`: required on create, NFC/trim, nonempty and at most 80 code points;
  normalized controls/isolated surrogates are rejected; internal spelling preserved.
- `riderType`: required on create, `motorcycle` or `bicycle`; simultaneous types are
  not inferred. This initial representation remains in review under OD-20.
- `vehicleDescription`: optional plain text, NFC/trim, at most 160 code points;
  null/trimmed empty clears it. PATCH omission preserves it. No structured plate,
  document or location fields are added.

The numeric text bounds are reversible development validation/storage choices,
not accepted product/member/population limits. The database enforces lengths,
rider vocabulary, one profile/account, restricted ownership and positive versions.
Downgrade locks and refuses populated-table removal instead of discarding data.
Profile/identity fields remain personal data; this is no unlimited-retention grant.
Future erasure must implement the actual account policy without extending the
independent 30-day detailed-location rule.

Success JSON has exactly `profileId`, `displayName`, `riderType`,
`vehicleDescription` (nullable) and decimal-string `version`. The generated profile
UUID is immutable, not an access token or an addressable other-user resource.
Versions remain strings beyond JavaScript Number precision. Timestamps stay internal.

GET can honor `If-None-Match` after current provider/account checks and reading
the caller's actual owned profile. A matching strong/weak tag, matching tag in a
list or `*` can yield 304 with an empty body, current strong ETag, server request
ID and `Cache-Control: no-store`. This is existing Express behavior, now covered
by the contract; it is not an authorization cache. Changed/replaced/other-owned
profiles do not match the old exact tag. Missing profiles still return 404;
invalid identity, inactive account or removed link still fail normally, including
when conditional headers match a previously visible profile. No-store prohibits
storing/reusing these responses under RFC 9111; a conditional request does not
waive it. The app sends unconditional GETs and stores no profile cache.

Success has `Cache-Control: no-store`, server `X-Request-Id` and a strong edit tag
of the form `"profile-<profile UUID>-<version>"`. Return that ETag unchanged on PATCH;
never synthesize it from a counter alone. Identity binds preconditions across users
and replaced representations. UPDATE matches own account, profile identity and
version atomically, so competing same-version edits cannot overwrite each other.

Missing precondition is 428/`PRECONDITION_REQUIRED`; stale/different profile/version
is 412/`PRECONDITION_FAILED`; malformed/weak/list/wildcard/overflow tags are 400.
This follows HTTP precondition semantics, replacing the earlier unaccepted draft's
409 stale-version recommendation. GET absence is 404; duplicate creation is 409.
Errors do not prove non-commit. There is no automatic retry or idempotency cache;
reconcile uncertain creation/update with an explicit self read before a new attempt.

[OpenAPI 0.3.1](openapi.json) is the implemented narrow contract. SQL tests cover
actor isolation, duplicate/create races, same-version edits, profile-generation
tags, optional-field handling, Unicode/parameterization, constraints/downgrade and
bigint precision. External identity is stubbed only at that suite boundary; no real
provider/phone, picture, native/device or complete deletion/recovery flow is used.
Conditional-read semantics follow [RFC 9110 sections 13.1.2/15.4.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.2)
and no-store follows [RFC 9111 section 5.2.2.5](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5).
