# ADR-013: Retained native Android directions in Expo

**Status: Proposed.** Expo/React Native is the approved primary app stack. Room, Coroutines, Flow and Kotlin 2.0+ for Kotlin native functionality remain approved directions.

**Options considered:** An Expo native module exposing a Kotlin/Room data boundary with Coroutines and Flow; a third-party native library that meets the same requirements; replacing Room with a JavaScript/Expo SQLite layer.

**Recommendation and reasoning:** Evaluate a narrowly scoped Expo native module or compatible library that owns Room persistence and Android-native background work, exposes controlled operations and state to React Native, and remains usable when the JS UI is not active. Keep the JS presentation and domain interfaces independent of the native storage mechanism. Use config plugins/CNG and development builds; never hand-edit generated root native projects.

**Trade-offs and cost/operations:** The native bridge, migrations, build maintenance and device testing increase complexity and limit cross-platform reuse. Expo SQLite may reduce custom native work but would replace the approved Room direction and therefore requires explicit owner authorization; it is not the recommendation. Room is not by itself proof of encryption or background execution.

**Reversibility:** Repository interfaces and versioned local data can reduce coupling; migrations of an offline outbox and rebuilding installed binaries remain costly.

**Approval required:** Module boundary, storage encryption approach, Android background design, compatible Kotlin/Room versions, Material 3 implementation and evidence. No custom module or dependency is created in Phase 1.

**Evidence:** [Expo custom native code](https://docs.expo.dev/workflow/customizing/), [Room Flow/Coroutines queries](https://developer.android.com/training/data-storage/room/async-queries), [Expo SDK 58 UI](https://docs.expo.dev/versions/v58.0.0/sdk/ui/).
