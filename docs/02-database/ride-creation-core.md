# Internal ride draft creation

Status: partial P7 creation increment in review, not phase acceptance. See
[ADR-025](../01-architecture/architecture-decisions/ADR-025-internal-ride-draft-creation.md).
Immediate and scheduled ride workflows remain unfinished.
The subsequent [lifecycle increment](ride-lifecycle-core.md) supersedes the initial
draft-only schema with explicit start/end; creation itself still returns only draft.

`RidesModule` exports `RideCreationService.create(authorization, communityId, intent)`
to internal consumers. It imports the existing community authorization transaction:
the provider identity must map to a current active account, with current Leader or
Co-leader membership in the requested community. Account/link and membership share
locks remain held through insertion and commit. Creator metadata or another
community's role cannot substitute for membership. The subsequent scoped
[development HTTP commands](../03-api/development-rides.md) expose this transaction.
There is no app entry, implicit account/community creation or new production identity policy.

The intent has exactly one of these internal shapes:

- `{ mode: "immediate" }` stores no scheduled timestamp.
- `{ mode: "scheduled", scheduledFor: Date }` accepts a finite Date in years1–9999,
  copies it to UTC milliseconds and requires a future database instant. Strings
  are not an internal date contract; the HTTP controller parses canonical UTC milliseconds.

The insert captures PostgreSQL `clock_timestamp()` once for both the future check
and `created_at`. Elapsed/equal schedules fail with a safe400 and no write. No
scheduling horizon, timezone UI or automatic activation is chosen. All rides have
`draft` initial state, including immediate rides. Creation returns only the
immutable committed ID, canonical community ID, mode, scheduledFor and draft state.
Unknown fields, caller account/leader/participant/state/tracking selection are
refused. Creator identity is derived from current authorization and stored only
as audit metadata; creation assigns no ride Leader or participant.

Separate UUIDs reference permanent communities and creator accounts with restricted
foreign keys. Multiple independent rides may share a community; no membership,
population or concurrency cap is introduced. The migration refuses populated
downgrade under an exclusive table lock. Empty full-chain rollback/reapply includes
the rides table and leaves the independently installed PostGIS extension intact.
These records do not contain location or extend its separate30-day retention;
actual shared-record/creator erasure and legal handling remain unresolved.

`ride-creation-unit.mjs` checks validation, permission delegation, frozen result
shape and absence of public ride/lifecycle routes. Eight real PostgreSQL groups
in `ride-creation-integration.mjs` stub only upstream identity and check committed
storage, database time, roles/community isolation, inactive/unmapped/rejected
identity, permanent communities with multiple drafts, SQL/downgrade/FK guards,
deferred commit failure and observed row-lock contention during demotion.
Fixture SQL membership/cleanup is test setup, not a product mutation API.

Participants, join/leave, other ride-specific roles, destinations/breakpoints,
notifications and visibility/listing contracts remain separate work. Community
Leader/Co-leader start/end authority was confirmed2026-11-14 and is implemented
only by the internal lifecycle service. Draft creation grants no
location, chat, PTT, SOS or other active-ride capability. Hosted SQL evidence is
required while managed local Docker storage is blocked; stubs are not that proof.
