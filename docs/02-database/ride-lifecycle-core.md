# Internal community ride start/end

Status: partial T059/P7 implementation in review. The owner confirmed2026-11-14:
“Community Leader/Co-leaders manage start and end”. This records authority only;
it does not accept a phase or settle participation/other ride roles. See
[ADR-026](../01-architecture/architecture-decisions/ADR-026-community-ride-lifecycle.md).

`RideLifecycleService.start/end(authorization, communityId, rideId)` reuses current
active-account and community manage_rides authorization. It locks the scoped ride
FOR UPDATE while holding account/link/membership locks through commit. Another
community's role and ride creator metadata confer no authority. Invalid ride IDs
fail400; missing/differently scoped rides fail404 after community authorization.
Member/missing/inactive mappings fail closed through the existing boundary.

The internal state sequence is draft -> active -> completed. Both immediate and
scheduled modes require explicit start/end. A planned scheduled time is retained;
it never auto-starts a ride and imposes no extra start permission. Explicit early
start is a reversible behavior in review. There is no scheduler, cancellation,
reopening, automatic end, concurrent-ride cap or notification transport.

Repeated start on active and repeated end on completed return current metadata
after fresh authorization. Start on completed and end on draft conflict409.
Concurrent commands serialize on the ride row; a completed ride cannot reopen.
The frozen result contains only ID, canonical community ID, state and UTC start/
end instants, returned after commit. A deferred commit failure rolls back writes
and returns the existing safe503 rather than a successful uncommitted state.

Server timestamps and verified start/end actor IDs persist minimal history. Each
instant is clamped to its previous stored time for nondecreasing ordering across
wall-clock adjustments, not elapsed-time measurement. SQL constrains state,
timestamp and actor nullability/ordering; actors use restricted account FKs.
The new migration preserves existing drafts. Its downgrade refuses active or
completed rides; all-draft rollback/reapply preserves drafts. The full empty CLI
migration cycle now includes six migrations and leaves PostGIS intact.

Three unit groups cover management delegation/actor derivation/result shape,
ID/missing/denied handling and retry/conflict behavior. Eight actual PostgreSQL
groups cover both modes/roles, replay/current-state checks, failed accounts/roles,
community isolation, racing commands, observed demotion locking, migration/
constraint/FK history protection and deferred commit rollback for start and end.
Only upstream identity is stubbed. SQL fixture mutation/trigger injection is test
instrumentation, not an application endpoint or bypass.

This module has no ride HTTP controller/app action. Starting does not auto-enroll
any rider, enable tracking or grant access to location/chat/PTT/SOS. Those require
their own current participant/active-ride/consent predicates. Join/leave eligibility,
other role assignment, complete ride history visibility, offline reconciliation,
notifications, media/provider/device proofs and retention/erasure handling remain
unfinished. Start/end metadata does not extend the separate30-day detailed-location
retention period or choose applicable legal obligations.
