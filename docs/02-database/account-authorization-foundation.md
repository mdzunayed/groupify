# Account authorization foundation

**In review, internal infrastructure only.** No public account/profile/bootstrap,
deactivation, recovery or deletion endpoint is registered. No real account is created
by startup or by token verification. The full [account/profile contract](account-profile-contract.md)
remains a proposal; this increment does not settle its R1–R4 decisions.

## Implemented storage

Migration `1794672000000_account_identity_boundary.cjs` creates:

- `accounts`: generated UUID primary key, `active`/`deactivated` access state,
  server creation timestamp. These are access states, not a completed deletion
  lifecycle. There is no recovery clock, purge state, legal hold or automatic
  recovery transition.
- `external_identities`: generated UUID, restricted account FK, exact nonempty
  provider/issuer/subject and creation timestamp. The triple is unique under
  deterministic `C` collation; an account may have multiple represented links,
  but no linking/unlinking/merging interface exists. Phone numbers, session IDs,
  JWTs, OTPs and secrets are absent from these tables.

Identity links are personal data, not anonymous identifiers. No production use,
unlimited retention, provider reuse or erasure policy follows from this schema.
Profile/media tables and lifecycle metadata remain unimplemented. Later migrations
must add their reviewed constraints before the corresponding operations exist.

Up runs transactionally through the existing migration runner and fails if names
already exist. Down locks both tables and refuses populated-table removal rather
than losing mappings. Empty disposable databases can roll back; populated rollback
needs an explicit data-preserving transition/export plan. Do not bypass the guard
or delete identities to make a downgrade pass.

## Internal transaction boundary

`AccountsModule` exports `AccountAuthorizationService.withActiveAccount()` to
trusted server modules. It first calls the existing development token/provider
verifier. Only then does it open the configured PostgreSQL connection and resolve
the exact verified provider/issuer/subject. It never accepts an account ID from
the request, matches by phone/session ID, creates an account, or uses cached state.
Missing mapping and inactive state both fail with safe 403.

The active account and identity row are share-locked in the same transaction as
the caller's protected SQL. Concurrent readers may proceed; deactivation or link
removal waits until that transaction ends. If the state changes before the select,
the new state is checked. This prevents a protected write from committing after a
competing deactivation has already committed. It is not proof of socket/media
invalidation or remote device cleanup.

Callers must use the supplied client for every protected query, leave transaction
control to the service, and return only after their SQL is complete. Publish no
external effects from the callback; later messaging needs a reviewed commit/outbox
boundary. The immutable callback context contains only the internal account ID.
Provider identity and sessions do not become roles, membership or tracking consent;
resource-specific permissions still have to be checked by each future operation.

Callback errors roll back. A swallowed SQL error also cannot become success:
PostgreSQL's `ROLLBACK` response to `COMMIT` is explicitly rejected. Safe domain HTTP
exceptions are preserved for the existing redacting filter; database failures become
generic 503 without SQL/configuration/cause details. There are no automatic retries
or claims that an uncertain commit did not occur. Later writes still need idempotency.

Connection/statement/query timeouts (2,500/2,500/3,000ms) are reversible development
defaults, not product limits or production SLAs. Dedicated clients are closed after
each transaction. Pool sizing, production capacity, session expiry during a long
operation, deployment failure behavior and operational tuning remain open.

## Verification

`npm test` includes provider-before-database, absent/malformed configuration and
safe-failure checks. `npm run test:integration:docker` includes real PostgreSQL
tests for exact mapping/constraints, deactivation, parameterized identities,
commit/rollback, swallowed SQL errors and row-lock concurrency. The database itself
must report a blocked writer in `pg_stat_activity`, rather than inferring a lock
from a delay. The down guard is tested against populated tables; the existing
integration runner exercises empty rollback/reapply.

Only the upstream external identity result is stubbed in the database suite;
the separate identity suite checks the actual SDK with generated keys and mocked
provider responses. No live Clerk/session or Android proof follows. The integration
runner uses disposable generated test resources; do not point these checks at a
shared or production database.
