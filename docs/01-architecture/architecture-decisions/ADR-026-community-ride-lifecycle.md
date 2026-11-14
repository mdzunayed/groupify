# ADR-026: Community-authorized internal ride start/end

Status: implementation direction in review, not phase acceptance. On2026-11-14
the owner explicitly answered: “Community Leader/Co-leaders manage start and end”.
This resolves start/end authority under OD-14/OD-21; ride participation, other
ride-specific roles, invitations and other lifecycle policies remain open.

Reuse current community manage_rides authorization, including active account/link
and membership locks. Lock the requested ride in that same community/transaction
before a transition. No role is inferred from creator metadata and no participant
or tracking consent is created by start/end. Expose internal services only.

The smallest representation is draft -> active -> completed. Both modes require
explicit manual start/end. Scheduled time expresses planning intent and does not
automatically activate or impose an additional start permission; a manager can
explicitly start before the planned time. This is a reversible technical behavior
in review, not a selected scheduling/notification policy. No scheduler, cancellation,
reopen, active-ride count limit or background job is introduced.

Repeated start on active or end on completed returns its current committed result
after fresh authorization. End on draft and start on completed fail409. Row locks
serialize racing commands; a completed ride cannot be reopened by retry. Missing
or differently scoped ride is404 after community authorization. Invalid IDs are400.

Record server start/end instants and verified actor IDs as minimal transition
audit/history metadata. Clamp each clock value to its previous stored instant to
preserve ordering across wall-clock adjustments; this is not a monotonic-duration
measurement. SQL enforces state/timestamp/actor consistency and restricted FKs.
Downgrade refuses any non-draft ride rather than discard transition history.
Shared-record/actor erasure policy remains unresolved and location retention
remains independently30 days subject to actual legal obligations.

Acceptance: current community Leaders/Co-leaders can manually start/end drafts;
denied accounts/roles/cross-community selection cannot mutate; safe retries,
conflicts, concurrent commands, database constraints, commit failure and demotion
locking are proved. No HTTP/app route, participant/location/chat/PTT/SOS grant,
notification delivery or complete P7/phase acceptance follows from this slice.
