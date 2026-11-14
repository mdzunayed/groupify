# P1/P4 foundation gap review — 2026-11-14

This compares the tracker, approved directions and checked-in implementation.
It does not accept a phase or select an external provider. The preceding work
is stacked on `task/p4-backend-module-boundaries` (`ae4e13b`); main has not merged
that stack as of this review.

| Area | Evidence now available | Remaining dependency / next action |
| --- | --- | --- |
| P1 client/backend direction | Owner-selected Expo/React Native and NestJS; locked installs, module composition and local checks | Native Room/Kotlin/Material integration and Android support/device matrix remain open; no primary-stack reversal |
| P1 identity/OTP | Clerk approved for development; actual SDK verifies locally signed test tokens | Live development keys/configuration and native token claims unverified; production SMS/provider, Bangladesh delivery and prices remain open |
| P1 hosting/cost | Existing VM/managed-service comparison and planning cost model | Provider, region, topology, backups, actual quotes/usage and operational responsibility need review; no provisioning or price-fit claim |
| P1 maps/PTT | OSM-based map direction, native in-app PTT requirement and comparison/device protocols | Renderer/tiles/routing/geocoding and audio transport not selected; physical background GPS/PTT/audio-focus/battery proof absent |
| P4 HTTP/module foundation | Public health, migration-name readiness, safe errors/request IDs, health OpenAPI, explicit health/HTTP/identity modules | Product APIs/account-state authorization/WebSockets are not implemented; R1–R4 draft does not grant access |
| P4 real dependency testing | Parent commit's hosted CI run succeeded, including PostGIS/Redis and Android-JS steps | Managed local Docker PostGIS extraction failed with no space left on device; that local environment issue remains unresolved. Hosted evidence applies only to the recorded commit |
| P4 process lifecycle | Real-entry-point startup, safe invalid-port failure, bind failure, SIGTERM disposal and in-flight HTTP drain checks added | No selected deployment/load balancer, pre-stop readiness policy, forced-shutdown deadline, persistent job/DB/WebSocket/media drain or production proof |
| P4/P16 operations | JSON process logs, safe HTTP errors and correlation; scoped lifecycle events | Monitoring/alert ownership, log retention/access, database restore evidence, provider failure handling and release operations remain open |

## Hosted evidence and local limitation

GitHub Actions [run 43486975525](https://github.com/mdzunayed/groupify/actions/runs/43486975525)
for exact parent commit `ae4e13bb6838cc43241583f3108dab026e69a020` completed successfully.
The `verify` job reports successful app checks, backend tests, real PostGIS/Redis
integration and Android JavaScript bundling. This is hosted test evidence for that
commit, not physical Android, live Clerk, production hosting or phase acceptance.
Implementation commit `7aaf58878c1c6ec6089a69a9a2ea717c214fc219` subsequently passed [run 43541591598](https://github.com/mdzunayed/groupify/actions/runs/43541591598), including the new process suite and all four real dependency integration checks. Android JavaScript bundling also passed. This follow-up records that exact implementation commit, rather than inferring results for later commits.

The connector's combined-status read returned no legacy statuses; its workflow-run
lookup filters pull-request runs. The push run was located with GitHub's read-only
Actions API and its steps verified through the connector. Absence of legacy status
entries was not treated as absence or success of CI.

The prior local Docker failure occurred in VFS image extraction under the managed
daemon's inaccessible storage path. No unrelated image/volume pruning, daemon
reconfiguration, checksum bypass or repeated unchanged image pull was used to
make it pass. Hosted integration success does not repair that local daemon.

## Scope of the new lifecycle proof

The process suite runs `dist/main.js` with the pinned Node executable, loopback
binding and isolated application configuration. It asserts public liveness,
503 readiness without dependencies, safe startup failures and completed HTTP
shutdown. An acknowledged unfinished JSON request remains in flight while SIGTERM
arrives; it must finish before disposal is reported. Temporarily removing shutdown
hooks makes that test fail, and the hooks were restored before final verification.

`http_shutdown_complete` means Nest reached its post-HTTP-disposal hook. It is not
proof of database durability, queue/media draining, mobile logout, offline cleanup
or delivery to riders. The test watchdog is not a production shutdown deadline,
and no PTT speaking-duration timeout or other product limit is introduced.

## Next work

The current implementation has hosted real-dependency evidence as recorded above. Extend development verification to check current provider-session status without granting product access; local JWT validity cannot detect provider revocation.
Repair local Docker storage through the managed environment before claiming local
PostGIS/Redis/migration validation again. Confirm the account/profile draft's
R1–R4 decisions before dependent P5 endpoints/migrations; obtain live development
identity/native-claim and physical-device evidence before claiming those flows.
No automatic recovery, role/visibility permission, legal hold or provider selection
is inferred from this review.
