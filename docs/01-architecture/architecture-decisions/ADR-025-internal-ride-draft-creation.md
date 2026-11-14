# ADR-025: Internal non-active ride creation

Status: implementation direction in review, not P6/P7 acceptance. Approved inputs
are permanent communities with multiple immediate/scheduled rides and current
Leader/Co-leader ride management. Ride leadership, join/leave and start/end rules
remain open under OD-14/OD-21. This increment implements creation storage only.

RidesModule imports CommunitiesModule and reuses its current scoped
manage_rides transaction. Create an immediate or future scheduled ride for that
verified active account/community, atomically returning only after commit. The
creator is audit metadata, never an implicit ride Leader or participant. No caller
account, role, state, participant or tracking selection is accepted.

Initial state is only draft, enforced in SQL. This is a reversible technical
representation of an unstarted record, not a selected complete lifecycle.
Immediate describes intent; it does not activate automatically. There is no
active ride, participant, location, chat, PTT, SOS or notification capability.
No public controller/app action or production identity selection is added.

The internal scheduled input is a valid server Date value, copied to an immutable
UTC millisecond string before SQL. PostgreSQL's single captured creation instant
decides whether it is future; immediate has no scheduled time. No scheduling
horizon, community/ride cap, timezone UI or automatic start policy is chosen.
Future HTTP serialization/validation needs its own explicit contract.

Separate ride UUIDs reference their permanent community and creator with restricted
foreign keys. Index community/time/ID for future scoped queries. Populated downgrade
refuses loss; the full empty-chain integration test includes the new table.
Personal/shared creator metadata remains subject to the future actual erasure/
retention policy, without extending the independent30-day location rule.

Acceptance for this slice: current Leader/Co-leader can commit both draft modes;
invalid/unauthorized/stale role or account state cannot create; schedules use the
database clock; independent rides share a community; constraints and populated
downgrade protect records. Prove this with actual PostgreSQL and current row-lock
boundaries, stubbing only upstream identity. Local stubs prove validation/order
only; hosted SQL evidence is required while managed local Docker is storage blocked.
