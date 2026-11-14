# ADR-022: Initial community and Leader transaction

**Status: implementation direction in review.** Approved product rules establish
permanent communities, exactly three roles and creator-as-Leader. This bounded
internal implementation follows those rules without settling later role assignment,
succession, invitations, community-to-ride membership or ride leadership.

Use the active-account SQL transaction from ADR-021. Atomically insert a community
with the verified account as its initial creator and a membership with exact role
`Leader`. Return only after commit. Caller account IDs/roles cannot select the
creator. Membership failure rolls back the community. Separate tables have generated
community UUIDs, unique community/account memberships and only the approved role
vocabulary; communities are independent of individual rides.

Choose NFC/trim/control rejection and a 1–100-code-point community-name bound as
reversible development validation, not an accepted product limit or population
cap. Parameterize text. Use restricted FKs and refuse populated downgrade; never
make cascades silently choose account/shared-record erasure policy. No production
data or migration is involved, and no public endpoint/client flow is registered.

Community/creator/membership records are personal/shared data. Their erasure,
succession, audit and retention need the relevant policy before production use.
Creation data records initial actor/time, not full membership-change audit history.
Further resource-specific permissions must be implemented and tested before exposure;
community role alone does not grant ride/location/media access.

Real PostgreSQL checks cover atomicity, active-account enforcement, names, role
vocabulary, independent communities and downgrade protection. Serialize integration
files that share the disposable fixture database so orphan/rollback observations
cannot count other suites' in-flight data. Retain the same pinned PostGIS/Redis
integration environment and lockfiles; no new provider/package is selected.

Details: [implemented creation core](../../02-database/community-creation-core.md).
Binding inputs: [approved community/role rules](../../00-product/business-rules.md#community-and-ride-relationship),
[PR-04/PR-05](../../00-product/product-requirements.md#approved-decisions-and-acceptance-checks).
