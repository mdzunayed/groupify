# Groupify backend foundation

This is the beginning of the approved NestJS modular monolith. It provides health/readiness, local PostGIS/Redis, migrations, development identity and internal account/community boundaries. Public product workflows, ride-specific permissions, production realtime and deployment remain unfinished.

An internal [account authorization transaction](../docs/02-database/account-authorization-foundation.md)
now maps verified external identity to active accounts under database row locks.
It backs explicit development bootstrap and active-self text; lifecycle endpoints remain absent. The account/link migration
refuses a destructive downgrade when either table contains data.
Explicit internal provisioning can atomically create an account/link or resolve
the same existing active identity. Concurrent attempts converge without orphan
accounts; inactive mappings are never reactivated. The [development bootstrap API](../docs/03-api/development-account-bootstrap.md) invokes provisioning explicitly; authentication alone never creates an account.

An internal [community creation core](../docs/02-database/community-creation-core.md)
atomically creates a community and its verified active creator's Leader membership.
It has no public endpoint, invitation, role-editing or ride/location permission.

The internal [management authorization boundary](../docs/02-database/community-management-authorization.md)
enforces the approved current-community Leader/Co-leader grants under membership
row locks. Exact operation/resource rules and public mutators remain separate work.

An [opt-in development WebSocket probe](../docs/03-api/development-websocket.md)
authenticates before upgrade and each supported account-check message on the
existing HTTP server. It is disabled by default and in production, and adds no
product broadcast, room, chat/PTT/SOS/location or automatic account creation.

Development verification checks local token validity and then current Clerk session
status through a bounded, read-only provider request. It fails closed on revocation
or provider unavailability; no product access follows. See [configuration and evidence](../docs/authentication-backend.md).

## Local development

Use the Node version in the repository's `.nvmrc` and Docker Compose. From `backend/`:

1. Run `npm ci`.
2. Supply a local `POSTGRES_PASSWORD` securely in your shell or environment settings, then run `docker compose up -d --wait`. Keep the same password while reusing the database volume; changing the variable does not rotate an existing database password.
3. Set `DATABASE_URL` to the local `groupify` database using the `groupify` user and the URL-encoded password. Set `REDIS_URL` to `redis://127.0.0.1:6379`. The optional `POSTGRES_PORT` and `REDIS_PORT` variables change the published local ports.
4. Run `npm run migrate:up`, `npm run build`, and `npm start`. The server binds to `127.0.0.1:3000` by default; `HOST` and `PORT` can override this.

The checked-in Compose configuration is for local development. Its ports bind to loopback, and its Redis instance has no authentication. Production hosting, access controls, TLS and secret handling must be configured separately; they are not selected or proven by this setup.

## Health and testing

- `GET /health/live` returns `200` when the process serves requests.
- `GET /health/ready` returns `200` only when PostgreSQL with PostGIS and Redis respond and every local migration is recorded as applied. Missing, invalid, unreachable, or unmigrated dependencies return `503` without connection details. The database role needs read access to `public.pgmigrations`, and deployments must include the `migrations/` directory. This check compares migration names; it does not verify migration contents or product behavior.
- `npm test` builds the backend and runs health and HTTP-error checks, including malformed/oversized JSON, safe error/log contents and server-generated correlation IDs.
- `npm run test:integration:docker` creates isolated temporary Compose services with a generated password, checks migration repeatability and full empty-chain rollback/reapply, and verifies readiness against healthy, unmigrated, and failing dependencies. It removes only the containers and volume created for that test. The runner marks its own fresh database with the test-only `GROUPIFY_TEST_DISPOSABLE_DATABASE=true`; direct `test:integration` callers must explicitly assure an empty disposable target with that marker before the full-chain case can run. Never use it to authorize a production/shared-data rollback. See [the migration-cycle proof](../docs/06-testing/migration-cycle.md).

## Migrations and authorization boundary

`node-pg-migrate` tracks ordered, transactional migrations in PostgreSQL. The baseline verifies that PostGIS is already installed; it creates no product tables and does not own or remove the extension. Its down migration removes only the baseline's migration record. Future schema changes require reviewed migrations, a rollback or forward-recovery plan, and appropriate backup/restore evidence before use on shared data. Never treat a local migration test as evidence of a production rollback.

The health endpoints expose no product data. Future API and WebSocket operations must validate identity and enforce account state, membership, role, active-ride status, and consent on the server; an unimplemented policy must not become an implicit grant. Production Clerk/SMS selection, detailed role assignment, schema and API contracts remain open.

