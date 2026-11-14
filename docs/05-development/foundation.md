# Development foundation

This document covers the authorized Phase 2 repository foundation. It does not select a backend, hosting provider, production OTP/SMS provider, database schema, or application feature. [Phase 1 decisions](../01-architecture/architecture-decisions/README.md) remain proposed unless explicitly approved.

## Repository and commands

- The application is the existing Expo/React Native project. Expo Router screens live under `src/app/`; other application code remains outside that route directory. Root `android/` and `ios/` directories are generated through Continuous Native Generation and must not be hand-edited.
- Use the checked-in `package-lock.json` and `npm ci` for a repeatable clean dependency install. Use `npx expo install` for any future package addition so Expo can resolve compatible versions; additions still need the relevant approval.
- A clean temporary install reported existing deprecation warnings for transitive `crypto-js` and the current ESLint version, plus npm notices about dependency install-script policy. Do not silently upgrade or approve scripts; investigate them when dependency versions are selected.
- `npm audit --omit=dev` in that isolated install reported six moderate dependency-graph findings and no high or critical findings. The underlying advisories concern [glob cancellation](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [minimatch denial of service](https://github.com/advisories/GHSA-g3hv-75wg-m249). npm suggested major downgrades of Expo and Clerk, not a verified compatible fix. Assess actual exposure and select compatible remediations through the dependency decision; do not run an automatic fix that changes the approved stack.
- Run `npm run check` for lint, TypeScript checking and the existing Node tests. `npm run test:auth` runs the current authentication tests alone. These tests use mocked provider resources, so a pass does not prove SMS delivery, remote configuration, or a real authenticated session.
- Run `npm run bundle:android` to export an Android JavaScript and asset bundle into the ignored `dist/` directory. This is a bundling check, not an installable Android build or evidence that the app works on a device.
- The selected development and CI runtime is Node 26.13.0, recorded in `.nvmrc`; the product owner delegated this selection for Phase 2. It is an LTS release and passed the local checks. Expo SDK 58 documents Node 22.13.x as its minimum; Node documents default TypeScript type stripping from 22.18.0 and 23.6.0 onward, which the existing tests require. Review compatible security updates before changing the pin. This is not a selection of any other dependency version.
- The repository now has an initial commit and a configured GitHub origin. A local clean clone can verify the committed snapshot; it does not prove the remote is accessible, a hosted CI run has passed, or an artifact has been released.

## Coding and review standards

- Preserve existing changes. Keep each change within its authorized phase and record architectural choices before dependent work.
- Use TypeScript's existing strict configuration, the project's Expo ESLint configuration, and `.editorconfig` for editor formatting defaults. Run lint and typecheck before declaring work complete; the editor configuration does not reformat existing files.
- Keep permission, role, schema, retention, provider and API decisions aligned with the approved product specification. Do not promote an assumption or proposed ADR to an approved requirement.
- Add focused tests for meaningful behavior and failure boundaries. For sensitive authentication, location, SOS, and deletion flows, distinguish local success from server confirmation and avoid real personal data in fixtures and output.

## Environments and secrets

- Local, development, staging and production are intended separation boundaries, not provisioned environments or a selected hosting architecture. Use distinct credentials, accounts and data when those environments are approved.
- `.env.example` lists the name of the public variable required by the existing client and contains no value. All other `.env*` files are ignored. Never commit or log a real key, OTP, token, signing credential, production data, or private provider configuration.
- Expo embeds `EXPO_PUBLIC_` values in the client bundle. Treat them as public configuration, never as a secret. Keep server credentials out of the app and obtain a suitable approved secret-management approach before deploying a backend.
- The existing code uses Clerk for development authentication, while the final OTP/SMS provider remains unselected. A local publishable key or mocked test does not validate provider country coverage or a production configuration.

## Build and CI boundaries

- On 2026-11-11, a fresh HTTPS clone of the pushed `phase/p1-architecture-research` commit `111309c` passed `npm ci --no-audit --no-fund`, `npm run check` (lint, typecheck and 15 mocked authentication tests), and `npm run bundle:android -- --max-workers 4` with Node 26.13.0. The clone had no Clerk publishable key configured and finished with no tracked or untracked changes. This verifies a clean clone and Android JavaScript export, not an installable build, live authentication, or a hosted CI run.
- Local bundling and a future installable Android build are different evidence. Native modules, background location, PTT, config-plugin changes and permissions require a compatible development build and Android device validation; Expo Go and a JavaScript bundle do not prove those capabilities.
- A separate temporary Git fixture was created from a secret-free snapshot and cloned locally. In that clone, `npm ci`, `npm run check`, `expo install --check`, and `npm run bundle:android` passed with Node 26.13.0. The fixture's test commits did not touch this repository. The exported bundle is not an APK or proof of a live OTP session.
- After the initial commit appeared, a clean local clone of commit `fa7d34b` also passed `npm ci --no-audit --no-fund`, `npm run check`, `expo install --check`, and `npm run bundle:android` with Node 26.13.0 and no private environment file. The later local CI workflow and editor configuration were not part of that committed snapshot.
- A GitHub Actions workflow has been prepared for the observed GitHub origin and is proposed for owner review in [ADR-017](../01-architecture/architecture-decisions/ADR-017-ci.md). It uses the Node pin, lockfile install, checks, and Android bundle without provider secrets. Hosted [run 43541591598](https://github.com/mdzunayed/groupify/actions/runs/43541591598) passed at exact implementation commit `7aaf58878c1c6ec6089a69a9a2ea717c214fc219` on 2026-11-14: locked installs, app lint/typecheck/tests, backend tests, real PostGIS/Redis integration and Android JavaScript bundling. This is commit-specific CI evidence, not release, phase or branch-protection acceptance.
- EAS is the project's approved build direction. Configuring a cloud project, signing, deployment environments, production credentials and release approval are separate work; no cloud resources or releases are created by this foundation document.

References: [Expo environment variables](https://docs.expo.dev/guides/environment-variables/), [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Node TypeScript support](https://nodejs.org/api/typescript.html), and [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

## Navigation test runner

`npm run test:unit` runs the existing Node authentication/contrast tests, and
`npm run test:navigation` runs the committed Jest/Expo Router integration suite.
`npm test` runs both, so the existing CI `npm run check` step includes navigation
coverage. Test fixtures are outside `src/app` and do not configure or bypass
production authentication. See [navigation test scope](../../tests/navigation/README.md)
for mocked dependencies and validation limits.
