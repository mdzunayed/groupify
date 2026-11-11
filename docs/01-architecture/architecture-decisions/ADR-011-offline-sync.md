# ADR-011: Offline recording and conflict handling

**Status: Proposed.** Offline local location recording, last-known display and later synchronization are approved; a conflict policy is not.

**Options considered:** Last-write-wins for all objects; immutable event/outbox with idempotent acceptance and domain-specific conflict rules; manual resolution for every conflict.

**Recommendation and reasoning:** Evaluate an outbox with stable operation identifiers and server-confirmed durable acknowledgements. Treat location records as time-scoped observations rather than overwriting shared state; use separately approved rules for chat, membership, ride status, consent and mutable objects. Show local vs server-confirmed vs remotely received states where evidence exists. Do not assume the server accepted an offline action.

**Trade-offs and cost/operations:** Additional local storage, retries, ordering metadata and reconciliation cost more than last-write-wins. Generic automatic overwrites can silently lose data or restore obsolete permissions. Replay after the active ride, client-clock trust, consent revocation and retention interaction remain unresolved and may require rejecting or quarantining data.

**Reversibility:** A versioned queue and domain-specific adapter improve migration, but data already merged or deleted cannot necessarily be reconstructed. No exact event schema or API is approved.

**Approval required:** Object-specific conflict policy, visibility rules, delayed-upload eligibility, ordering and clock trust, queue expiry, server acknowledgements and retention behavior. Live location must never be shared outside an active ride.

**Evidence:** [Room asynchronous queries](https://developer.android.com/training/data-storage/room/async-queries), [Android offline-first guidance](https://developer.android.com/topic/architecture/data-layer/offline-first), [flows and privacy](../flows-and-security.md).
