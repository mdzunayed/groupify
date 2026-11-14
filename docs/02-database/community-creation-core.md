# Community creation core

**Implementation in review, not P6 acceptance.** An explicitly enabled, default-off
[development HTTP preview](../03-api/development-community-creation.md) now wraps
the core. Production creation eligibility remains unresolved; no app screen,
invitation, join, role-editing, removal, succession or ride permission is exposed.
The core implements the approved initial community-creator/Leader rule using the
existing active-account transaction.

`CommunitiesModule` exports `CommunityCreationService.create(authorization, name)`
to trusted backend callers. It resolves the verified active account, then creates
the community and its creator's `Leader` membership in one transaction. Both commit
before a frozen result is returned; failed membership insertion rolls creation
back. A client-supplied account ID or role is never used. Inactive/unmapped accounts
cannot use the operation. Resource permissions for future actions remain separate.

Migration `1794675600000_community_creation.cjs` creates independent `communities`
and `community_memberships` tables. Community records contain ID, name, initial
creator and creation time; membership has community/account PK, role and join time.
The only role values are exactly `Leader`, `Co-leader`, `Member`. Only the initial
Leader assignment is implemented. The schema does not decide the number of Leaders,
promotion/demotion powers, community-to-ride membership or separate ride leadership.
No ride owns a community or can remove it on completion. Actual multi-ride behavior
still needs the later ride implementation and integration evidence.

Names normalize to NFC, trim surrounding whitespace, preserve internal spelling,
and reject control characters and isolated UTF-16 surrogates. The latter must fail
before SQL writes rather than silently become replacement characters during UTF-8 encoding;
valid supplementary characters such as emoji remain supported. A 1–100 Unicode-code-point bound is an explicitly
chosen reversible development validation/storage bound; it is not an accepted
product naming limit or a community/membership/concurrency quota. Database character
count matches the normalized code-point representation. SQL is parameterized;
punctuation is accepted as literal text. The development creation response exposes
only the new ID/name/initial Leader role; list/cross-user metadata, public access
policy and UI still require their relevant review/implementation.

Restricted foreign keys prevent silent cascading deletion of accounts, communities
or memberships. Populated downgrade locks and refuses rather than discarding data;
empty test databases can roll back/reapply. Creator and membership identifiers are
personal/shared records. Retention, account erasure, succession, audit history and
identity reuse remain unresolved under the account/shared-record contract. These
FKs are a guard against accidental loss, not legal retention authority or a reason
to keep a requested account active. No production/shared data is migrated here.

Creation records identify the initial actor/time, but a complete membership-change
audit system is not implemented. Community creation grants no chat, PTT, SOS, map,
historical location or opted-in live location capability. No subscription, billing,
invitation method, membership limit or planning-population cap is inferred.

Eight real-database checks cover atomic initial Leader assignment, inactive refusal,
Unicode/SQL parameter handling, invalid names, multiple independent communities,
the exact role vocabulary, forced membership failure rollback and populated
downgrade refusal. Only upstream external identity is stubbed; account transactions
and PostgreSQL constraints are real. Integration test files run serially because
the disposable database's orphan/rollback assertions require exclusive fixture
ownership. These are not live Clerk, Android, multi-ride, full authorization or
production/privacy-lifecycle acceptance tests.
