# Groupify backend foundation

This is the beginning of the approved NestJS modular monolith. It provides liveness and dependency-readiness checks, local PostgreSQL/PostGIS and Redis services, and a migration baseline. It does not yet implement product APIs, authentication, authorization, WebSockets, or a production deployment.

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
- `npm test` builds the backend and checks liveness, missing configuration, and malformed connection settings.
- `npm run test:integration:docker` creates isolated temporary Compose services with a generated password, checks migration repeatability and rollback/reapply, and verifies readiness against healthy, unmigrated, and failing dependencies. It removes only the containers and volume created for that test.

## Migrations and authorization boundary

`node-pg-migrate` tracks ordered, transactional migrations in PostgreSQL. The baseline verifies that PostGIS is already installed; it creates no product tables and does not own or remove the extension. Its down migration removes only the baseline's migration record. Future schema changes require reviewed migrations, a rollback or forward-recovery plan, and appropriate backup/restore evidence before use on shared data. Never treat a local migration test as evidence of a production rollback.

The health endpoints expose no product data. Future API and WebSocket operations must validate identity and enforce account state, membership, role, active-ride status, and consent on the server; an unimplemented policy must not become an implicit grant. Production Clerk/SMS selection, detailed role assignment, schema and API contracts remain open.

`node-pg-migrate` currently declares a vulnerable `glob` dependency range. The lockfile overrides it to `glob` 14.0.4; the migration integration checks exercise the selected combination. Reassess this override and upstream compatibility when dependencies are updated. The backend production-dependency audit reported no vulnerabilities on 2026-11-11; that is a point-in-time result, not a security review.
