# User journeys

These journeys illustrate **Approved decisions** from the [product requirements](product-requirements.md); they are not a claim that the application already supports them. Each journey deliberately leaves role authority, provider choices, edge cases, and other unspecified steps to [open decisions](open-decisions.md). No journey establishes an additional permission or implies a successful server operation from a local action alone.

## Authenticate and identify a rider

1. A rider authenticates with a phone number and OTP. Unsuccessful verification does not establish an authenticated session. **Approved decision — PR-02.**
2. The rider profile supports a name, profile picture, and rider type; vehicle information is optional. Motorcycle and bicycle riders are supported. **Approved decision — PR-01, PR-03.**

**Open question:** The OTP/SMS provider, profile field details, and authentication edge cases remain undecided.

## Organize community rides

1. A permanent community can have multiple rides. **Approved decision — PR-04.**
2. A community's rides can be immediate or scheduled and can represent routes and breakpoints. **Approved decision — PR-06, PR-07.**
3. The role vocabulary is Leader, Co-leader, and Member. **Approved decision — PR-05.**

**Open question:** Who may create communities or rides, how roles are assigned, and whether community and ride leadership are separate are not settled. The creator becoming Leader is an [assumption requiring confirmation](assumptions.md), not a step in an approved workflow.

## Join an active ride and share location

1. A member explicitly joins an active ride and enables tracking before their location is shared. Sharing occurs only while a ride is active. **Approved decision — PR-08.**
2. GPS updates adapt to movement, speed, battery, and network conditions, using thresholds that remain undecided. Enabled tracking continues in the background and with the screen off, subject to Android constraints. **Approved decision — PR-09, PR-21.**
3. If connectivity is unavailable during enabled active-ride tracking, locations can be recorded locally; last-known location can be displayed, and recorded data can be synchronized later. Locally recorded, successfully uploaded, and remotely received are distinct outcomes. **Approved decision — PR-10.**
4. Detailed location history follows a 30-day retention period, subject to legally required retention. **Approved decision — PR-11.**

**Open question:** Ride-entry eligibility, who can see location information, the behavior on leaving a ride, retention-clock details, and synchronization conflict handling remain undecided.

## Speak with the active ride

1. An active ride member who can speak taps the native PTT control to start speaking and taps again to stop. **Approved decision — PR-12.**
2. At most one speaker is active at a time. All active ride members may speak; Leader and Co-leader receive priority. **Approved decision — PR-13.**
3. No automatic speaking-duration timeout is applied; a stale lock can be released after disconnection or audio termination without interrupting a healthy transmission. Background and locked-screen PTT are required, subject to Android validation. **Approved decision — PR-12, PR-14.**

**Open question:** Priority interruption, handling simultaneous requests, the stale-session recovery mechanism, audio transport, and the validated Android interaction are not specified.

## Communicate and respond to an emergency

1. Active-ride group text chat supports delivery/read status and offline queuing and synchronization where required; a Leader can make announcements. **Approved decision — PR-15.**
2. During an active ride, an SOS can be activated manually. It alerts active ride members and attaches live or last-known location when available. **Approved decision — PR-16.**
3. The emergency remains visible until resolved, and remains in emergency history. A Leader or Co-leader can resolve it. SOS and essential communication remain free. **Approved decision — PR-16, PR-19.**

**Open question:** Triggering eligibility, behavior when no live or last-known location is available, emergency-history retention, and other chat permissions remain undecided. External emergency-contact integration is approved for later scope, not V1.

## Review a completed ride and delete an account

1. A completed ride is available in ride history. **Approved decision — PR-17.**
2. A deletion request immediately deactivates the account. The account can be recovered during the 30-day recovery period. **Approved decision — PR-18.**
3. After that period, personal data is permanently deleted subject to legal retention requirements. **Approved decision — PR-18.**

**Open question:** The recovery process, legal-retention categories, and effects on shared ride/community records remain undecided.
