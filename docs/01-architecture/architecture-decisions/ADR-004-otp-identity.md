# ADR-004: Phone OTP and identity

**Status: Partially approved on 2026-11-11.** The owner approved the existing Clerk integration for development. The production identity provider, SMS route and delivery arrangement remain unselected.

**Options considered:** Existing Clerk integration; Firebase Authentication phone verification; Twilio Verify with a suitable identity/session layer; a Bangladesh-capable SMS gateway combined with a separately designed verification and session service.

**Decision and reasoning:** Continue the existing Clerk integration for development without treating it as a production selection. Compare production options with Firebase and a managed verification or local-gateway candidate using Bangladesh carrier delivery, sender registration, account recovery, abuse controls, provider support and realistic quotations. Distinguish the identity vendor from its SMS delivery arrangement. The backend must independently enforce Groupify authorization.

**Trade-offs and cost/operations:** Managed verification can reduce OTP handling but introduces vendor dependency and per-message/verification costs; Twilio's published Verify base is US$0.05 per successful verification plus channel fees, and Clerk lists international SMS at market rate. Neither establishes a Bangladesh quote. Gateway-only integration transfers OTP generation, abuse prevention, delivery and lifecycle obligations to Groupify. Trial success or mocked tests do not establish Bangladesh production coverage, price or delivery.

**Reversibility:** An identity adapter and stable internal identity mapping can reduce migration coupling, but migrating verified numbers, sessions, deletion obligations and users between providers is nontrivial.

**Approval required:** Production provider and SMS route, rates/limits, recovery and deletion behavior, and any fallback before production integration. The development selection and current Clerk code are not production approval.

**Evidence:** [Clerk phone options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options), [Firebase pricing](https://firebase.google.com/pricing/), [Twilio Verify pricing](https://www.twilio.com/en-us/verify/pricing), [Twilio Bangladesh sender registration](https://help.twilio.com/articles/360043173934-Documents-Required-and-Instructions-to-Register-Your-Alphanumeric-Sender-ID-in-Bangladesh).
