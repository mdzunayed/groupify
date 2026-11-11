# ADR-010: Subscriptions and entitlement boundary

**Status: Proposed.** Hybrid freemium and free SOS, essential communication and basic navigation are approved; prices, limits and the full feature matrix are not.

**Options considered:** Google Play Billing with server-side purchase verification; an external subscription provider or payment path where permitted; no premium billing until a later approved phase.

**Recommendation and reasoning:** Design a provider-neutral server entitlement boundary and evaluate Google Play Billing for Android-distributed digital subscriptions, including server verification, lifecycle updates and restoration. Review current Play policies and Bangladesh availability before any payment path is selected. This proposal does not choose tiers or place an approved-free capability behind payment.

**Trade-offs and cost/operations:** Play integration entails platform fees, account setup, policy review and subscription lifecycle operations; external paths may face eligibility and policy restrictions. A server entitlement service adds verification and reconciliation work. Until prices and usage are known, revenue and infrastructure offsets cannot be estimated responsibly.

**Reversibility:** Separating purchases from entitlements reduces provider coupling, but existing subscriptions, store rules, refunds and customer migration create substantial switching obligations.

**Approval required:** Billing provider, payment flow, pricing, limits, final free/premium matrix, regional policy interpretation, failure and restore behavior. Billing failure must not revoke the approved free capabilities.

**Evidence:** [Play Billing overview](https://developer.android.com/google/play/billing/index), [backend integration](https://developer.android.com/google/play/billing/backend), [Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738).
