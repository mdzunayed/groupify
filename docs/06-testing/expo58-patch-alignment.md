# Expo SDK 58 alignment — 2026-11-14

Status: maintenance increment in review, not P2 acceptance. The SDK compatibility
check on the preceding security branch reported eleven available SDK 58 package
updates. The supported `expo install --fix --npm` installer aligned them without
changing SDK major, React Native, React, Clerk, Jest or Node.

| Installed package | Before | After |
| --- | --- | --- |
| expo | 58.0.23 | 58.0.25 |
| @expo/ui | 58.0.27 | 58.0.28 |
| expo-constants | 58.0.15 | 58.0.16 |
| expo-font | 58.0.11 | 58.0.12 |
| expo-linking | 58.0.16 | 58.0.17 |
| expo-router | 58.0.30 | 58.0.31 |
| expo-secure-store | 58.0.2 | 58.0.3 |
| expo-splash-screen | 58.0.13 | 58.0.14 |
| expo-status-bar | 58.0.4 | 58.0.5 |
| expo-symbols | 58.0.4 | 58.0.5 |
| expo-web-browser | 58.0.7 | 58.0.8 |

Constants/font's existing tilde ranges already permit their new installed patch;
the other nine ranges are aligned by the installer. The root lockfile also records
the installer's required Expo tooling/native dependencies, including
expo-modules-core/autolinking 58.1.0. Fifty existing lockfile paths change version;
these are not all patch-level transitives. The installer adds no new lockfile path,
removes getenv and changes no integrity value for an unchanged version. Prior
glob/minimatch security overrides remain intact; the backend lockfile is unchanged.

The installer adds `expo-status-bar` and `expo-web-browser` config plugins with
their defaults. This follows SDK 58's documented CNG integration; no root Android
or iOS project is generated or edited. The app remains explicitly light and no
authentication/template/location or permission flow is added. These are native
dependencies/configuration: a new development binary and physical-device checks
remain necessary before claiming native compatibility.

Under Node 26.13.0, evidence after the update:

- Fresh `npm ci --no-audit --no-fund` succeeded with normal integrity/TLS checking;
  existing deprecation/install-script policy notices were retained, not approved.
- Online `CI=1 expo install --check` reports dependencies up to date.
- Root `npm run check` passes lint/typecheck, 24 Node and 37 real Router/UI tests.
- Android JavaScript/assets export passes (1,474 modules); this is not an APK.
- `expo config --type introspect --json` resolves Android/iOS modifications in
  memory with both plugins and light configuration. No native directory appears.
- Full root audit remains nine low graph entries from the unpatched Jest deepmerge
  advisory and zero moderate/high/critical; it is not a clean audit.

An offline compatibility probe also returned up-to-date, but Expo explicitly labels
offline validation unreliable. It is not substituted for the passing online check
or added as an overstated deterministic CI gate. One export/config process lost
its terminal handle before completion could be collected; the export/introspection
command was repeated and its successful exit/output captured. No result is inferred
from an existing output file alone.

SDK 58 docs were fetched before Expo API work; status-bar/web-browser CNG and CLI
environment/config/check documentation were fetched and installed plugin behavior
reviewed for this maintenance. See [status bar](https://docs.expo.dev/versions/v58.0.0/sdk/status-bar.md),
[web browser](https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser.md) and
[Expo CLI](https://docs.expo.dev/more/expo-cli.md).

Hosted locked install/backend/database/Android-export evidence is recorded after
push. These checks do not establish provider configuration, live OTP/session,
SecureStore persistence, native browser return, TalkBack, keyboard or physical
Android behavior. Missing live development identity/HTTPS endpoint/device remain
separate blockers. The [security snapshot](dependency-security.md) records the
residual tooling advisory; no acceptance or production readiness is implied.
