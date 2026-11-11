# Product scope and V1 feature matrix

## Scope

**Approved decision:** V1 is the Android riding ecosystem described in the [product requirements](product-requirements.md), initially targeting Bangladesh in English for motorcycle and bicycle riders. A permanent community can contain multiple immediate or scheduled rides. This specification does not establish that any V1 capability has been implemented or accepted.

The matrix consolidates the approved V1 scope. Each row is an **Approved decision**; the referenced requirements contain its acceptance checks. A row's inclusion does not resolve unselected providers, permissions, limits, or implementation details.

| V1 capability | Approved scope | Requirement |
| --- | --- | --- |
| Authentication | Phone-number authentication with OTP. | [PR-02](product-requirements.md#approved-decisions-and-acceptance-checks) |
| Rider profile | Name, picture, rider type, and optional vehicle information. | PR-03 |
| Communities and roles | Permanent communities with multiple rides; Leader, Co-leader, and Member only. | PR-04, PR-05 |
| Rides | Immediate and scheduled rides, routes, breakpoints, and completed ride history. | PR-06, PR-07, PR-17 |
| Active-ride location | Explicit join and tracking enablement, sharing only during an active ride, adaptive GPS, and background/screen-off tracking subject to Android constraints. | PR-08, PR-09, PR-21 |
| Offline location | Local recording while offline, last-known location display, and later synchronization; distinguish locally recorded, successfully uploaded, and remotely received states. | PR-10 |
| Location retention | Detailed location history retained for 30 days, subject to legally required retention. | PR-11 |
| Native PTT | Tap to start and tap again to stop; one active speaker, all active ride members may speak, Leader and Co-leader have priority, and stale sessions recover without an automatic speaking-duration timeout or interruption of healthy transmission. | PR-12, PR-13 |
| Background PTT | Background and locked-screen PTT, subject to Android validation. | PR-14 |
| Group communication | Active-ride text chat, delivery/read status, Leader announcements, and offline queuing and synchronization where required. | PR-15 |
| Emergency | Manual active-ride SOS alerts active ride members with live or last-known location when available; its status remains visible until resolved; a Leader or Co-leader can resolve it; emergency history is retained. | PR-16 |
| Account lifecycle | Immediate deactivation, a 30-day recovery period, and permanent deletion of personal data after that period subject to legal retention. | PR-18 |
| Business model | Hybrid freemium; SOS, essential communication, and basic navigation remain free. | PR-19 |

## Later scope

- **Approved decision:** External emergency-contact integration is later scope; it is not a V1 SOS requirement.

## Boundaries that are not yet decisions

- **Open question:** The final free/premium feature matrix, subscription pricing, and feature limits are undecided. The free guarantees in PR-19 still apply.
- **Open question:** Community and ride limits, membership eligibility, the complete role-permission model, and offline conflict handling are undecided.
- **Open question:** Provider and framework choices remain as listed in [open decisions](open-decisions.md). An existing dependency or design mockup does not make an undecided feature or provider approved.
