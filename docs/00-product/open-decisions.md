# Open decisions

Every question in the tables is an **Open question**. None is an approved product requirement, provider selection, or permission. Research can compare candidates, but approved decisions must be recorded before downstream implementation depends on them; architectural decisions require an ADR. Resolve the repository conflicts without changing an approved technology or product direction unless the product owner explicitly authorizes the change.

## Technology and repository alignment

| ID | Open question |
| --- | --- |
| OD-02 | Which backend framework is approved? Is the modular-monolith assumption appropriate? |
| OD-03 | Which hosting provider and hosting architecture are approved, and can they satisfy the infrastructure planning allowance? |
| OD-04 | Which OTP/SMS provider and delivery arrangement are approved? How, if at all, does the existing Clerk integration fit that decision? Existing code and the [authentication guide](../authentication.md) do not establish final provider approval. |
| OD-05 | Which map rendering, tile, routing, and geocoding providers are approved, including licensing, usage limits, and cost? |
| OD-06 | Which native PTT audio transport is approved? |
| OD-07 | What exact dependency versions will be approved for the selected implementation? |
| OD-08 | How will required background and locked-screen PTT be validated and supported on Android? |

## Product and operational decisions

| ID | Open question |
| --- | --- |
| OD-09 | What are the maximum community and ride memberships? |
| OD-10 | What thresholds and conditions control adaptive GPS updates? |
| OD-11 | What are subscription prices and feature limits, and what is the final free/premium feature matrix? SOS, essential communication, and basic navigation remain free. |
| OD-12 | How are offline synchronization conflicts detected and resolved, including delayed location data? |
| OD-13 | How does PTT priority work, including interruption or queuing, and how are stale or disconnected speaking sessions recovered without an automatic speaking-duration timeout? |
| OD-14 | How are community and ride membership, leadership assignment, role changes, succession, and invitations handled? Are community and ride leadership separate? Which roles can create, start, or end a ride? |
| OD-15 | Which roles can trigger SOS, send or receive group chat, make announcements beyond the approved Leader capability, or resolve emergencies beyond the approved Leader and Co-leader capabilities? What are the access boundaries for live and historical locations? |
| OD-16 | What event starts the 30-day detailed-location retention period? How are local copies, last-known location, already recorded data, and delayed synchronization handled, including after a member leaves or a ride ends, while preserving the approved active-ride sharing boundary? |
| OD-17 | How does account recovery work, what data must be retained for legal reasons, and how do deletion and recovery affect shared community, ride, and emergency records? |
| OD-18 | What happens when a manual SOS has neither a live nor a last-known location, what is the retention duration of emergency history, and what does “Cancel SOS” in the design reference mean relative to emergency resolution? |
| OD-19 | Which design references and visual details are approved? In particular, resolve the differing logo/typeface treatments, the reference's “Admin” label, and any interpretation of “Nearby riders” that would breach the active-ride location boundary. The reference's PTT “Release to stop” conflicts with the approved tap-again interaction. |
| OD-20 | What are the approved profile details, OTP interaction parameters, and country-code defaults? Existing screen behavior does not by itself approve them. |
| OD-21 | What are the precise ride lifecycle, route/breakpoint, and basic-navigation behaviors beyond the capabilities already approved? |
| OD-22 | How should the connected master plan's approximately 100–500-user planning population be treated? It is not a confirmed concurrency, membership, or capacity target in Phase 0. |
| OD-23 | Is background/screen-off GPS, described as approved in the connected master plan but not explicit in Phase 0, part of the confirmed product baseline? |
| OD-24 | Does any legally required retention qualify the 30-day detailed-location rule? The connected master plan includes that qualification; Phase 0 does not specify it. Do not extend retention without an explicit decision. |
| OD-25 | What Expo-native boundary will retain Room, Coroutines, Flow and the Kotlin direction, and what Material 3 implementation and Android device range will be approved? |
| OD-26 | What observability, backup/restore, release, support and incident responsibilities and evidence are required for the eventual deployment? No owners or targets are assigned. |
| OD-27 | Is the prepared GitHub Actions workflow and its branch-protection use approved for the observed GitHub repository? A hosted run has not yet verified it. |

## Dependency on decisions

**Approved decision — OD-01 resolved:** The product owner selected Expo/React Native and authorized changing Kotlin/Compose as the primary application direction. Retained native directions and their integration remain subject to further decisions; see [ADR-001](../01-architecture/architecture-decisions/ADR-001-client-stack.md).

**Risk:** Unselected providers and architecture, unresolved permissions, retained-native integration, and unvalidated Android PTT can block later implementation or acceptance. No application, infrastructure, schema, or provider changes are authorized by resolving questions in this document alone.
