# ADR-012: PTT priority and stale-session recovery

**Status: Proposed.** One active speaker per ride, Leader/Co-leader priority, toggle interaction, stale-session recovery and no automatic speaking-duration timeout are approved. The priority and recovery mechanisms remain open.

**Options considered:** First-come queue with role priority; priority preemption; reject competing requests without a queue; liveness-bound grants with enforced fencing; no automatic stale-session cleanup.

**Recommendation and reasoning:** Evaluate server-authoritative ride-scoped grants tied to independently observed session/media liveness and enforced at the media publication boundary. Require current authorization on request and reconnect. On verified disconnect or terminated audio, recover the stale grant; use a fencing generation or equivalent so a delayed prior publisher cannot overlap a new speaker. If liveness is uncertain, fail closed rather than grant two speakers. Keep preemption and queue fairness open.

**Trade-offs and cost/operations:** Liveness failures and network partitions cannot always distinguish a dead client from a healthy but unreachable one; conservative recovery can delay availability, while aggressive recovery risks interrupting a healthy session. Redis expiry alone is insufficient if the media layer still accepts an old publisher. State coordination, media authorization and monitoring add complexity and bandwidth.

**Reversibility:** Control and media adapters allow alternate arbitration, but tokens, fencing semantics, client state and user expectations need coordinated migration.

**Approval required:** Priority ordering, whether/when interruption is allowed, liveness criteria, partition handling, reconnect UX and empirical thresholds. Never use elapsed speaking duration alone as a timeout. Physical-device and concurrency evidence is mandatory before claiming this works.

**Evidence:** [LiveKit transport](https://docs.livekit.io/transport/), [Android foreground-service restrictions](https://developer.android.com/develop/background-work/services/fgs/service-types), [system flows](../flows-and-security.md).
