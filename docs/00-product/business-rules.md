# Business rules and relationships

Each bullet below is explicitly labeled as an **Approved decision** or **Open question**. Approved rules derive from the [product requirements](product-requirements.md). The permission matrix also identifies permissions that are open. Assumptions are listed separately in [assumptions](assumptions.md).

## Community and ride relationship

- **Approved decision:** A community is permanent and can contain multiple rides.
- **Approved decision:** A ride may be immediate or scheduled and may have a route and breakpoints. A completed ride is represented in ride history.
- **Approved decision:** The role vocabulary is exactly **Leader**, **Co-leader**, and **Member**. A separate Owner role is not approved.
- **Open question:** Are community and ride leadership assigned separately? Creation, role assignment, succession, and community-to-ride membership boundaries also remain open. Separate leadership is an assumption requiring confirmation, not an established relationship.

## Active-ride location and data lifecycle

- **Approved decision:** Location sharing takes place only during an active ride. Members explicitly join the active ride and enable tracking before their location is shared.
- **Approved decision:** GPS updates adapt to movement, speed, battery, and network conditions. Enabled active-ride tracking continues in the background and with the screen off, subject to Android permissions and platform constraints. Location can be recorded locally while offline, last-known location can be displayed, and recorded data can be synchronized later.
- **Approved decision:** A locally recorded location is not proof that the server or another participant received it. Distinguish locally recorded, successfully uploaded, and remotely received states using evidence of each state.
- **Approved decision:** Detailed location history is retained for 30 days and removed after that period except where retention is legally required. Applicable obligations and enforcement remain undecided.
- **Approved decision:** On an account deletion request, the account is deactivated immediately. Recovery is available for 30 days; afterward personal data is permanently deleted subject to legal retention requirements.
- **Approved decision:** Location, SOS, authentication, and account-deletion data are sensitive. This specification does not prescribe an unapproved schema, API, or access policy.
- **Open question:** GPS thresholds, the event starting location retention, local-copy enforcement, delayed synchronization, recovery mechanics, retained-data categories, permission boundaries, and interactions with community and ride records remain undecided.

## PTT, chat, and emergency rules

- **Approved decision:** In native Groupify PTT, tap once to start speaking and tap again to stop. Speaking duration alone must not trigger an automatic timeout. A disconnected or terminated audio session can release a stale lock without interrupting healthy transmission.
- **Approved decision:** Only one PTT speaker is active at a time. All active ride members may speak; Leader and Co-leader receive priority.
- **Approved decision:** Background and locked-screen PTT is required, subject to Android validation.
- **Approved decision:** Active-ride group text chat has delivery/read status, Leader announcements, and offline queuing and synchronization where required.
- **Approved decision:** SOS is manually activated for an active ride and alerts active ride members with live or last-known location when available. Its status remains visible until resolved; a Leader or Co-leader can resolve the emergency. Emergency history is retained.
- **Approved decision:** SOS, essential communication, and basic navigation remain free under the hybrid-freemium direction.
- **Open question:** PTT interruption, queuing, and the stale-session recovery mechanism; permissions for other announcements and chat access; and emergency-history retention duration remain undecided.

## Role and permission matrix

**Approved decision:** The columns are the complete role vocabulary. A role's community-versus-ride assignment is not yet settled. ✓ means the brief explicitly grants the capability under the stated condition. **?** means no decision is recorded; it does not grant or deny access. **—** means no priority designation for that role is specified, not a fourth permission state. Rows marked with ? are **Open questions** until decided.

| Capability | Leader | Co-leader | Member | Condition / status |
| --- | --- | --- | --- | --- |
| Speak using ride PTT | ✓ | ✓ | ✓ | Approved for all active ride members; one active speaker at a time. |
| Receive PTT speaking priority | ✓ | ✓ | — | Approved for Leader and Co-leader; priority behavior is open. |
| Make a Leader announcement | ✓ | ? | ? | Leader capability approved; other roles are unspecified. |
| Resolve an emergency | ✓ | ✓ | ? | Leader and Co-leader capability approved; Member capability is unspecified. |
| Share own location | ✓ | ✓ | ✓ | Approved only during an active ride after explicit join and tracking enablement; ride-entry eligibility is open. |
| Trigger an active-ride SOS | ? | ? | ? | Manual SOS is approved; the eligible triggering roles are not specified. |
| Send or receive group chat | ? | ? | ? | Group chat is approved; exact membership and access rules are unspecified. |
| Start or end a ride | ? | ? | ? | Ride-start/end authority is unspecified. |
| Create a community, manage roles, or assign ride leadership | ? | ? | ? | Creation and assignment authority are unspecified. |
| View another rider's location or location history | ? | ? | ? | An audience and access rules have not been specified. |

This matrix is deliberately incomplete. No unmarked capability, implied hierarchy, or assumption should be treated as authorization.
