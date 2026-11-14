# ADR-021: Internal account authorization transaction

**Status: implementation direction in review.** The owner authorized ongoing
roadmap implementation and reversible technical choices. This narrow account/link
foundation supports approved immediate-deactivation requirements without deciding
public profile visibility, recovery proof, deletion clocks or legal obligations.
No phase is accepted and no public account operation is exposed.

Use generated internal UUID accounts and exact unique provider/issuer/subject links.
Store only active/deactivated access state and creation time at this stage. Do not
bootstrap implicitly from authentication, match by phone, cache active status or
grant roles/ride/consent from a provider identity. Profile/media and full lifecycle
fields remain in the unaccepted draft; no half-enforced photo reference is created.

After supported development provider verification, resolve and share-lock both
account and link rows inside the protected SQL transaction. Hold those locks through
commit/rollback. This permits concurrent authorized reads while serializing state
changes and unlinking against protected writes. A check outside the transaction,
or only a JWT claim, cannot provide that boundary. Missing/inactive mappings fail
closed with the same 403; configuration/SQL failures have safe 503 presentation.

Use a dedicated pg client and the existing migration runner; no ORM, provider,
package or production infrastructure change is needed. Connection/statement/query
timeouts are documented development defaults. Callbacks are internal trusted code,
must use the provided client and must not control the transaction or publish effects
before commit. Reject COMMIT responses that actually report ROLLBACK.

The storage migration has FK/unique/state constraints. A downgrade exclusively locks
the tables and refuses to discard populated account data. An empty test database
may roll back; real populated rollback needs a separate data-preserving plan.
Identity links remain personal data; erasure, restore suppression and future reuse
still require the relevant policy before public/production use.

Real-database constraints and concurrency are the relevant evidence, alongside
safe failure tests and public-health regression checks. Provider/native credentials,
live account flows, device/socket/media invalidation, full lifecycle, idempotency,
resource-specific permissions and production tuning remain separate work.

## Explicit provisioning extension — 2026-11-14

An internal AccountProvisioningService now implements deliberate exact-identity
account creation. It shares transaction/lookup code with account authorization;
neither authentication nor arbitrary protected requests provision implicitly.
Existing inactive links cannot reactivate or become replacement accounts. Unique
insert conflicts remove the losing candidate inside the same transaction and then
resolve the committed winner. Explicit Read Committed snapshots make that lookup
reliable after waiting on the unique constraint. Failed link insertion rolls back
the candidate as well. No migration or public API changes are needed.

This extends the implementation foundation, without accepting public bootstrap,
profile, identity reuse, recovery or erasure policies. PostgreSQL concurrency tests
force uncommitted winning/losing insert ordering and check for orphans. Sources:
[Read Committed](https://www.postgresql.org/docs/16/transaction-iso.html#XACT-READ-COMMITTED),
[INSERT conflicts](https://www.postgresql.org/docs/16/sql-insert.html).

Details: [implemented account boundary](../../02-database/account-authorization-foundation.md).
Sources fetched 2026-11-14: [PostgreSQL row locks](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS),
[node-postgres transactions](https://node-postgres.com/features/transactions).
