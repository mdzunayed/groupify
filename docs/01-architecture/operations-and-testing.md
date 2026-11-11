# Operations, testing, and release boundaries

This is a **Proposed** operational and testing architecture, not evidence that infrastructure, testing devices, services, or release environments exist. Decisions and provider selections require approval. [ADR-016](architecture-decisions/ADR-016-operations-testing.md)

## Environments and release

- Propose logically separated local/development, staging and production settings, identities, credentials, data and access. No production data or secrets in source control, test fixtures, logs, or mobile bundles.
- Expo Continuous Native Generation and the project's EAS direction support reviewed development and release builds. Native modules, microphone/location permissions, config plugins, runtime versions and compatible updates must be part of the binary/release plan; an over-the-air JavaScript update cannot add missing native code or permissions.
- No cloud resource, provider account, build, production release, database migration, or infrastructure configuration is created in Phase 1. Promotion, rollback, signing, Play release and operational ownership remain to be approved for a later phase.
- Propose non-production synthetic identities and data; staging must not accidentally notify real riders or use real emergency services.

## Observability and failure handling

Propose redacted, access-controlled operational events and metrics for API/authorization failures, WebSocket connections/reconnects, server commit failures, offline backlog/age, location retention cleanup, PTT grant and media health, push handoff, SOS acknowledgement stages, account deletion/recovery and provider spending. Use correlation that does not disclose OTPs, tokens, precise locations, emergency contents or audio. Provider, retention, alert thresholds and on-call ownership are open.

Measure local enqueue, server commit, downstream notification handoff and device receipt separately. Log a state only when its evidence exists. Reconnect and retries must be idempotent under a later approved conflict policy; backoff and user-visible failure behavior need design. A failed PTT dependency should fail safely, and an SOS must not be reported delivered solely because it was queued locally or accepted by a push service.

## Testing architecture

| Layer | Proposed evidence |
| --- | --- |
| Domain and policy | Unit/property tests for three roles, opt-in and active-ride boundaries, free entitlements, retention clocks, recovery and PTT arbitration invariants. Unknown permission rules remain blocked, not guessed. |
| Local data and integration | Room migrations and outbox/idempotency tests, process-death recovery, server transactions, PostGIS queries, provider-adapter contracts, authorization on API and each WebSocket action. |
| Realtime and concurrency | Competing PTT requests, lost media/control connectivity, reconnect, stale grants, fencing, Redis restart and network partition; no duration-based release or double speaker. |
| Privacy and deletion | Cross-account access tests, revoked roles/session checks, active-ride boundaries, actual 30-day enforcement with test clocks, deletion/recovery, provider propagation, backup restore and redaction. |
| SOS and chat | Manual SOS, live/last-known location, uncertain or unavailable connectivity, server acknowledgement vs delivery evidence, Leader/Co-leader resolution, history, free access, text/read receipts and duplicate/reordered events. |
| Android physical devices | Target-supported Android versions and real devices after that matrix is decided: screen locked/background, microphone start restrictions, audio focus, permissions denied/revoked, battery optimization, process termination, poor network and local offline recording. |
| Capacity and cost | Reproducible workloads based on owner-approved population, concurrency, ride sizes and sampling assumptions; observe fan-out, media relay/egress, database, cost and recovery. [Cost and capacity](research-cost-capacity.md) supplies variables, not targets. |

**Risk:** Simulator success cannot validate device-vendor background behavior or SOS delivery. The [proposed device validation plan](device-validation-plan.md) describes PTT and background-location experiments; no spike or physical-device proof was performed in Phase 1. Later implementation and release remain gated on approved decisions and the relevant evidence.

## Requirements traceability and handoff

These references show where the approved [Phase 0 requirements](../00-product/product-requirements.md#approved-decisions-and-acceptance-checks) are addressed in the proposed architecture; they do not claim the behaviors have been implemented or tested.

| Requirement | Proposed architecture coverage |
| --- | --- |
| PR-01: Android, Bangladesh, English, rider types | [System context and client](system-architecture.md#android-client-boundaries); [capacity and provider research](research-cost-capacity.md). |
| PR-02: Phone OTP | [Identity flow](flows-and-security.md#identity-and-authorization); [ADR-004](architecture-decisions/ADR-004-otp-identity.md). |
| PR-03: Rider profile | [Profiles boundary](system-architecture.md#backend-modules-and-data-ownership). |
| PR-04, PR-05: Communities and three roles | [Community and ride model](flows-and-security.md#communities-and-ride-lifecycle); [permission matrix](../00-product/business-rules.md#role-and-permission-matrix). |
| PR-06, PR-07: Rides, routes and breakpoints | [Community and ride model](flows-and-security.md#communities-and-ride-lifecycle); [mapping candidates](architecture-decisions/ADR-005-mapping.md). |
| PR-08, PR-09, PR-21: Active-ride opt-in, adaptive GPS and background/screen-off tracking | [Location flow](flows-and-security.md#active-location-and-later-synchronization); [ADR-009](architecture-decisions/ADR-009-gps-sampling.md); [device plan](device-validation-plan.md). |
| PR-10, PR-11: Offline recording, synchronization and location retention | [Location flow](flows-and-security.md#active-location-and-later-synchronization); [ADR-011](architecture-decisions/ADR-011-offline-sync.md); [retention](flows-and-security.md#retention-deletion-and-privacy). |
| PR-12, PR-13, PR-14: PTT interaction, priority and Android background operation | [PTT flow](flows-and-security.md#ptt-control-and-audio); [ADR-006](architecture-decisions/ADR-006-ptt-transport.md); [ADR-012](architecture-decisions/ADR-012-ptt-arbitration.md); [device plan](device-validation-plan.md). |
| PR-15: Chat, receipts and Leader announcements | [Chat and push](flows-and-security.md#chat-push-and-sos); [ADR-014](architecture-decisions/ADR-014-realtime-notifications.md). |
| PR-16: Manual SOS and emergency history | [SOS flow](flows-and-security.md#chat-push-and-sos); [failure testing](operations-and-testing.md#testing-architecture). |
| PR-17: Completed ride history | [Ride boundary](system-architecture.md#backend-modules-and-data-ownership); [ride lifecycle](flows-and-security.md#communities-and-ride-lifecycle). |
| PR-18: Deactivation, recovery and deletion | [Retention and deletion](flows-and-security.md#retention-deletion-and-privacy); [ADR-015](architecture-decisions/ADR-015-security-retention.md). |
| PR-19: Freemium and free essentials | [Entitlement boundary](system-architecture.md#cross-cutting-flows); [ADR-010](architecture-decisions/ADR-010-subscriptions.md). |
| PR-20: Infrastructure planning allowance | [Cost and capacity model](research-cost-capacity.md); [ADR-003](architecture-decisions/ADR-003-hosting.md). |

Architecture research completion does not approve any provider. The owner requested work through the roadmap on separate phase branches for review; unresolved choices still need decisions before dependent implementation relies on them.
