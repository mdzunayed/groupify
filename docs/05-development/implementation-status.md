# Roadmap implementation status

This is a snapshot of evidence in the repository and current development environment, not the live [project tracker](https://docs.google.com/spreadsheets/d/1b__35uk0LqXWKjUfO9_TMHCadurFBflXbuVo4U0YQss/edit). The tracker was inaccessible when the original snapshot was prepared; Drive reads succeeded on 2026-11-13. Phase acceptance belongs to the product owner; a branch or passing check alone does not mark a phase complete.

| Phase | Repository evidence and current status |
| --- | --- |
| P0 — Product specification | **In review:** requirements, feature matrix, business rules, journeys, assumptions, risks, and open decisions are documented. The owner confirmed Expo/React Native, the planning population, background GPS, legal-retention baseline, and starter permissions. Detailed role assignment and other decisions remain open. |
| P1 — Research and architecture | **In progress:** the owner approved a NestJS modular monolith and Clerk for development; architecture and ADRs are documented. Hosting, production OTP, maps, PTT transport, and other choices remain unapproved. PTT and background-GPS physical-device proofs have not been run. |
| P2 — Development foundation | **In review:** the repository contains a locked install, checks, Android JavaScript bundle command, and a CI workflow. A fresh HTTPS clone passed the install, lint, typecheck, 15 mocked authentication tests, and Android bundling; see the [validation evidence](foundation.md#build-and-ci-boundaries). A hosted CI run and a live Clerk session have not been verified. |
| P3 — Design system and app shell | **In progress:** the owner selected the helmet-and-road identity and Inter. A vector mark, light-theme tokens, contrast check, and [design-system notes](../04-design/design-system.md) are present. App integration, components, navigation, and device accessibility validation remain open. |
| P4 — Backend foundation | **In progress:** a NestJS health service, local PostGIS/Redis configuration, migration baseline, and integration tests are present. Readiness also checks that local migrations are recorded as applied; see the [backend guide](../../backend/README.md). Product schema, identity/authorization, WebSockets, and deployment are not implemented. |
| P5 — Authentication and rider profiles | **In progress:** an existing Clerk phone/OTP client and mocked tests are present, and an [identity/profile proposal](../02-database/identity-profile-proposal.md) records the remaining design and verification work. Live authentication, backend identity, profiles, recovery, and deletion are not verified or implemented. |
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
