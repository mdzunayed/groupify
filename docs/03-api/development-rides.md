# Development ride commands

Status: partial P7 API increment in review, not a production API or phase
acceptance. Community Leaders/Co-leaders manage rides; the owner confirmed their
start/end authority2026-11-14. These commands present the existing internal
[creation](../02-database/ride-creation-core.md) and
[lifecycle](../02-database/ride-lifecycle-core.md) transactions without a new
authorization grant. They use the existing disabled-by-default, non-production
development identity settings; no additional preview flag or provider is added.

All commands require a current development Bearer session, active mapped account
and current Leader/Co-leader membership in the path community. Authentication
never implicitly provisions an account or community. A community creation preview
remains separately gated because its creator eligibility is unresolved.

| Command | Request | Successful result |
| --- | --- | --- |
| POST `/v1/communities/{communityId}/rides` | Exact JSON `{ "mode": "immediate" }` or `{ "mode": "scheduled", "scheduledFor": "2099-01-01T00:00:00.000Z" }` (synthetic example) | 201 committed draft: id, communityId, mode, scheduledFor, state |
| POST `/v1/communities/{communityId}/rides/{rideId}/start` | Empty body or JSON `{}` | 200 current committed active state: id, communityId, state, startedAt, endedAt |
| POST `/v1/communities/{communityId}/rides/{rideId}/end` | Empty body or JSON `{}` | 200 current committed completed state with the same lifecycle fields |

Creation accepts only application/json and exactly the selected mode's fields.
Schedules require canonical UTC milliseconds in years1–9999 and a real calendar
instant; offsets, absent milliseconds, noncanonical dates, invalid dates and
unknown fields are refused400. The server converts the validated string into the
internal Date; PostgreSQL decides whether it is still future at insertion. No
schedule horizon is added. Commands reject all query selectors. Start/end accept
no state, actor, role, participant or tracking fields. A nonempty body must be JSON.

Success and errors are no-store JSON with a fresh server X-Request-Id. Errors use
the existing fixed safe envelope; provider/SQL/body data is not reflected. No
cookie, redirect, Location header, profile/actor details or membership assertion is
returned. Disabled/production/misconfigured identity fails503; invalid session401;
missing/inactive account or insufficient community role403; invalid ID/input400;
wrong content type415; missing/differently scoped ride404 after authorization;
invalid transition409. Existing parser/error conventions also apply.

Draft creation is not idempotent: separate POSTs create separate rides. A timeout
or missing response may follow a successful commit. There is no blind retry,
idempotency key or unknown-write reconciliation contract yet, so no creation app
flow is enabled. Start/end are safe state retries after fresh authorization:
start on active and end on completed preserve existing timestamps/actors; end on
draft/start on completed conflict. Both modes require manual start/end; explicit
start may precede a planned schedule and never implies automatic participation.

No list/detail endpoint, community metadata visibility, join/leave, other ride
roles, cancellation/reopening, notification, route/map, tracking consent, active
communication/location access or ride-history visibility is implemented here.
Live Clerk/default native claims and physical Android remain unverified. Real
loopback HTTP/SQL checks stub upstream identity only; mocked controller checks
prove serialization/validation, not a live session. Production identity, abuse
policy/rate limits, audit operations and deployment remain separate work.
