# Groupify product requirements

This is the Phase 0 product baseline supplied by the product owner, updated to record subsequent decisions. Product discovery is complete; implementation of no phase has been accepted as complete. This document describes the intended product, not the current state of the application. The owner has requested work through the roadmap on separate phase branches for review. That request does not itself select undecided providers or accept a phase.

## How to read the specification

Each item is classified as an **Approved decision**, **Assumption requiring confirmation**, **Open question**, or **Risk**. The requirements and technical directions below are approved decisions. The separate [assumptions](assumptions.md), [open decisions](open-decisions.md), and [risks](risks.md) identify everything in the other categories; an unconfirmed item is not an implementation requirement. Acceptance checks describe evidence of the approved outcome, not a claim that it already exists.

The [scope and feature matrix](product-scope.md), [business rules and permission matrix](business-rules.md), and [user journeys](user-journeys.md) expand this baseline. If an illustration, existing implementation, or older document differs from this baseline, record and resolve the conflict rather than silently changing the approved decision.

## Reconciled master-plan decisions

The owner confirmed on 2026-11-11 that Expo/React Native remains the primary application stack, superseding the older Kotlin/Compose-primary wording in the supplied master plan. Kotlin and the other retained native directions remain subject to the integration decisions in [ADR-001](../01-architecture/architecture-decisions/ADR-001-client-stack.md).

The owner also confirmed the supplied master plan's approximate **100–500-user planning population**, required background/screen-off GPS subject to Android constraints, and legally required exceptions to the 30-day detailed-location retention rule. The population is a planning input, not an approved membership or concurrency limit. A legal exception does not establish a blanket extension: the applicable obligations and enforcement remain to be determined. See [OD-22–OD-24](open-decisions.md#resolved-decisions).

The owner approved a starter permission policy: a community creator becomes its Leader; Leaders manage roles and membership; Leaders and Co-leaders manage rides and invitations; active ride participants can use chat and PTT, trigger SOS, and view each other's opted-in live location; Leaders and Co-leaders can resolve SOS. The [permission matrix](business-rules.md#role-and-permission-matrix) records these grants and leaves unaddressed permissions open.

## Approved decisions and acceptance checks

