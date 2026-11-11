# Proposed Android feasibility validation

**Status: Proposed; not run.** The connected master plan lists PTT and background-location proof-of-concept reports as Phase 1 deliverables. This is a plan for those investigations, not a proof-of-concept report or evidence of Android support. No spike, native code, production account, cloud resource, or physical-device test was created or executed during this phase. The owner has requested work through the roadmap; execution still needs the relevant dependencies, test facilities, and provider decisions.

## Shared test conditions

Choose a device and Android-version matrix only after the owner approves the supported range. Use development builds, isolated non-production services, synthetic accounts and synthetic data. Record device model, Android version, build/dependency versions, permissions, network condition, observed behavior and actual server-side evidence without publishing secrets, rider locations or emergency contents. Test denied/revoked permissions, connectivity loss, process death, battery restrictions and app restart. Do not interpret simulator success as physical-device evidence.

## PTT feasibility protocol

1. Verify tap to start and tap again to stop, on-screen and with the screen locked, including background operation, microphone permission, foreground-service eligibility, audio focus and interruption by other audio.
2. Exercise competing speakers, priority scenarios agreed by the owner, disconnected control and media channels, reconnect, terminated audio, Redis/server restart and a partition. Verify media enforcement permits at most one speaker per ride.
3. Observe an uninterrupted healthy session without imposing a speaking-duration limit; confirm stale-session recovery is tied to failure/liveness, not elapsed speaking duration. When liveness is ambiguous, measure the availability/safety trade-off without declaring priority or recovery rules approved.
4. Capture actual media state, current authorization and recipient-side evidence; a local tap or control acknowledgement does not prove that audio was heard. Compare managed and self-hosted transport costs only from measured traffic and current provider quotes.

**Open questions:** Platform eligibility, supported devices, media provider, priority interruption, lock recovery, privacy, liveness criteria and expected user feedback.

## Background location feasibility protocol

1. Verify explicit active-ride join and tracking enablement before recording/sharing, then test foreground, background, screen-off, foreground-service and permission behavior on approved devices.
2. Exercise poor GPS, approximate/precise permission changes, no connectivity, device restart/process death, ride end and leave. Confirm no live sharing outside the active-ride boundary.
3. Verify locally recorded, server-confirmed and remotely received states separately; observe duplicate/reordered retries and the eventually approved handling for records uploaded after a ride ends.
4. Measure sampling accuracy, battery, data and storage for realistic motorcycle and bicycle scenarios before proposing numeric thresholds. Test the approved 30-day policy with controlled test clocks once the retention trigger is decided.

**Open questions:** Sampling and accuracy thresholds, retained-data handling, membership visibility and valid behavior when the offline client cannot determine the ride's current state. Background/screen-off GPS is a confirmed requirement subject to Android constraints.

## Exit evidence

Produce separate reports for PTT and location with pass/fail/blocked outcomes, unresolved Android restrictions, known device limitations, provider bills where applicable, security/privacy results and follow-up decisions. Failed or untested scenarios remain explicitly open; no result in this plan marks a product capability implemented or accepted.
