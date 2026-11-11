# ADR-017: Repository CI checks

**Status: Proposed for owner review.** The product owner authorized Phase 2 foundation work, and the existing Git repository now has a GitHub origin. A local GitHub Actions workflow has been prepared against that observed repository; it has not been activated or verified by a hosted run.

**Options considered:** GitHub Actions using GitHub-hosted runners; GitLab CI/CD; provider-neutral local checks until a CI provider is selected.

**Recommendation and reasoning:** Use GitHub Actions for this GitHub-hosted repository. Check out with read-only contents permissions and no persisted Git credentials; use the delegated Node 26.13.0 pin, install from the lockfile, run lint/typecheck/tests, and export an Android JavaScript/asset bundle. Pin official actions to verified full commit hashes. The workflow needs no API key, provider secret, release credential, cloud project or deployment step.

**Trade-offs and cost/operations:** Hosted runner minutes and availability depend on the repository's GitHub plan and settings. The bundle is not an APK and the mocked auth tests do not validate a live OTP session. The current production dependency audit reports moderate findings; the workflow does not silently downgrade dependencies or treat the audit as fixed.

**Reversibility:** Removing or replacing the workflow does not change product data. A different CI provider would need an equivalent configuration and its own runner/credential review.

**Approval required:** Owner review of the CI provider and workflow, repository permissions and branch protection before relying on a hosted status check. A committed and pushed workflow plus a real hosted run are required to verify CI; no push, release, or branch-protection change is performed by this record.

**Evidence:** [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [GitHub Actions security guidance](https://docs.github.com/en/actions/reference/security/secure-use), [setup-node](https://github.com/actions/setup-node), [Expo CLI export](https://docs.expo.dev/more/expo-cli/#exporting).