| ID | Approved decision | Acceptance check |
| --- | --- | --- |
| PR-01 | Groupify is an Android riding ecosystem initially targeting Bangladesh, with English at launch and support for motorcycle and bicycle riders. | The launch experience is in English, targets Android and supports both rider types. |
| PR-02 | Authentication uses a phone number and OTP. | A user can authenticate with a phone number and OTP; an unsuccessful verification does not establish an authenticated session. |
| PR-03 | Rider profiles have a name, profile picture and rider type, with optional vehicle information. | A profile supports those named attributes and does not require vehicle information. |
| PR-04 | Communities are permanent and may contain multiple rides. | A community can persist independently of a single ride and be associated with multiple rides. |
| PR-05 | There are exactly three roles: Leader, Co-leader and Member. There is no separate Owner role. The community creator becomes its Leader. | The role model contains those three roles and no separate Owner role; explicitly approved permissions are represented in the [permission matrix](business-rules.md#role-and-permission-matrix). |
| PR-06 | Rides may be immediate or scheduled. | Both an immediate ride and a scheduled ride are supported. |
| PR-07 | Rides have routes and breakpoints. | A ride can represent its route and breakpoints. |
| PR-08 | Location sharing occurs only during an active ride; members explicitly join that active ride and enable tracking. | Sharing is not active outside an active ride, and a rider's location is not shared without that rider explicitly joining the active ride and enabling tracking. |
| PR-09 | GPS updates adapt to movement, speed, battery, and network conditions. | The location-update behavior adapts to those conditions; exact thresholds remain an [open decision](open-decisions.md). |
| PR-10 | Location can be recorded locally while offline, a last-known location can be displayed, and recorded locations can be synchronized later. | During enabled active-ride tracking, offline locations can be recorded locally, last-known location can be shown as last known, and recorded data can later be synchronized. The interface and verification distinguish local recording, successful upload, and remote receipt using evidence of each state. |
| PR-11 | Detailed location history is retained for 30 days, subject to legally required retention. | Detailed location history is removed after its 30-day retention period except where retention is legally required. The event that starts the period, applicable obligations, and enforcement details remain open. |
| PR-12 | Groupify has native in-app walkie-talkie / push-to-talk (PTT). A tap starts speaking and another tap stops it. There is no automatic speaking-duration timeout. | On an active ride, a member who can speak taps to start speaking and taps again to stop; elapsed speaking duration alone never automatically stops the speaker. A disconnected or terminated audio session can release a stale speaking lock without interrupting a healthy transmission. |
| PR-13 | One person may be the active PTT speaker at a time. All active ride members may speak; Leader and Co-leader have speaking priority. | Simultaneous speaking attempts do not result in more than one active speaker; active ride members can speak and Leader and Co-leader receive priority. The priority and stale-session recovery mechanisms are open. |
| PR-14 | Background and locked-screen PTT is required, subject to Android validation. | PTT operation in the background and with the screen locked is demonstrated on Android; feasibility and applicable platform behavior require validation. |
| PR-15 | Active-ride group text chat includes delivery/read status, Leader announcements, and offline queuing and synchronization where required. | Active ride participants can exchange text, see delivery/read status, and synchronize queued messages; a Leader can make an announcement. Other announcement permissions and conflict handling remain open. |
| PR-16 | SOS is manual and for active rides. It alerts active ride members and attaches live or last-known location when available. A Leader or Co-leader can resolve an emergency. Emergency history is retained. | A manual SOS during an active ride alerts active ride members with live or last-known location when available; its status remains visible until resolved, a Leader or Co-leader can resolve it, and the emergency remains represented in history. |
| PR-17 | Completed ride history is available. | A completed ride can be found in ride history. |
| PR-18 | Account deletion deactivates the account immediately, permits recovery for 30 days, and then permanently deletes personal data subject to legal retention requirements. | A deletion request immediately deactivates the account; recovery is possible during the 30-day period; after that period personal data is permanently deleted except where legal retention is required. |
| PR-19 | The business-model direction is hybrid freemium. SOS, essential communication and basic navigation remain free. | These three categories are available without a paid subscription. The full free/premium feature matrix, prices and limits remain open. |
| PR-20 | The initial infrastructure planning allowance is ৳2,000–৳3,000 per month. | Planning evaluates the solution against this allowance without treating it as a confirmed bill, hard service limit, or approved provider selection. |
| PR-21 | Enabled active-ride GPS tracking continues in the background and with the screen off, subject to Android permissions and platform constraints. | The behavior is demonstrated on supported physical Android devices, including screen-off and background cases, without sharing outside an active ride or without explicit join and tracking enablement. |

## Approved technical directions

These are directions, not authorization to select unapproved components or to begin implementation:

- Android application: Expo/React Native, Android-first, with Material 3 as an approved design direction. The product owner explicitly changed the earlier requirement to use Kotlin/Jetpack Compose as the primary application stack. Kotlin 2.0+ remains the approved Kotlin direction where Android native functionality uses Kotlin; use of Compose internally by a native component is not itself prohibited.
- Application architecture and persistence: MVVM, Clean Architecture, Room, Coroutines, and Flow.
- Server and communication foundations: PostgreSQL, PostGIS, Redis, WebSockets, and Firebase Cloud Messaging.
- Mapping: the OpenStreetMap-based ecosystem.
- Audio: native in-app PTT; the transport is not selected.

Backend framework, hosting provider and architecture, OTP/SMS provider, map rendering/tile/routing/geocoding providers, PTT audio transport, the way retained Android-native directions integrate with React Native, and exact dependency versions remain unselected. Record an ADR before downstream implementation depends on an architectural choice. Candidate comparisons are not approvals. See the [approved client-stack record](../01-architecture/architecture-decisions/ADR-001-client-stack.md).

## Repository findings and conflicts

These observations concern the repository as inspected for Phase 0; they do not authorize a change of direction.

- **Approved decision — application stack:** The earlier conflict between the Expo/React Native repository and Kotlin/Compose as the primary application stack was resolved by the product owner in favor of Expo/React Native. Room, Coroutines, Flow, Material 3, and the other retained directions still need an integration approach; no root native Android source directory is present.
- **Open question — authentication selection:** [README.md](../../README.md) and the existing [authentication guide](../authentication.md) describe a Clerk phone/OTP integration, and the application imports its SDK. The brief leaves the OTP/SMS provider unselected; the existing integration does not establish approval of the final provider or of its underlying SMS delivery arrangement.
- **Risk — design interaction conflict:** [the app design reference](../../design/app-design-ref.png) says “Release to stop” on its PTT screen, conflicting with the approved tap-again-to-stop behavior. The same reference uses an “Admin” label and displays a home-screen “Nearby riders” map without establishing role or active-ride boundaries. These are design details, not permission to add a role or share location outside an active ride. Its “Cancel SOS” control also needs clarification against the approved resolution behavior.
- **Open question — design consistency:** [the app design reference](../../design/app-design-ref.png) and [the design-system reference](../../design/design-system-ref.png) depict different logo treatments and specify different typefaces. Their approval status is not established here.
- **Repository observation:** The current `src/` tree contains a phone/OTP flow and a placeholder home screen; its displayed ride and nearby-rider content is not evidence of implemented ride or location services. The repository also contains mocked authentication tests. No backend, infrastructure, product specification, architecture-decision record, or implementation-status document was found in the inspected project tree. The existing Expo starter `example/` directory is not a backend or native Android project.

Resolve remaining conflicts through the product owner and, for architectural choices, an approved ADR. Proposed choices and existing implementation do not by themselves establish a provider or permission decision.
