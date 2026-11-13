# ADR-019: Account/profile ownership and lifecycle — proposed

**Status: proposed for owner review; not implemented or accepted.** This builds on
ADR-018's external-session verifier, which grants no product access.

Propose separate internal UUID accounts, exact provider/issuer/subject links and
self-owned rider profiles. Do not merge by phone or use provider subjects as
internal account IDs. Deactivation/current-state authorization and external-session
verification are separate responsibilities. Profile version checks belong in the
same transaction as the write; account-state/epoch checks must cover every HTTP,
WebSocket and media consumer before it can access product data.

The [concrete contract](../../02-database/account-profile-contract.md) specifies
candidate fields, transaction/idempotency behavior, a strict 30-day recovery
boundary and the separate [draft API artifact](../../03-api/account-profile.draft.openapi.json).
The approved product baseline is preserved, including independent 30-day location
retention and the three roles. Proposed profile limits, self/inactive access,
proof method and exact clock semantics are not approved requirements.

Review R1–R4 before dependent implementation: self-service permissions/profile
shape; fresh action-bound recovery/deletion proof; exact lifecycle deadline/races;
and media/shared-record/provider/legal/backup handling. No schema migration,
operational retention table, public endpoint or irreversible deletion worker is
introduced. No blanket retention exception or production provider is selected.

An alternative of treating a valid provider token as an active Groupify account
would leave deactivated accounts authorized. Automatic phone-based linking or
login recovery would silently choose unresolved recovery policy. This proposal
rejects those shortcuts while leaving the actual proof and shared-data policies
for owner review. Publishing an ADR or passing document validation does not accept
those policies or close P5.
