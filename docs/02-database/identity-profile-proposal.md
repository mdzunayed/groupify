# Identity and rider-profile proposal

**Status: Proposed for review; not a schema or API contract.** The owner approved Clerk for development and the product requirements for phone OTP, rider profiles, immediate deactivation, 30-day recovery, and subsequent deletion subject to legal retention. The production identity/SMS provider, profile-storage details, and recovery and shared-record handling remain open. No migration or production account is created by this proposal.

## Proposed data boundaries

| Concept | Candidate responsibility | Decisions still needed |
| --- | --- | --- |
| Groupify account | A stable internal identifier, account status, and timestamps for a deletion request and recovery deadline. The backend checks status for each protected operation. | Exact states, clock semantics, recovery proof, legal holds, and treatment of shared records. |
| External identity | A unique provider/subject association to the internal account; verified provider identity is not itself permission to access a community or ride. | Linking, unlinking, provider migration, account recovery, and production provider. |
| Rider profile | A name, picture reference, rider type (motorcycle or bicycle), and optional vehicle information associated with one account. | Validation and field limits, photo storage and deletion, visibility, and the vehicle-information representation. |

Use constraints and transactions to prevent duplicate external-identity links and inconsistent account/profile updates. Avoid storing OTP codes, session tokens, or provider secrets in product tables or logs. This proposal does not assume that a provider subject is a permanent Groupify user identifier, that a photo URL is safe or durable, or that a verified phone number is sufficient recovery proof.

## Proposed access and lifecycle boundaries

1. Validate a provider session on the backend using the provider's supported SDK. Reject invalid, expired, pending, or otherwise unauthorized sessions. A client-side navigation guard is not backend authorization.
2. Resolve the verified external identity to the Groupify account and check its current server-side status before granting protected access. Deactivated accounts must not regain access merely because a provider token remains valid.
3. A deletion request must be durably accepted before the server reports deactivation. The 30-day recovery period and eventual deletion need server-authoritative time, retry/idempotency behavior, and tested handling of a request racing recovery or deletion.
4. Recovery must follow an owner-approved reauthentication procedure. After the recovery period, remove personal data subject only to applicable legal obligations, including provider-held data, media, backups, and shared records according to approved rules. Record completion and failures separately; do not claim deletion from a local action alone.
5. Grant profile visibility and editing only under an approved policy. The current starter permissions do not decide general profile visibility or who may edit another rider's information.

## Verification required before acceptance

- Exercise valid, expired, invalid-signature, wrong-issuer, pending-session, revoked/deactivated-account, and unauthorized requests. Do not log credentials or real phone numbers.
- Verify profile validation, authorization, concurrent updates, optional vehicle data, and photo failure/deletion cases against the approved schema and storage service.
- With controlled server time, test immediate deactivation, recovery at both sides of the 30-day boundary, repeated and racing requests, job retry, legal-retention exceptions, provider failures, and backup/restore behavior.
- Test real development sign-up, sign-in, session reload, and sign-out with the configured Clerk development application. Mocked tests do not establish SMS delivery, Bangladesh coverage, or production pricing.

The existing [Clerk authentication guide](../authentication.md), [open decisions](../00-product/open-decisions.md), and [retention decision record](../01-architecture/architecture-decisions/ADR-015-security-retention.md) contain the current constraints. Approve a concrete schema, recovery policy, media-storage approach, and production provider before relying on the dependent implementation.