`node-pg-migrate` currently declares a vulnerable `glob` dependency range. The lockfile overrides it to `glob` 14.0.4; the migration integration checks exercise the selected combination. Reassess this override and upstream compatibility when dependencies are updated. The backend production-dependency audit reported no vulnerabilities on 2026-11-11; that is a point-in-time result, not a security review.


## HTTP errors and request IDs

All HTTP errors now use `{statusCode, code, message, requestId}` with a matching
`X-Request-Id` response header and `Cache-Control: no-store`. Readiness failures
therefore have a changed body; healthy/liveness success payloads are unchanged.
Request IDs are generated by the server, never accepted from caller headers.
5xx error logs contain only allowlisted correlation/status/code fields, without
raw exceptions or request data. See [API conventions](../docs/03-api/api-conventions.md)
for status mappings, compatibility details and the unimplemented product contracts.


## OpenAPI contract checks

The checked-in [OpenAPI document](../docs/03-api/openapi.json) covers health,
development account bootstrap/self-profile text, the default-off community creation
preview and shared errors. `npm run test:contract` builds and validates it
against loopback HTTP responses; it is also included in `npm test` and existing
CI. Swagger Parser/Ajv are development-only dependencies; no Swagger endpoint or
production provider is added. Focused readiness success/failure checks stub the
readiness service result. `test:integration:docker` validates actual dependency
responses against the same document when its required services are available.


## Development identity boundary

`IdentityModule` exports a disabled-by-default Clerk development verifier with
pinned public-key checks and explicit issuer/audience/authorized-party policy.
It adds no public endpoint or product-access grant. The installed SDK also
requires a server-only development secret. See [configuration and limits](../docs/authentication-backend.md)
and `npm run test:identity`. Health endpoints do not require identity configuration.

## Module composition

`AppModule` composes HTTP infrastructure, health, identity, accounts, profiles,
communities and the optional development realtime transport.
Health owns its controller/private readiness service; HTTP infrastructure owns
request IDs/global error formatting; identity explicitly exports its development
verifier without product permissions. See [module boundaries](../docs/01-architecture/backend-modules.md).
Health file locations and migration discovery remain unchanged.

## Process lifecycle checks

`npm run test:process` builds and spawns the actual entry point with isolated
non-production configuration. It checks public health, invalid/busy ports, SIGTERM
completion and an in-flight request draining before HTTP disposal. It is included
in `npm test`. Startup failures emit fixed `startup_failed` reasons; the lifecycle
hook emits `http_shutdown_complete` after Nest disposes HTTP. No production shutdown
deadline or persistent/media drain is claimed. See [scope and reproduction](../docs/06-testing/backend-process-lifecycle.md).


## Active-self profile text

Protected development GET/POST/PATCH `/v1/me/profile` reads/creates/edits only the
current active caller's text attributes. A strong profile-identity/version ETag
prevents lost updates and cross-representation stale edits. Missing/stale conditions
are safe 428/412. There is no picture field/upload, other-rider lookup, lifecycle
operation or profile-complete claim. The app integrates text editing; required
pictures and live/native proof remain unfinished. See [actual contract and open policy](../docs/03-api/self-profile-text.md).

## Controlled community creation preview

POST `/v1/communities` accepts only a name and atomically creates a community and
its verified active caller's initial Leader membership. It requires separate exact
`GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED=true` plus development/test mode and
configured development identity; default/unconfigured/production access stays 503.
Creator eligibility remains an open product decision, so exercise only with
controlled development accounts. There is no app entry, listing, invitation,
membership mutation or ride grant. Separate POSTs create separate communities:
do not retry uncertain writes blindly. See [contract and remaining policy](../docs/03-api/development-community-creation.md).

## Container artifact

The digest-pinned Node26.13.0 multi-stage Dockerfile compiles from the backend
lockfile and packages production dependencies/migrations as non-root. The context
allowlist excludes environment files and local outputs; no provider key is baked
in. Production mode keeps development APIs/transport unavailable. Startup does not
apply migrations automatically. This is a review artifact, with hosting and
deployment still unselected. `npm run test:container` builds its own UUID image
and tests the actual service with loopback publication, read-only root, dropped
capabilities, safe production failures and clean shutdown. See
[configuration, evidence and limits](../docs/05-development/backend-container.md).
