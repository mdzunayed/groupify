# Roadmap implementation status

This is a snapshot of evidence in the repository and current development environment, not the live [project tracker](https://docs.google.com/spreadsheets/d/1b__35uk0LqXWKjUfO9_TMHCadurFBflXbuVo4U0YQss/edit). The tracker was inaccessible when the original snapshot was prepared; Drive reads succeeded on 2026-11-13. Phase acceptance belongs to the product owner; a branch or passing check alone does not mark a phase complete.

| Phase | Repository evidence and current status |
| --- | --- |
| P0 — Product specification | **In review:** requirements, feature matrix, business rules, journeys, assumptions, risks, and open decisions are documented. The owner confirmed Expo/React Native, the planning population, background GPS, legal-retention baseline, and starter permissions. Detailed role assignment and other decisions remain open. |
| P1 — Research and architecture | **In progress:** the owner approved a NestJS modular monolith and Clerk for development; architecture and ADRs are documented. Hosting, production OTP, maps, PTT transport, and other choices remain unapproved. PTT and background-GPS physical-device proofs have not been run. |
| P2 — Development foundation | **In review:** the repository contains a locked install, checks, Android JavaScript bundle command, and a CI workflow. A fresh HTTPS clone passed the install, lint, typecheck, 15 mocked authentication tests, and Android bundling; see the [validation evidence](foundation.md#build-and-ci-boundaries). A hosted CI run and a live Clerk session have not been verified. |
| P3 — Design system and app shell | **In progress:** the owner selected the helmet-and-road identity and Inter. A vector mark, light-theme tokens, contrast check, and [design-system notes](../04-design/design-system.md) are present. The mark and bundled Inter are integrated; shared buttons/fields and a truthful home shell exist. Authentication accessibility improvements are in review. Remaining state components, navigation and physical-device accessibility validation remain open. |
| P4 — Backend foundation | **In progress:** a NestJS health service, local PostGIS/Redis configuration, migration baseline, and integration tests are present. Readiness also checks that local migrations are recorded as applied; see the [backend guide](../../backend/README.md). Shared HTTP error responses, server-generated request IDs and safe error logs are in review. Product schema, identity/authorization, WebSockets, and deployment are not implemented. |
| P5 — Authentication and rider profiles | **In progress:** an existing Clerk phone/OTP client and mocked tests are present, and an [identity/profile proposal](../02-database/identity-profile-proposal.md) records the remaining design and verification work. A development-only external-session verifier is in review. Live authentication, Groupify account mapping/status authorization, profiles, recovery and deletion remain unverified or unimplemented. |
| P6–P16 — Communities through release | **Not assessed against the live tracker:** the checked-in app has an existing phone/OTP flow and placeholder home screen; those do not establish completion of later phases. Check each phase's dependencies and evidence before implementation or acceptance. |

See [open decisions](../00-product/open-decisions.md), the [architecture decision index](../01-architecture/architecture-decisions/README.md), and the [device validation plan](../01-architecture/device-validation-plan.md) for the specific gaps. Update this snapshot as work progresses and reconcile it with the live tracker when access is available.

## Latest task

On 2026-11-11, branch `task/p4-migration-readiness` extended backend readiness to require every local migration name to appear in PostgreSQL's migration history. The backend unit tests and Docker integration tests cover healthy dependencies, missing migration history, pending migrations, missing PostGIS, and unavailable Redis. This checks recorded names, not migration contents or product behavior. The live Google Drive tracker was not accessible from this environment; this repository record is the current local progress update.

## 2026-11-13 — truthful home shell

Branch `task/p3-honest-home-shell` starts at `c7fd364` because fetched `main` remains at `f571eb8` and none of the phase branches are merged into it. No main reconciliation was needed. This environment had no checkout; a fresh HTTPS clone was required.

The signed-in home now uses the approved light-theme colors, spacing and type scale, scrolls for smaller screens and enlarged text, and explicitly states that rides and tracking are unavailable. Fictional ride/map content and nonfunctional navigation labels were removed. No location permission or tracking was introduced. Inter loading and the approved mark remain a subsequent task.

Evidence: verified Node 26.13.0 download checksum; `npm ci`, `npm run check` (lint, typecheck, 16 tests) passed. No live Clerk session or Android device is configured here, so authenticated rendering, TalkBack and large-text checks remain unverified. Drive reads succeeded; tracker reconciliation is pending. Status: in review, not phase acceptance.

`npm run bundle:android` also passed (1,475 modules); this is a JavaScript/assets export, not an APK or device proof.


## 2026-11-13 — brand and typography integration

Branch `task/p3-brand-integration` stacks on `task/p3-honest-home-shell`. The app renders the checked-in helmet-and-road SVG with Expo Image and bundles six Inter weights through `@expo-google-fonts/inter` and Expo Font. Font loading gates navigation, with explicit startup loading/error states. Authentication typography, home tokens, sign-out feedback and startup typography use the bundled families. App configuration requests light mode. Authentication colors/layout and reusable controls still need P3 work.

SDK 58 index, Font, Image, and app-config documentation were fetched before API changes. `npm run check` passed lint, typecheck and all 16 existing tests under Node 26.13.0. Those tests cover mocked authentication and token contrast, not rendered font/image behavior. No device or live Clerk key is configured. Android font rendering, SVG appearance, offline font startup, TalkBack, dynamic text and live session validation remain open. Status: in review; no phase accepted.

Final Android export passed (1,488 modules) and includes the SVG plus exactly six Inter font assets. Imports target individual font files to avoid bundling unused weights. This does not prove device rendering or a live session. Next independent task: reusable authentication controls and the remaining token/accessibility pass; device validation needs an Android device and configured development identity.

## 2026-11-13 — shared authentication buttons

Branch `task/p3-auth-buttons` stacks on `task/p3-brand-integration`. A reusable primary/text button now serves send OTP, verify OTP and sign-out, with visible loading labels, busy/disabled accessibility states, a minimum 48-point target and flexible text height. Existing request guards and Clerk authorization remain in their callers. The authentication form's base text, surface, border, error and placeholder colors now use approved theme tokens. Full component coverage, navigation and device accessibility remain unfinished.

`npm run check` passed lint, typecheck and 16 existing tests on Node 26.13.0. The mocked tests do not establish UI rendering or live authentication. No backend code changed; historical backend and integration results have not been rerun for these UI-only tasks. No Android device/Clerk configuration is available. Next: input components and representative-screen accessibility checks. The Drive tracker's Detailed Tasks notes O28/O30 were updated and read back for the preceding two branches; phase statuses were not marked approved or complete.

`npm run bundle:android` passed for the shared-button branch (1,489 modules); no APK or device behavior was verified.

## 2026-11-13 — shared authentication fields

Branch `task/p3-auth-fields` stacks on `task/p3-auth-buttons` (`e8b7749`). A fresh fetch found no phase branch merged into `main`, and the working tree was clean before starting. SDK 58 docs/index and React Native TextInput documentation were fetched before changes.

A reusable `TextField` now serves country code, phone and OTP inputs. It supplies persistent phone-field labels, shared Inter/tokens, visible focus and disabled states, optional field-specific errors, and native input refs/callbacks. The existing phone normalization, OTP paste/focus/backspace handling and request guards remain in the screen. OTP inputs use two rows of three to retain 48-point minimum targets at 320px. Request errors remain form-level alerts rather than treating network failures as invalid input.

Verification under Node 26.13.0: `npm run check` passed lint, typecheck and all 16 existing tests. An isolated Expo Web fixture rendered the actual authentication screen with mocked Clerk resources (no SMS/session): Chromium/Playwright checked phone values/labels/focus, disabled editing during a pending request, six-digit paste and ref focus, empty-digit backspace, verification gating, 320px OTP targets/no horizontal overflow, return-to-phone value preservation, validation alerts and absence of browser runtime errors. Screenshots were inspected. The temporary harness is `/tmp/groupify-field-preview` in this environment; it is not a live-authentication test or a committed CI suite.

Device/autofill, native keyboard, TalkBack, large-text and live authentication remain unverified: no Android device or development Clerk configuration is available. Status: in review; P3 is not accepted or complete. Next: representative-screen accessibility (including enlarged text), then the remaining shell/state components whose dependencies are ready.

Final `npm run bundle:android` passed (1,490 modules); this is a JavaScript/assets export, not an APK or native device proof. No backend files changed or backend results claimed for this task.


## 2026-11-13 — authentication accessibility and large-text layout

Branch `task/p3-auth-accessibility` stacks on `task/p3-auth-fields` (`a6006f1`). A fresh fetch found main unchanged and the preceding branches still unmerged. SDK 58 index and React Native ScrollView/accessibility docs were fetched before changes.

At 320×568 with browser text sizes/line heights doubled, the original onboarding heading began 141px above the viewport and could not be scrolled into view. Onboarding now uses a ScrollView, a content-sized shared start button and a wrapping login label. False three-page pagination is removed, headings have header roles, and the decorative road image is excluded from accessibility. The dark brand-image overlay is stronger to improve text readability. Phone fields now stack so longer labels and enlarged values fit. The back and mode-switch controls have minimum 48-point targets and explicit disabled states. Resend uses the shared button with a readable countdown and disabled semantics; authorization and OTP request behavior remain unchanged.

Evidence: `npm run check` passed lint/typecheck and all 16 existing tests under Node 26.13.0. An isolated Expo Web fixture using the actual auth screen and mocked Clerk passed Chromium/Playwright checks at 320×568 with normal and simulated 2× text: heading reachable by scrolling, false pagination absent, start/login/back/phone/OTP/resend/verify controls reachable with minimum 48px targets and no horizontal overflow, country value fits, countdown disabled, and verification failure alert visible. Screenshots were inspected. The previous phone/OTP interaction smoke also passed. Scripts are `/tmp/groupify-field-preview/a11y-smoke.cjs` and `smoke.cjs` in this environment, not committed CI tests. No SMS was sent or live session established.

These browser checks scale computed font sizes and line heights; they do not prove Android font scaling, native keyboard/autofill, TalkBack announcements or focus order. Those checks remain blocked by the missing physical Android device and development Clerk configuration. Status: in review; no phase accepted. Next: reusable state treatments for startup/home, followed by device accessibility validation when available.

`npm run bundle:android` passed (1,490 modules). This is a JavaScript/assets export, not an APK or Android device validation. No backend code changed or backend test results claimed.

## 2026-11-13 — shared startup and home states

Branch `task/p3-startup-home-states` stacks on `task/p3-auth-accessibility` (`526eddb`). Fetch confirmed main unchanged and the prior stack unmerged; the checkout was clean before changes. SDK 58 index/safe-area documentation and React Native accessibility documentation were fetched before API work.

`StateNotice` and scrollable, safe-area-aware `StateScreen` now serve font loading/error, missing sign-in configuration, session loading, required account setup and home information. Startup provides SafeAreaProvider even before fonts load; pre-font/failure notices use system fonts. A missing Clerk key displays a readable configuration-unavailable state without mounting Clerk instead of throwing at module load. Pending account setup retains sign-out. Home explicitly describes features as unavailable; no empty server result or offline status is inferred. Buttons and loading notices use supported busy/disabled ARIA aliases after browser testing exposed that accessibilityState.busy was not emitted by the installed React Native Web version.

Node 26.13.0: `npm run check` passed lint, typecheck and all 16 existing tests. `/tmp/groupify-state-preview/smoke.cjs` exercises actual root/home components in an isolated Expo Web fixture. Chromium checks passed missing-key, font-loading/failure (system-font text and no Clerk mount), session loading, pending/current-task setup, mocked signed-in/out route selection and truthful home notices. Tests checked headings/error alerts, doubled-text scrolling at 320×568, sign-out failure/retry and busy/disabled button semantics. Screenshots were inspected. Clerk, router and font failures were mocked; a noncredential fixture marker enabled configured branches. No SMS, real key or live session was used. This temporary harness is not a committed CI suite and does not verify actual Expo Router navigation.

Physical-device safe areas, font scaling, TalkBack, native session behavior and live authentication remain unverified without an Android device and configured development identity. Offline detection, product empty-data states and synchronization await their actual data sources. Status: in review; no phase accepted. Next: verify actual protected navigation behavior with a persistent test harness, then device validation and remaining P3 components as dependencies allow.

Final `npm run bundle:android` passed (1,492 modules). This is a JavaScript/assets export, not an APK or physical-device proof. No backend code changed or backend test evidence claimed.

## 2026-11-13 — persistent protected-navigation tests

Branch `task/p3-protected-navigation-tests` stacks on `task/p3-startup-home-states` (`f08563b`). Fetch found main unchanged and the earlier stack unmerged. SDK 58 Router-testing and Jest documentation were fetched before setup. The SDK-compatible Jest/Expo preset and React Native Testing Library 14 are development dependencies; no existing locked package versions changed.

Eight committed integration tests now exercise the actual `src/app` root/screens through Expo Router's testing library. Router, Stack.Protected and route history are real; identity, token storage, font loading and native safe-area measurements are mocked. Coverage includes signed-out home deep links, signed-in entry from both routes, authentication/session-loss history updates, session loading, pending/current-task setup, and sign-out busy/duplicate/failure/retry behavior. Tests and mocks are outside app routes. `npm test` now runs both the Node suite and navigation suite; existing CI invokes it through `npm run check`. Typecheck includes the navigation fixtures. See [the suite guide](../../tests/navigation/README.md).

The eight tests passed. A temporary negative control bypassed the home guard: the signed-out deep-link test correctly failed with expected `/` versus received `/home`. The original guard was restored immediately; no production source change is part of this task. This proves the test detects a protection regression rather than relying on a mocked router. No live Clerk session or SMS was used. Device/native navigation, session persistence, TalkBack and backend authorization remain unverified without the relevant environment and physical device. Status: in review, not phase acceptance. Next: extend persistent coverage to the phone/OTP UI and startup failures; live/device checks remain blocked by missing development identity/device.

Final evidence on Node 26.13.0 after `npm ci`: `npm run check` passed lint/typecheck, 16 Node tests and eight Router tests. `npm run bundle:android` passed (1,492 modules); its Hermes filename remains `entry-1737717aec862ecf8df76d89df3ccab5.hbc`, matching the preceding task's export. This is not an APK/device or live-authentication proof. Existing CI will run the expanded check command; a hosted run has not been verified here. No backend code changed or backend tests claimed for this task.


## 2026-11-13 — persistent phone/OTP and startup tests

Branch `task/p3-auth-interaction-tests` stacks on `task/p3-protected-navigation-tests` (`31ba96e`). Fetch found main unchanged and the preceding stack unmerged; the checkout started clean. The SDK 58 index and Router-testing documentation were fetched before test changes. No runtime dependencies or production source changed.

The committed Clerk fixture now supplies controllable phone create/send/verify/finalize responses and records provider mounts. Thirteen new phone UI tests exercise the actual screen through the real Router: invalid phone input, sign-in/sign-up normalization and successful activation, pending-send disabled editing/duplicate prevention, send/verify failure and retry, pasted-code editing/incomplete-code gating, resend cooldown/reset, back-to-phone preservation, incomplete verification and finalization failure. Three startup tests verify font loading/error and missing-key states without mounting Clerk. Phone numbers/codes are fictional fixtures; no SMS, real credentials or live session are used. Fake clocks advance cooldowns without changing the production delay. See [the integration-test guide](../../tests/navigation/README.md).

`npm run check` passed lint, typecheck, 16 Node tests and 24 integration tests (40 total) under Node 26.13.0. `npm run bundle:android` passed (1,492 modules); the Hermes filename remains `entry-1737717aec862ecf8df76d89df3ccab5.hbc`. Existing CI includes these tests through the unchanged check command; a hosted run has not been verified here. No backend changes/tests are claimed. This is JavaScript integration/bundle evidence, not an APK, SMS delivery, a live session, keyboard/autofill, native focus, TalkBack or device validation.

Status: in review, not phase acceptance. Live/device checks remain blocked by missing configured development identity and physical Android device. Next independent implementation task: P4 API conventions/error model. It can proceed without product-schema, profile-visibility, recovery or production-provider decisions; those remain explicitly open.


## 2026-11-13 — HTTP error conventions and request correlation

Branch `task/p4-api-error-conventions` stacks on `task/p3-auth-interaction-tests` (`c7649de`). A fresh fetch found main unchanged and the earlier stack unmerged. Nest middleware/exception-filter documentation and installed Nest 12 adapter behavior were checked before implementation.

Global HTTP middleware/filter now provide server-generated UUID request IDs and `{statusCode, code, message, requestId}` error bodies with matching headers and no-store caching. Public messages come from a fixed allowlist rather than exception/request content. Server-error logs contain only event/ID/status/code and logging metadata. Malformed JSON before route middleware also gets an ID. Health success bodies and readiness conditions remain unchanged; readiness failures now use the new envelope. This compatibility change and remaining versioning/validation/idempotency/authentication decisions are documented in [API conventions](../03-api/api-conventions.md). No product schemas, access grants or provider choices were introduced.

Node 26.13.0: backend `npm ci` and `npm test` passed TypeScript build plus 11 loopback HTTP/health checks. Tests cover common/fallback/invalid statuses, unknown/root/wrong-method routes, caller-ID replacement, unchanged success, malformed/oversized JSON, and absence of synthetic sensitive markers in error bodies and captured error logs. Root `npm run check` passed lint/typecheck, 16 Node and 24 integration tests (40 app tests). No mobile runtime code changed; no APK/device/live-authentication result is claimed.

**Integration blocker:** `npm run test:integration:docker` was attempted against the managed local daemon. It failed before tests while extracting the PostGIS image with `failed to register layer ... no space left on device`. The daemon reports VFS storage at `/home/dockerd/.local/share/docker`; that path is inaccessible to this UID 1000 process. The workspace filesystem still reported 4.4 GB free and free inodes, so workspace free space does not establish daemon storage capacity. The test created no running containers; no unrelated images/volumes were pruned and Docker storage configuration was not changed. Real PostGIS/Redis/migration checks therefore did not run for this task; prior results are historical only.

Status: in review; no phase accepted or complete. Next independent task: machine-readable health/error API contract. Rerun Docker dependency/migration integration after managed-daemon storage is repaired. Live Clerk/device evidence and product/provider/recovery decisions remain open.


## 2026-11-13 — machine-readable health/error contract

Branch `task/p4-openapi-health-contract` stacks on `task/p4-api-error-conventions` (`799cead`). Fetch confirmed main unchanged and the preceding stack unmerged. OpenAPI 3.0.3 was used as a reversible technical convention for the implemented foundation only.

The [OpenAPI document](../03-api/openapi.json) describes only public GET liveness/readiness, strict success/error schemas, required server UUID headers and no-store errors. No product route, security scheme, deployment URL, Swagger runtime endpoint or authorization policy is introduced. Swagger Parser (external reference resolution disabled), Ajv and standard formats are development dependencies. A shared checker validates live response bodies/headers and status/ID correlation. The focused suite covers document validity, real HTTP liveness, controlled readiness success/failure, shared unknown-route errors, and negative cases for payload/header/correlation drift. The existing HTTP-error and real dependency integration suites also use the checker. All new code is test/documentation code; runtime source is unchanged.

Node 26.13.0: backend `npm test` passed TypeScript build and 16 checks. Root `npm run check` passed lint/typecheck, 16 Node and 24 integration tests (40 app tests). Focused readiness success/failure is deliberately stubbed at the service boundary; it is not PostGIS/Redis evidence. The preceding managed Docker image-extraction storage blocker remains unresolved, so the real dependency/migration suite was not rerun or claimed as passing. No device/APK/live-authentication proof is claimed. Existing CI includes the checks via backend `npm test`; a hosted run has not been verified here.

Status: in review, not phase acceptance. Next independent task: development identity-verification foundation that fails closed without trusted configuration and grants no product access. Account mapping/status, profiles, recovery, production provider/SMS, deployment and physical-device decisions/evidence remain open. Real dependency integration must be rerun after managed Docker storage is repaired.

A fresh backend `npm ci` and `npm run test:contract` also passed (five focused checks). Final lint/typecheck passed. No previously locked package versions changed; only development validator dependencies were added. The contract is checked in and tested, not exposed as a deployed service.


## 2026-11-13 — development external-identity verification foundation

Branch `task/p5-development-identity-verification` stacks on `task/p4-openapi-health-contract` (`49d131f`). Fetch found main unchanged and the earlier stack unmerged. [ADR-018](../01-architecture/architecture-decisions/ADR-018-development-identity-verification.md) records this bounded technical direction for review. Clerk remains approved for development only; no product schema or authorization policy is selected.

`IdentityModule` exports an opt-in, non-production-only `DevelopmentIdentityService` using pinned `@clerk/backend` 3.28.0 `authenticateRequest()`. It requires explicit trusted issuer/audience/authorized-party configuration and a pinned RSA public key, rejects pending/malformed/expired/wrong-signature/unsupported claims and actor tokens, and returns only immutable external provider/subject/session metadata. It accepts no cookies, refresh or handshake outcome, performs no JWKS lookup, and disables SDK telemetry. Missing/invalid configuration and production mode fail closed. It adds no public controller or global product-access guard; health remains public. No account status, membership, role or tracking-consent grant follows verification.

**SDK constraint:** installed 3.28.0 requires a backend secret even with `jwtKey`, contrary to the fetched documentation's either/or wording. Runtime configuration now explicitly requires a server-only development secret; the SDK check was not bypassed or patched. Local tests use an obvious noncredential marker plus ephemeral RSA keys/tokens in memory. No real provider secret/token was supplied or saved. See [configuration, strict token profile and limits](../authentication-backend.md). Actual native token audience/party/status compatibility and key pairing have not been verified, and the client/token template was not altered.

Node 26.13.0: fresh backend `npm ci` and `npm test` passed TypeScript build and 28 checks, including 12 new identity checks against the real SDK. Coverage includes claim/signature/time/configuration failures, pending/unknown state, key replacement, safe 401/503 HTTP presentation, disabled public liveness, and no outbound fetch or console output. Keys/tokens stay in memory. Root `npm run check` passed lint/typecheck plus 40 app tests. No existing locked package versions changed. No APK/device/live session is claimed. The previously recorded managed Docker PostGIS extraction/storage blocker is unresolved; real dependency/migration tests were not rerun or claimed as passing.

Status: in review, not phase acceptance. Live verification is blocked by absent configured development identity/keys and unconfirmed native token claims. Provider revocation and Groupify deactivation are not detected by networkless signature checks; account mapping/current-status authorization must precede any product access. Next: prepare a concrete account/profile/lifecycle contract for owner review while keeping recovery, visibility, legal-retention handling and production-provider decisions explicit. Physical Android evidence remains unavailable without a device.


## 2026-11-13 — concrete account/profile/lifecycle review contract

Branch `task/p5-account-profile-contract` stacks on `task/p5-development-identity-verification` (`3a4e1bc`). Fetch confirmed main unchanged and the prior stack unmerged; the checkout started clean. This task changes documentation only, not runtime behavior, migrations, dependencies or permissions.

The [concrete contract](../02-database/account-profile-contract.md), [ADR-019](../01-architecture/architecture-decisions/ADR-019-account-profile-lifecycle-contract.md) and separate [draft OpenAPI](../03-api/account-profile.draft.openapi.json) specify candidate account/link/profile fields and constraints, exact identity uniqueness, self-service endpoint semantics, version preconditions, idempotency/proof replay ordering, a proposed fixed 720-hour recovery clock and purge/recovery race rules. Erasure inventories explicitly distinguish shared records, media, providers and backups; account recovery/deletion cannot restart or extend detailed-location retention. The draft is marked proposed/unimplemented, and its paths are separate from the implemented health API.

Owner review items R1–R4 remain unresolved: self/inactive profile access and shape/picture policy; fresh action-bound deletion/recovery proof and lost-phone handling; exact clock/boundary/concurrency semantics; and media/shared-record/provider/legal/backup/identity-reuse handling. Proposed validation bounds are not approved product requirements. There is no new cross-user lookup, leader-editing grant, automatic login recovery, schema migration or erasure job. Publishing the draft does not accept a phase or satisfy the approved profile/deletion requirements.

Verification under Node 26.13.0: draft OpenAPI 3.0.3 validates with external references disabled, all component schemas compile with Ajv, proposed paths do not overlap the implemented contract, and changed-file Markdown link targets exist. Root `npm run check` passed lint/typecheck and 40 app tests; backend `npm test` passed build and 28 checks. These validate existing code and document structure, not implemented lifecycle behavior, SQL migrations, real recovery, media deletion or policy acceptance. Real PostGIS/Redis/migration checks remain blocked by the previously recorded managed Docker storage failure and were not rerun. Live Clerk/native token configuration and physical-device evidence remain unavailable.

Status: review draft ready; profile/recovery implementation remains unstarted pending the relevant decisions. Next: review R1–R4 before dependent P5 migrations/APIs; independent P4 module-boundary consolidation can proceed without deciding those permissions or lifecycle policies. No phase marked approved/complete.
