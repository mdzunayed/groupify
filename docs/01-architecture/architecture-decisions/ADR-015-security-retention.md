# ADR-015: Security, retention, and deletion

**Status: Proposed.** Active-ride location boundaries, 30-day detailed-location retention subject to legally required retention, immediate account deactivation, 30-day recovery and subsequent personal-data deletion subject to legal retention are approved.

**Options considered:** Client-enforced permissions and best-effort cleanup; centralized server authorization with data inventory, scheduled enforcement and provider/backup handling; indefinite retention pending manual cleanup.

**Recommendation and reasoning:** Evaluate server-side authorization and deactivation, protected credentials and encrypted transport, minimal/redacted data, separate retention and deletion processes, and verifiable handling of local copies, providers and backups. Recheck authorization for WebSocket, media, historical and emergency access. Do not treat successful local deletion or provider requests as proof that every copy has been deleted.

**Trade-offs and cost/operations:** Provider deletion, backups, encryption/key management, audit, recovery and restore testing require ongoing engineering and storage/operations budget. An unavailable server cannot immediately confirm deactivation from an offline device. Redaction can limit diagnostics.

**Reversibility:** Deactivation can be reversed during the approved recovery window; permanent deletion is intentionally irreversible. Storage and identity migrations require retention-aware transfer and verification.

**Approval required:** Location retention start, applicable legal obligations and their enforcement, local/backup/provider handling, encryption/key strategy, account recovery, shared records, SOS-history retention and the complete authorization model. The approved legal qualification does not establish a blanket extension of location retention.

**Evidence:** [Android security best practices](https://developer.android.com/privacy-and-security/security-best-practices), [Expo SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), [flows](../flows-and-security.md).
