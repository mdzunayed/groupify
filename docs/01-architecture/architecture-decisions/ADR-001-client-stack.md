# ADR-001: Android client direction

**Status: Approved.** The product owner explicitly selected Expo/React Native and authorized changing the earlier Kotlin/Jetpack Compose direction for the primary application stack. This is an approval of direction, not approval of dependencies, provider choices, native-module design, or implementation.

**Options considered:** Continue the current Expo/React Native application; use a primary Kotlin/Compose application; defer pending comparison.

**Decision and rationale:** Use Expo/React Native for the Android-first application, preserving the existing project direction. Material 3, MVVM, Clean Architecture, Room, Coroutines and Flow remain approved directions. Kotlin 2.0+ remains the approved Kotlin direction where Kotlin is used for native Android functionality. Compose is no longer mandatory as the primary app UI; a native library may use Compose internally without making it the primary application stack.

**Trade-offs and operations:** JavaScript and native lifecycle boundaries require integration and physical-device tests. Existing Expo Router and `@expo/ui` are observed dependencies, not approval of all implementation details. Development builds and config plugins may be needed.

**Reversibility:** Replacing the app stack again would entail migration and renewed approval; retaining native abstractions improves reversibility but does not eliminate that work.

**Approval required:** [ADR-013](ADR-013-native-integration.md) proposes how to retain Room/Coroutines/Flow. Material 3 implementation, exact versions, hosting and production providers remain unselected. NestJS is selected for the backend and Clerk is approved for development; see [ADR-002](ADR-002-backend.md) and [ADR-004](ADR-004-otp-identity.md). Native audio and background behavior require device validation. The connected master plan and older tracker entries still describe the former stack; tracker D25 records this later change and D20 is retained as history.

**Evidence:** [Expo native customization](https://docs.expo.dev/workflow/customizing/), [SDK 58 Expo UI](https://docs.expo.dev/versions/v58.0.0/sdk/ui/), [Phase 0 baseline](../../00-product/product-requirements.md).
