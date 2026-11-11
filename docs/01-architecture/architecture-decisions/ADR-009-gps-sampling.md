# ADR-009: Adaptive GPS and accuracy

**Status: Proposed.** Adaptive updates and active-ride opt-in are approved; all numeric thresholds remain open.

**Options considered:** A fixed time interval; distance-only sampling; an adaptive policy combining time, distance, movement, reported accuracy, battery and network conditions.

**Recommendation and reasoning:** Evaluate the adaptive combination and record both location quality and last-known state so consumers do not mistake stale or inaccurate points for live data. Use device tests covering motorcycle and bicycle conditions, screen-off/background operation and realistic connectivity before choosing numeric values. The connected master plan describes movement, speed, battery and network factors; exact behavior remains to be confirmed against Phase 0.

**Trade-offs and cost/operations:** More frequent/high-accuracy samples may improve route detail but increase battery, storage, radio, server and map costs; less frequent sampling can hide rapid changes. Device-reported accuracy and network conditions are imperfect. Background permissions and Android foreground-service behavior add review and operational complexity.

**Reversibility:** A policy isolated behind configuration can be adjusted, but changing cadence affects historical comparability, battery use and cost; an unapproved remote setting must not bypass consent.

**Approval required:** Sampling thresholds, accuracy filters, background-location scope, supported Android matrix, permission disclosures and validation results. Do not collect or share outside the approved active-ride boundary.

**Evidence:** [Expo SDK 58 location](https://docs.expo.dev/versions/v58.0.0/sdk/location/), [Android background location](https://developer.android.com/develop/sensors-and-location/location/background), [Android location/battery guidance](https://developer.android.com/develop/sensors-and-location/location/battery).
