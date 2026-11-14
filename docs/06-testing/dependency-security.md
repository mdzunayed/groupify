# Dependency security snapshot — 2026-11-14

Status: maintenance increment in review, not P2 acceptance or a complete security
review. Use Node 26.13.0 and the root lockfile. No Expo SDK major, React Native,
Clerk, Jest, backend dependency or runtime source is changed in this increment.

The initial root `npm audit --json` reported 30 affected dependency-graph entries:
29 moderate and one low, arising from three underlying advisories. These are graph
entries, not 30 distinct vulnerabilities or confirmed reachable app exploits.
The separate backend audit reported zero findings at this point in time.

| Advisory | Selected action |
| --- | --- |
| [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), affected >=9 through 14.0.1 | Range-scoped override to glob 14.0.4; keep legacy glob 7 consumers outside this advisory's range unchanged |
| [minimatch pattern amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249), affected >=7 before 11.0.1 | Range-scoped override to minimatch 11.0.5; retain legacy minimatch 3 consumers |
| [deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), affected 4.2 through 4.3.1 | Unresolved upstream: latest published 4.3.1 and no patched version listed; retained under Jest configuration, with no application import found |

The updated root audit reports nine low affected graph entries, zero moderate,
high or critical, all stemming from the remaining deepmerge advisory. It still
exits nonzero and must not be described as clean. Audit suggested major Expo,
Clerk/Jest downgrades; those were not applied. No unmaintained downgrade or local
fork conceals the residual finding. Recheck upstream Jest/deepmerge releases and
audit data before a later dependency update; trusted tooling configuration is not
proof of universal non-exploitability.

The override fixes require major transitive API replacements, so compatibility
matters beyond audit counts. Only four existing lockfile paths change version:
glob, minimatch and their brace-expansion/path-scurry dependencies. A new matcher
helper is added and redundant old nested glob trees disappear. Existing direct
package versions/ranges and the backend lockfile are unchanged. Node engine
requirements fit the pinned runtime; standard registry integrity/TLS checks and
the existing install-script policy remain enabled.

Evidence: a fresh `npm ci --no-audit --no-fund` succeeded, then root lint/typecheck,
24 Node tests, 37 real Router/UI fixture tests and Android JavaScript export
(1,494 modules) passed. A bounded temporary filesystem cancellation probe reported
one read and no post-rejection reads on both old glob 13.0.7 and selected 14.0.4;
it did not reproduce the advisory and is not claimed as exploit/fix proof. The
package choices are based on current registry/advisory data plus compatibility
checks, not fabricated reproduction results. No new mirrored dependency unit test
is added to the product suite.

`expo install --check` reports newer compatible SDK 58 patch versions for eleven
existing packages. This increment does not resolve that separate baseline
alignment; the next branch will use Expo's supported installer and repeat the
locked-install/check/export proof. Do not call the SDK check passing here. Hosted
CI for the override branch is recorded in implementation status after push.

JavaScript tests/export do not validate a native binary, live provider session,
Android device, every possible tooling API or deployment. Deprecated legacy
transitives and npm's existing blocked-script notices remain visible; no scripts
were approved and no verification was disabled. The remaining advisory is an
explicit blocker to claiming a vulnerability-free dependency tree.
