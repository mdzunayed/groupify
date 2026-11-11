# ADR-007: Dependency and platform versions

**Status: Proposed.** Apart from the explicitly approved Node runtime below, exact release versions, Android API support and toolchains are unselected.

**Approved decision — development and CI Node runtime only:** The product owner delegated this Phase 2 choice. Use Node 26.13.0, recorded in `.nvmrc`: it is an LTS release, meets the SDK 58 minimum, supports the existing native TypeScript-stripping tests, and passed the local checks. Review compatible security updates before changing the pin. Other dependency, platform and release versions remain unselected.

**Options considered:** Keep the currently installed SDK family for initial evaluation; upgrade to a later compatible Expo/React Native set; start from a fresh independently approved version baseline.

**Recommendation and reasoning:** Use the existing Expo SDK 58 project as the research baseline, run Expo's compatibility checks, and evaluate the selected native candidates against its versioned docs and a future Android device/build matrix. The observed local resolution is Expo 58.0.23, React Native 0.88.1 and `@expo/ui` 58.0.27; `expo install --check` passed locally. These are observations, not approved release pins. Future dependencies must use SDK-compatible installation and must not be added during Phase 1.

| Component | Candidate / published evidence | Compatibility or decision still needed |
| --- | --- | --- |
| Node development / CI runtime | Node 26.13.0 is the explicitly selected pin. | Review security updates and compatibility before changing it. |
| Expo / React Native / Expo UI | Existing local resolutions: 58.0.23 / 0.88.1 / 58.0.27. | Exact releases and native provider SDK compatibility are not approved; the local check is not a device test. |
| Kotlin | JetBrains' release page lists 2.4.21; Kotlin 2.0+ is the retained direction for Kotlin native work. | Select only a version compatible with Expo's Android Gradle toolchain and approved native modules. |
| Room | Android's release page lists 2.8.5 as stable. The 2.8 line increased that library's Android minimum API to 23. | That library minimum is not an approved product minimum; verify Expo/Kotlin/KSP compatibility and decide the supported-device range. |
| PostgreSQL | The official support table lists supported 18 and 17 lines, with current minors shown as 18.6 and 17.11. | Check release availability, PostGIS compatibility, provider support, backup and migration paths at selection time; no database version is approved. |
| Android target API | Current Google Play documentation requires Android 16 / API 36 or higher for most new apps and updates, subject to its stated exceptions. | This is a published distribution requirement, not an approved minimum Android version. Recheck policy before release. |
| PostGIS, Redis, backend runtime and provider SDKs | The approved directions and candidate frameworks have official compatibility/support information. | Exact compatible versions are not verified or selected; do not infer them from unrelated components. |

**Trade-offs and cost/operations:** Staying avoids immediate migration work but can inherit unsupported or incompatible native packages; upgrades consume test and rebuild time. A successful dependency check does not validate PTT, background services or provider SDKs on real devices.

**Reversibility:** Lockfiles and reproducible builds help roll back compatible changes, but native binaries, data migrations, store requirements and over-the-air runtime compatibility limit rollback.

**Approval required:** Exact Expo, React Native, Kotlin/native, Android minimum/target API, native-module, backend and database versions; release/support policy; tested upgrade path. No platform value is invented here.

**Evidence:** [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Node releases](https://nodejs.org/en/blog/release), [Node TypeScript support](https://nodejs.org/api/typescript.html), [Expo SDK upgrade guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [Kotlin releases](https://kotlinlang.org/docs/releases.html), [Room releases](https://developer.android.com/jetpack/androidx/releases/room), [PostgreSQL support](https://www.postgresql.org/support/versioning/), [Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk), [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).
