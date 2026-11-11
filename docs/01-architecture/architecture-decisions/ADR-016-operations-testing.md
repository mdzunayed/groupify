# ADR-016: Operations, testing, and release

**Status: Proposed.** No environments, infrastructure, monitoring provider, or test devices are provisioned by this record.

**Options considered:** Local checks only; layered automated, integration and physical-device validation with separate environments; full multi-region production-style infrastructure before requirements are known.

**Recommendation and reasoning:** Evaluate a layered test and release strategy with isolated development/staging/production configuration, redacted observability, restore tests, cost monitoring and targeted Android device validation. Use the project's Expo build/CNG direction with a release boundary between JavaScript updates and native binaries. Exercise failures and privacy invariants before acceptance.

**Trade-offs and cost/operations:** Device access, staging, monitoring, backup drills and integration tests incur cost and work; local-only success misses platform restrictions and provider failures. Full multi-region infrastructure would add unvalidated expense and complexity. Named operations ownership and service objectives are not yet assigned.

**Reversibility:** Portable test cases, documented configuration and recovery exercises reduce migration costs; release signing, cloud data and provider-specific monitoring still need planned transitions.

**Approval required:** Environment topology, release policy, device/API matrix, monitoring and retention, operational ownership, test scenarios, backup/restore targets and budget before execution or production claims.

**Evidence:** [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/), [Android foreground-service types](https://developer.android.com/develop/background-work/services/fgs/service-types), [operations and testing](../operations-and-testing.md).
