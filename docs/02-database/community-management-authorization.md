# Community management authorization

**Internal transaction boundary in review.** This is enforcement of the owner's
approved starter management grants, not public membership/invitation/ride APIs or
phase acceptance. No role assignment, invitation method, succession, removal rule
or ride lifecycle is implemented by this boundary.

`CommunityAuthorizationService.withManagementCapability()` calls current provider
and account authorization first. In that same SQL transaction it resolves only
the verified account's membership in the requested community and share-locks it
through the protected operation. It uses neither cached role nor creator metadata
as a substitute. Missing community/membership and insufficient role all yield the
same generic 403; malformed UUIDs yield safe 400 after account verification.

| Management capability | Current roles receiving the approved grant |
| --- | --- |
| `manage_roles` | Leader |
| `manage_membership` | Leader |
| `manage_rides` | Leader, Co-leader |
| `manage_invitations` | Leader, Co-leader |

Other grants are absent. Unknown runtime capabilities fail closed even if the caller
is Leader. Member's active-ride chat/PTT/SOS/location capabilities require separate
participant/resource/consent checks, not this management boundary. No priority,
fourth role, community-wide location visibility or creator-only Owner privilege is
inferred. Further role assignment details and community/ride leadership remain open.

The callback receives the same transaction client and a frozen canonical community
ID, internal account ID and current role. Callers must use that client and enforce
the exact resource/action rules, including verifying that a ride/invitation belongs
to this community when those models exist. A management capability alone is not a
complete ride authorization decision. Do not control the transaction, await network
work or publish external effects from the callback.

Account deactivation/identity unlinking and membership role changes/removal serialize
against this protected SQL. A change already committed is observed on the next
operation; a competing change waits for the current authorized transaction to end.
This establishes database ordering, not socket/media termination, remote cleanup,
provider consistency or zero-delay session revocation. Future mutators still need
consistent lock ordering, domain validation, idempotency and membership-change audit.

Real PostgreSQL tests cover the full approved matrix, cross-community isolation,
unrecognized/ride/location capability refusal, creator metadata without membership,
inactive accounts, invalid/canonical UUIDs and observed row-lock contention during
role revocation/removal. External identity alone is stubbed in this suite; no public
operation, live Clerk or physical device is exercised. Full P6 acceptance and audit,
R1–R4 lifecycle/media policy and the other open decisions remain separate.
