# Implemented backend module boundaries

**Status: P4 foundation in review.** This applies the approved NestJS modular
monolith direction in ADR-002. It does not accept a phase, add product APIs or
resolve the account/profile/lifecycle draft's R1–R4 decisions.

| Module | Owns | Exposes |
| --- | --- | --- |
| `AppModule` | Production composition of HTTP infrastructure, health and development identity | No controllers, business providers or authentication policy of its own |
| `HttpInfrastructureModule` | Server-generated request-ID middleware on all HTTP routes and the global safe error filter through `APP_FILTER` | HTTP presentation only; no exported business service or identity/account grant |
| `HealthModule` | `HealthController` and private `HealthService`; liveness and PostGIS/Redis/applied-migration-name readiness | Only the existing public `/health/live` and `/health/ready` routes; no exported readiness provider |
| `IdentityModule` | Development verifier/configuration and pinned Clerk SDK integration | Exports verifier; no global role/resource grant |
| `AccountsModule` | Account/link persistence, authorization/provisioning, explicit development bootstrap controller | Current account transactions; no implicit login provisioning/profile/recovery |
| `CommunitiesModule` | Internal creation/initial Leader and management capability boundary | No public mutator, ride/location or invitation workflow |
| `RealtimeModule` | Opt-in development upgrade/diagnostic protocol | Private owned transport; no product broadcast API |

The root composes modules rather than redeclaring their providers/controllers.
HTTP filtering remains global at the application boundary. Request-ID middleware
also applies to controllers supplied by other imported modules; the existing
HTTP/error and identity-probe tests exercise that wiring. Main-process logging,
startup configuration and shutdown hooks remain in `main.ts`.

Health files remain at their original source paths. In particular, compiled
`HealthService` stays under `backend/dist`, preserving its existing migration
lookup relative to `__dirname`. This refactor changes no connection lifetime,
timeout, readiness condition, migration path or HTTP payload/header contract.
Readiness is a probe, not a product database/Redis access layer or authorization
check. Physical PostGIS/Redis proof is still a separate integration check.

A future consumer imports the owning module and uses its explicit exports; it
must not duplicate SDK/client configuration or register another copy of a private
provider in the root. The contract tests' container lookup to stub readiness is
test instrumentation, not a supported cross-module production dependency.

Account/profile, community, ride, location, chat, PTT, SOS and entitlement modules
are not implemented. No empty placeholder modules or shared product repositories
are introduced. Their resource/account/role/active-ride/consent boundaries require
actual contracts and tests before access is enabled. External-session verification
alone remains insufficient. See [the current contract proposal](../02-database/account-profile-contract.md),
[development identity limits](../authentication-backend.md) and [implemented HTTP conventions](../03-api/api-conventions.md).

HTTP infrastructure also owns `HttpLifecycleService`, which records an allowlisted
HTTP-disposal completion event through Nest's lifecycle hook. Process startup,
configuration validation and signal registration remain in `main.ts`; the
[real-process suite](../06-testing/backend-process-lifecycle.md) checks that wiring.

`AccountsModule` imports identity and exports the internal account authorization
transaction. It owns account/link persistence and current-state SQL checks; it has
the explicit protected development bootstrap controller, without profile/recovery
grants. See [its exact boundary](../02-database/account-authorization-foundation.md).

It also exports explicit internal account provisioning. Both services share private
transaction/locked-lookup infrastructure; provisioning is never automatic during
verification or authorization. Creation and concurrent-link resolution are atomic,
with no implicit reactivation or phone-based merge. Its single explicit development
HTTP route never creates from an arbitrary login/protected request.

`CommunitiesModule` imports accounts and owns internal atomic community/initial
Leader creation. It has no public controller, membership mutation or ride/location
grant. See [creation scope and open dependencies](../02-database/community-creation-core.md).

The module also exports a current-membership management capability transaction
using the approved Leader/Co-leader grants. It locks membership through protected
SQL and adds no mutator, public controller or active-ride access. See [the matrix](../02-database/community-management-authorization.md).

`RealtimeModule` owns a private opt-in development WebSocket adapter on the existing
HTTP server. It uses account authorization before upgrade and each supported probe,
cleans its owned listener/sockets and exports no product send/broadcast API.
See [protocol scope](../03-api/development-websocket.md).
