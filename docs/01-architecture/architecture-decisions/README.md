# Architecture decision index

Records labeled **Proposed** are recommendations for evaluation, not selections or permission to implement. **Approved** records reflect explicit product-owner decisions. Assumptions and unresolved questions retain their own labels inside records. No date, owner, provider contract, pricing, dependency version, capacity target, or permission is implied.

| Record | Status | Decision area |
| --- | --- | --- |
| [ADR-001](ADR-001-client-stack.md) | Approved | Expo/React Native application direction and retained native directions |
| [ADR-002](ADR-002-backend.md) | Proposed | Backend language, framework and modular shape |
| [ADR-003](ADR-003-hosting.md) | Proposed | Hosting and deployment topology |
| [ADR-004](ADR-004-otp-identity.md) | Proposed | OTP and identity provider evaluation |
| [ADR-005](ADR-005-mapping.md) | Proposed | Map rendering, tiles, routing and geocoding |
| [ADR-006](ADR-006-ptt-transport.md) | Proposed | Native PTT media transport |
| [ADR-007](ADR-007-versions.md) | Proposed | Dependency and platform version evaluation |
| [ADR-008](ADR-008-capacity.md) | Proposed | Capacity and scaling assumptions |
| [ADR-009](ADR-009-gps-sampling.md) | Proposed | Adaptive GPS sampling and accuracy |
| [ADR-010](ADR-010-subscriptions.md) | Proposed | Subscriptions and entitlements |
| [ADR-011](ADR-011-offline-sync.md) | Proposed | Offline synchronization and conflicts |
| [ADR-012](ADR-012-ptt-arbitration.md) | Proposed | PTT priority, interruption and lock recovery |
| [ADR-013](ADR-013-native-integration.md) | Proposed | Retained Room/Coroutines/Flow integration |
| [ADR-014](ADR-014-realtime-notifications.md) | Proposed | Chat, real-time events and FCM notification boundary |
| [ADR-015](ADR-015-security-retention.md) | Proposed | Security, retention and deletion enforcement |
| [ADR-016](ADR-016-operations-testing.md) | Proposed | Operations, environments, testing and release |
| [ADR-017](ADR-017-ci.md) | Proposed | GitHub-hosted repository CI checks |

The [system architecture](../system-architecture.md), [flows](../flows-and-security.md), [operations](../operations-and-testing.md), and [research/cost model](../research-cost-capacity.md) use these records as their decision register. Phase 2 repository foundation work is authorized; later phases and the proposed decisions still require explicit authorization.
