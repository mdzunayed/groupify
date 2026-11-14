# Full empty migration-chain verification

Status: P4 regression increment in review, not phase acceptance or a shared-data
rollback/recovery plan. The existing Docker runner reapplied all migrations but
its `migrate:down` call rolled back only the newest one. That did not execute the
empty downgrade paths for all earlier account/community migrations together.

The added real-database test uses the same installed node-pg-migrate9 discovery
export as readiness (`node-pg-migrate/migration`) and its actual CLI. It counts
local migrations rather than assuming the current five will always be the total,
checks the matching applied-history count and confirms all six current business
tables are empty before DDL. It runs `down <count>` with the normal migration
transaction/lock/guard behavior, then verifies zero applied rows, absence of those
tables and an unchanged working PostGIS extension. It runs `up` twice and confirms
the history, empty tables and PostGIS function return consistently. No fake,
skip-lock, destructive-data override or TLS setting is introduced.

This test is included in the existing serial integration suite, so it never
overlaps other test files' account/community/profile fixtures. The Docker runner
sets the test-only `GROUPIFY_TEST_DISPOSABLE_DATABASE=true` only after preparing
its own unique fixture configuration. Unmarked direct calls refuse before database
access. The marker is an explicit test-target assurance, not an application feature
flag or permission to run against shared/production data. The existing migrations'
populated-table guards remain active; a successful empty cycle does not prove
data-preserving rollback, erasure policy, backup or production restore.

The fixture databases belong to the existing disposable Compose project and are
removed by its exact owned cleanup. No database credentials or user data are
written into source/progress documents. Direct integration callers must prepare
all documented fixture URLs and an empty disposable database before setting the
marker; the supported Docker runner does this automatically. Keep the business
table assertions current as later schema increments are added.

Local Node26.13.0 checks pass build/70 backend and lint/typecheck/65 app cases. A
negative preflight confirms unmarked invocation refuses before any connection.
That preflight first caught an incorrect root-package discovery import; it was
corrected to readiness's actual exported subpath before publishing. It is not a
database pass. Managed local Docker storage remains unavailable, so execution of
the new64-case real integration suite must be recorded from hosted CI after push.
The separate actual-image smoke check and prior63-case SQL suite already passed
on the parent container branch; neither substitutes for this new full-cycle case.
