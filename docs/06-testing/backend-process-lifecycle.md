# Backend process lifecycle checks

Run `cd backend && npm run test:process` with Node from `.nvmrc`. These committed
checks also run under `npm test` and the existing CI backend-test step.

The tests spawn the actual compiled `main.js` on temporary loopback ports. Child
configuration blanks the application database/Redis/Clerk values and disables
development identity while preserving platform proxy/CA settings. No external
provider, real identity, production data or deployment is used.

Coverage:

- Real process startup serves the documented liveness response and unavailable
  readiness (503) without dependency configuration.
- SIGTERM closes HTTP and emits structured `http_shutdown_complete` with its
  allowlisted signal; the listener is then unavailable.
- A pending HTTP request acknowledged with `100 Continue` remains in flight during
  SIGTERM. Completing its JSON body allows its 404 response and subsequent HTTP
  disposal; an immediate process kill cannot satisfy the check.
- Invalid ports exit 1 with `startup_failed`/`invalid_port` and do not echo the
  supplied value. Occupied-port startup exits 1 with `bootstrap_error` after
  application cleanup is attempted.

The application-owned startup failure event never includes the raw exception or
configuration value. Framework startup diagnostics are separate; this suite is
not a blanket redaction audit of future provider adapters.

Tests destroy only child processes/sockets they create, including failure cleanup.
They do not kill arbitrary listeners or prune Docker resources. The watchdog bounds
a failing test; it does not configure an application shutdown deadline.

A negative-control run omitted `enableShutdownHooks()`: the in-flight drain test
failed as expected. Source was restored and the complete backend suite passed.
These checks prove current local HTTP lifecycle behavior. Persistent DB/job,
WebSocket/audio cleanup, SIGKILL recovery, hosting/load-balancer behavior and Android
background operation require separate implementation and evidence.
